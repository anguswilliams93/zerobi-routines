# Weekly timesheet ask — Friday 4pm

Sends Angus a structured self-email asking how many days he worked this week, billable to Perigon Group. Monday's daily routine reads the reply and reconciles it against the current draft invoice.

You run in a remote sandbox.

---

## Tools

- `mcp__zapier__gmail_send_email`

---

## Steps

### 1. Compute date range

- `week_ending` = today's date (Friday Brisbane)
- `week_starting` = today − 4 days (Monday Brisbane)
- Format both as `YYYY-MM-DD`

### 2. Send the ask

`mcp__zapier__gmail_send_email`:
- To: `angus@zerobi.au`
- From: `angus@zerobi.au`
- Subject: `Timesheet: week ending <YYYY-MM-DD> — how many days?`
- Body (plain text):

```
Week: <week_starting> → <week_ending>

How many days did you work for Perigon Group this week?

REPLY WITH JUST A NUMBER on the first line of your reply. Examples:
  5
  4.5
  0

Optional second line: a note (e.g. "took Thu off" or "half day Fri").

Monday's daily routine reads this thread and reconciles against the draft Perigon invoice in Xero.

— autosent by Friday timesheet routine
```

---

## Rules

- Send exactly one email per run.
- Subject must include `Timesheet: week ending <YYYY-MM-DD>` exactly — Monday's reconciliation greps on this.
- Never send if today is not a Friday in Brisbane time (cron should already enforce, but double-check via `date +%u` in bash — `5` = Friday).
- Australian English. No emojis in body.
