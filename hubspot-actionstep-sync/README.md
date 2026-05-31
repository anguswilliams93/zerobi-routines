# HubSpot → ActionStep nightly sync

Pulls new submissions from a HubSpot form and creates the matching client +
matter in ActionStep, then fills the matter's NCE (custom data collection)
fields from the form.

> **Note on repo location.** This routine is intended to live in the
> `form_testing` repo. It was scaffolded in `zerobi-routines` because that was
> the only repo in scope at build time — copy the `hubspot-actionstep-sync/`
> directory and the `.github/workflows/hubspot-actionstep-sync.yml` workflow
> across unchanged.

## What it does (per submission)

1. Look up an ActionStep contact by **email**.
2. **Contact already exists → skip the whole submission** (no matter created).
3. Otherwise:
   - create the individual contact,
   - create a matter of the type chosen by a form field (`MATTER_TYPE_MAP`),
   - link the contact to the matter,
   - discover that matter's NCE fields and set them from the form
     (`NCE_FIELD_MAP`, keyed per matter type).

## No duplicates

`state.json` (committed back after every run) holds:
- `watermark` — the latest `submittedAt` already processed, and
- `processed_ids` — submission IDs already handled.

Each run only processes submissions **newer than the watermark and not already
in the set**. An ID is recorded **only after the submission fully succeeds**, so
a mid-way failure is retried cleanly on the next run — never half-created twice.

## Configure

Edit `config.py` and fill every `TODO`:

| Setting | Meaning |
| --- | --- |
| `HUBSPOT_FORM_GUID` | The form to watch. |
| `ACTIONSTEP_API_BASE` | Your org's ActionStep API origin (e.g. `https://ap-southeast-2.actionstep.com`). |
| `MATTER_TYPE_SELECTOR_FIELD` | HubSpot field whose value picks the matter type. |
| `MATTER_TYPE_MAP` | selector value → ActionStep `actionTypeId`. |
| `CONTACT_FIELD_MAP` | ActionStep contact param → HubSpot field. |
| `NCE_FIELD_MAP` | per `actionTypeId`: HubSpot field → ActionStep data-field **name**. |

Field **names** (not IDs) go in `NCE_FIELD_MAP`; the script discovers each
matter's `CustomFieldValueId` at runtime, so different matter types can carry
different NCE fields without hardcoding IDs. The matter-type → NCE field
definitions come from the `form_testing` repo.

## Secrets (GitHub → Settings → Secrets and variables → Actions)

| Secret | Value |
| --- | --- |
| `ZAPIER_MCP_API_KEY` | Bearer token for the Zapier MCP endpoint (ActionStep connection). |
| `HUBSPOT_TOKEN` | HubSpot private-app token with Forms read scope. |

Never commit these. The Zapier MCP key is the `Authorization: Bearer …` token
from your Zapier MCP connection.

## Run

```bash
cd hubspot-actionstep-sync
pip install -r requirements.txt

python sync.py --dry-run   # report what would happen, write nothing
python sync.py             # live
python sync.py --verbose   # also log every MCP request/response
```

In CI it runs daily (`.github/workflows/hubspot-actionstep-sync.yml`, 14:00 UTC
≈ midnight Brisbane) and on manual dispatch (with an optional dry-run toggle).

## `VERIFY` markers

ActionStep's API docs block automated fetching, so a few REST specifics are
marked `VERIFY` in `actionstep_client.py` / `sync.py` and should be confirmed
against your live org on the first `--verbose` run:

- participant filter operator — `participants?email_eq=<email>`;
- contact ↔ matter link resource — `actionparticipants` and its payload shape;
- NCE discovery resource/filter — `datacollectionrecordvalues?action_eq=<id>`,
  and the key carrying each field's name.

A `--verbose` dry-run prints the raw responses so these are quick to confirm and
adjust if your org differs.
