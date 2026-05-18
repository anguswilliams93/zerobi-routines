# zerobi-routines

Source-of-truth prompts for Anthropic remote Claude Code routines (claude.ai/code/routines).

Each `.md` file under `prompts/` is the prompt body for one routine.

## Routines

| File | Routine | Schedule |
|---|---|---|
| `prompts/daily-routine.md` | Daily morning routine + email triage | 7am AEST daily (21:00 UTC prev day) |
| `prompts/meeting-prep.md` | Per-meeting prep brief (now → tomorrow 6pm lookahead, dedupe via Sent label) | 7am + 4pm Brisbane daily |
| `prompts/weekly-timesheet-ask.md` | Friday self-email asking "Days worked for Perigon this week?" | 4pm Brisbane Friday |

Monday's daily routine reads the Friday reply and reconciles against Perigon's draft Xero invoice.

## Update flow

1. Edit prompt here, commit, push.
2. The remote routine's bootstrap prompt clones this repo and `cat`s the relevant file — so changes take effect on next run.
