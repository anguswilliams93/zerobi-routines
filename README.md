# zerobi-routines

Source-of-truth prompts for Anthropic remote Claude Code routines (claude.ai/code/routines).

Each `.md` file under `prompts/` is the prompt body for one routine.

## Routines

| File | Routine | Schedule |
|---|---|---|
| `prompts/daily-routine.md` | Daily morning routine + email triage | 7am AEST daily (21:00 UTC prev day) |
| `prompts/meeting-prep.md` | Per-meeting prep brief (75min lookahead) | hourly during Brisbane business hours |

## Update flow

1. Edit prompt here, commit, push.
2. The remote routine's bootstrap prompt clones this repo and `cat`s the relevant file — so changes take effect on next run.
