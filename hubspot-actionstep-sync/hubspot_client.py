"""HubSpot form-submission reader (direct REST, token auth).

Wraps ``GET /form-integrations/v1/submissions/forms/{form_guid}``, paginating
through ``paging.next.after`` and normalising each submission into a flat dict.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any

import requests

import config


class HubSpotError(RuntimeError):
    """Raised when the HubSpot API returns a non-2xx response."""


@dataclass
class Submission:
    """A normalised HubSpot form submission."""

    submission_id: str
    submitted_at: int  # epoch milliseconds
    values: dict[str, str] = field(default_factory=dict)
    page_url: str | None = None

    def __repr__(self) -> str:  # log-safe: don't dump form PII
        return (
            f"Submission(id={self.submission_id!r}, "
            f"submitted_at={self.submitted_at}, fields={len(self.values)})"
        )

    def get(self, field_name: str) -> str | None:
        """Case-insensitive field lookup; returns None if absent/blank."""
        if field_name in self.values:
            v = self.values[field_name]
            return v if v not in ("", None) else None
        lowered = field_name.lower()
        for k, v in self.values.items():
            if k.lower() == lowered:
                return v if v not in ("", None) else None
        return None

    @property
    def email(self) -> str | None:
        return self.get(config.CONTACT_FIELD_MAP.get("email", "email"))


def _token() -> str:
    token = os.environ.get("HUBSPOT_TOKEN")
    if not token:
        raise HubSpotError("HUBSPOT_TOKEN is not set in the environment")
    return token


def _parse(result: dict[str, Any]) -> Submission:
    """Turn one HubSpot ``results[]`` entry into a Submission."""
    flat: dict[str, str] = {}
    for pair in result.get("values", []):
        name = pair.get("name")
        if name is None:
            continue
        flat[name] = pair.get("value", "")

    # HubSpot identifies a submission by conversionId; fall back to objectId.
    sub_id = (
        result.get("conversionId")
        or result.get("objectId")
        # Last resort: a stable composite so we never process a row twice.
        or f"{result.get('submittedAt', '')}:{flat.get('email', '')}"
    )

    return Submission(
        submission_id=str(sub_id),
        submitted_at=int(result.get("submittedAt", 0) or 0),
        values=flat,
        page_url=result.get("pageUrl"),
    )


def fetch_submissions(form_guid: str | None = None, page_size: int = 50) -> list[Submission]:
    """Fetch all submissions for a form, newest pages first (HubSpot default).

    Returns them sorted ascending by ``submitted_at`` so the caller advances its
    watermark monotonically.
    """
    guid = form_guid or config.HUBSPOT_FORM_GUID
    if not guid or guid.startswith("TODO"):
        raise HubSpotError("HUBSPOT_FORM_GUID is not configured (still a TODO)")

    url = f"{config.HUBSPOT_API_BASE}/form-integrations/v1/submissions/forms/{guid}"
    headers = {"Authorization": f"Bearer {_token()}"}
    params: dict[str, Any] = {"limit": page_size}

    out: list[Submission] = []
    after: str | None = None
    while True:
        if after:
            params["after"] = after
        resp = requests.get(url, headers=headers, params=params, timeout=30)
        if resp.status_code != 200:
            raise HubSpotError(
                f"HubSpot {resp.status_code} for form {guid}: {resp.text[:500]}"
            )
        body = resp.json()
        for r in body.get("results", []):
            out.append(_parse(r))
        after = body.get("paging", {}).get("next", {}).get("after")
        if not after:
            break

    out.sort(key=lambda s: s.submitted_at)
    return out
