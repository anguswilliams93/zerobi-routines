#!/usr/bin/env python3
"""Nightly HubSpot -> ActionStep sync.

For each *new* HubSpot form submission:
  1. Look up an ActionStep contact by email.
  2. If one exists -> skip the whole submission (no matter created).
  3. Otherwise: create the contact, create a matter of the type chosen by a form
     field, link the contact to the matter, then populate the matter's NCE
     custom (data collection) fields from the rest of the form.

Idempotency (no duplicate contacts or matters):
  - A committed ``state.json`` holds a watermark (max submittedAt processed) and
    the set of processed submission IDs.
  - Only submissions newer than the watermark AND not already in the set are
    processed; a submission's ID is recorded only after it fully succeeds.

Usage:
  python sync.py            # live
  python sync.py --dry-run  # report actions, write nothing to ActionStep/state
  python sync.py --verbose  # log every MCP request/response
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

import config
from actionstep_client import ActionStepClient
from hubspot_client import Submission, fetch_submissions

STATE_PATH = Path(__file__).with_name("state.json")


# --- state ---------------------------------------------------------------

def load_state() -> dict:
    if STATE_PATH.exists():
        with STATE_PATH.open() as fh:
            data = json.load(fh)
    else:
        data = {}
    data.setdefault("watermark", 0)
    data.setdefault("processed_ids", [])
    return data


def save_state(state: dict) -> None:
    # Keep the processed list bounded; the watermark guards everything older.
    state["processed_ids"] = state["processed_ids"][-5000:]
    with STATE_PATH.open("w") as fh:
        json.dump(state, fh, indent=2)
        fh.write("\n")


# --- mapping helpers -----------------------------------------------------

def resolve_action_type(sub: Submission) -> int:
    raw = sub.get(config.MATTER_TYPE_SELECTOR_FIELD)
    if raw is None:
        raise ValueError(
            f"submission missing selector field '{config.MATTER_TYPE_SELECTOR_FIELD}'"
        )
    key = raw.strip().lower()
    for value, type_id in config.MATTER_TYPE_MAP.items():
        if value.strip().lower() == key:
            return type_id
    raise ValueError(f"no matter type mapped for selector value {raw!r}")


def build_contact_fields(sub: Submission) -> dict[str, str]:
    fields: dict[str, str] = {}
    for as_param, hs_field in config.CONTACT_FIELD_MAP.items():
        val = sub.get(hs_field)
        if val:
            fields[as_param] = val
    if "email" not in fields:
        raise ValueError("submission has no email; cannot create contact")
    return fields


def build_matter_name(sub: Submission) -> str:
    parts = [sub.get(f) for f in config.MATTER_NAME_FIELDS]
    name = " ".join(p for p in parts if p).strip()
    return name or (sub.email or "New enquiry")


def _participant_id(contact: dict) -> int | None:
    """Pull the participant id out of a create/find response shape."""
    node = contact.get("participants", contact) if isinstance(contact, dict) else {}
    if isinstance(node, list):
        node = node[0] if node else {}
    for key in ("id", "participantId", "ParticipantId"):
        if isinstance(node, dict) and node.get(key) is not None:
            return int(node[key])
    return None


def _action_id(matter: dict) -> int | None:
    node = matter.get("actions", matter) if isinstance(matter, dict) else {}
    if isinstance(node, list):
        node = node[0] if node else {}
    for key in ("id", "actionId", "ActionId"):
        if isinstance(node, dict) and node.get(key) is not None:
            return int(node[key])
    return None


def _field_name_of(value_record: dict) -> str:
    """Best-effort extraction of a data-field's name/label from a record value.

    VERIFY: the exact key carrying the field name in datacollectionrecordvalues
    (commonly under links.dataCollectionField or a 'label'/'name' attribute).
    """
    for key in ("label", "name", "fieldName", "dataCollectionFieldName"):
        if value_record.get(key):
            return str(value_record[key])
    links = value_record.get("links", {})
    for key in ("dataCollectionField", "datacollectionfield", "field"):
        if links.get(key):
            return str(links[key])
    return ""


def _field_value_id_of(value_record: dict):
    for key in ("id", "CustomFieldValueId", "customFieldValueId"):
        if value_record.get(key) is not None:
            return value_record[key]
    return None


# --- per-submission processing ------------------------------------------

async def process_submission(
    client: ActionStepClient, sub: Submission, *, verbose: bool
) -> str:
    """Returns one of: 'skipped-existing', 'created', or raises on failure."""
    email = sub.email
    if not email:
        raise ValueError("submission has no email")

    existing = await client.find_contact_by_email(email)
    if existing:
        return "skipped-existing"

    action_type_id = resolve_action_type(sub)
    nce_map = config.NCE_FIELD_MAP.get(action_type_id, {})

    # 1. contact
    contact = await client.create_individual_contact(build_contact_fields(sub))
    participant_id = _participant_id(contact)

    # 2. matter
    matter = await client.create_matter(
        action_type_id=action_type_id, action_name=build_matter_name(sub)
    )
    action_id = _action_id(matter)

    # 3. link contact -> matter
    if participant_id is not None and action_id is not None:
        await client.link_participant(
            action_id=action_id, participant_id=participant_id
        )
    elif not client.dry_run:
        raise ValueError(
            f"could not resolve participant_id/action_id "
            f"(participant={participant_id}, action={action_id})"
        )

    # 4. NCE custom fields (per matter type)
    if nce_map and action_id is not None and not client.dry_run:
        records = await client.discover_custom_field_values(action_id)
        by_name = {_field_name_of(r).strip().lower(): r for r in records}
        for hs_field, as_field_name in nce_map.items():
            value = sub.get(hs_field)
            if value is None:
                continue
            record = by_name.get(as_field_name.strip().lower())
            if record is None:
                raise ValueError(
                    f"matter {action_id}: NCE field {as_field_name!r} not found "
                    f"on matter type {action_type_id} (have: {sorted(by_name)})"
                )
            await client.update_custom_field_value(
                custom_field_value_id=_field_value_id_of(record), value=value
            )
    elif nce_map and client.dry_run:
        print(f"    [dry-run] would set {len(nce_map)} NCE field(s) on the matter")

    return "created"


# --- main ----------------------------------------------------------------

async def run(args: argparse.Namespace) -> int:
    state = load_state()
    processed = set(state["processed_ids"])
    watermark = int(state["watermark"])

    submissions = fetch_submissions()
    new = [
        s
        for s in submissions
        if s.submitted_at > watermark and s.submission_id not in processed
    ]
    print(
        f"{len(submissions)} submission(s) fetched; "
        f"{len(new)} new since watermark {watermark}"
        + (" [dry-run]" if args.dry_run else "")
    )

    created = skipped = failed = 0
    async with ActionStepClient(dry_run=args.dry_run, verbose=args.verbose) as client:
        for sub in new:
            label = f"{sub.submission_id} <{sub.email or 'no-email'}>"
            try:
                outcome = await process_submission(client, sub, verbose=args.verbose)
            except Exception as exc:  # noqa: BLE001 - one bad row mustn't sink the run
                failed += 1
                print(f"  ! {label}: FAILED -- {exc}")
                # Do NOT record it; the next run retries cleanly.
                continue

            if outcome == "skipped-existing":
                skipped += 1
                print(f"  - {label}: contact exists, skipped")
            else:
                created += 1
                print(f"  + {label}: contact + matter created")

            # Record success and advance the watermark monotonically.
            if not args.dry_run:
                processed.add(sub.submission_id)
                state["processed_ids"].append(sub.submission_id)
                if sub.submitted_at > state["watermark"]:
                    state["watermark"] = sub.submitted_at

    print(f"Done: {created} created, {skipped} skipped, {failed} failed")

    if not args.dry_run:
        save_state(state)

    # Non-zero exit if anything failed, so CI surfaces it (state still saved for
    # the successes, so failures simply retry next run).
    return 1 if failed else 0


def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dry-run", action="store_true", help="write nothing")
    p.add_argument("--verbose", action="store_true", help="log MCP traffic")
    return p.parse_args(argv)


def main() -> None:
    args = parse_args(sys.argv[1:])
    # Fail fast on obviously-unconfigured deployments.
    if config.HUBSPOT_FORM_GUID.startswith("TODO"):
        print("config.HUBSPOT_FORM_GUID is still a TODO -- nothing to do.", file=sys.stderr)
        sys.exit(0 if args.dry_run else 2)
    raise SystemExit(asyncio.run(run(args)))


if __name__ == "__main__":
    main()
