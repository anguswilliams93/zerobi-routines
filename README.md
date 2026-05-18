# zerobi-routines

Source-of-truth prompts for Anthropic remote Claude Code routines (claude.ai/code/routines).

Each `.md` file under `prompts/` is the prompt body for one routine.

## Routines

| File | Routine | Schedule |
|---|---|---|
| `prompts/daily-routine.md` | Daily morning routine + email triage | 7am AEST daily (21:00 UTC prev day) |
| `prompts/meeting-prep.md` | Per-meeting prep brief (now → tomorrow 6pm lookahead, dedupe via Sent label) | 7am + 4pm Brisbane daily |
| `prompts/weekly-timesheet-ask.md` | Friday: creates a Google Task "Perigon timesheet — week ending YYYY-MM-DD — days worked?" | 4pm Brisbane Friday |

Angus retitles the Friday task to just the number (e.g. "4") and ticks it complete. Monday's daily routine reads completed `[zerobi-timesheet]`-tagged tasks and reconciles against Perigon's draft Xero invoice.

## Update flow

1. Edit prompt here, commit, push.
2. The remote routine's bootstrap prompt clones this repo and `cat`s the relevant file — so changes take effect on next run.
