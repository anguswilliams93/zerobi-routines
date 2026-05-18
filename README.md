# zerobi-routines

Source-of-truth prompts for Anthropic remote Claude Code routines (claude.ai/code/routines).

Each `.md` file under `prompts/` is the prompt body for one routine.

## Routines

| File | Routine | Schedule |
|---|---|---|
| `prompts/daily-routine.md` | Daily morning routine + email triage + Redbark cash position + bank-to-Xero payment match. Wednesday: business/personal bleed check. Friday: Perigon timesheet reconcile. | 7am AEST daily (21:00 UTC prev day) |
| `prompts/meeting-prep.md` | Per-meeting prep brief (now → tomorrow 6pm lookahead, dedupe via Sent label) | 7am + 4pm Brisbane daily |
| `prompts/weekly-timesheet-ask.md` | Friday: creates a Google Task "Perigon timesheet — week ending YYYY-MM-DD — days worked?" | 4pm Brisbane Friday |
| `prompts/biweekly-digest.md` | Reads last 14 days of Gmail emails labelled `Triage/Reference` or `Newsletter`, synthesises 2–4 themes, drafts a short Zerobi LinkedIn post as a Gmail draft + audit task. Sources never named. Manual publish. | 9am Brisbane every other Monday |

Angus retitles the Friday task to just the number (e.g. "4") and ticks it complete. The following Friday's daily routine reads completed `[zerobi-timesheet]`-tagged tasks and reconciles against Perigon's draft Xero invoice.

## Update flow

1. Edit prompt here, commit, push.
2. The remote routine's bootstrap prompt clones this repo and `cat`s the relevant file — so changes take effect on next run.
