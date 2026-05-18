# Weekly timesheet ask — Friday 4pm

Creates a Google Task asking Angus how many days he worked this week, billable to Perigon Group. Angus retitles the task to a number and ticks complete. The following Friday's daily routine reads completed tasks tagged `[zerobi-timesheet]` and reconciles against the draft Perigon invoice.

You run in a remote sandbox.

---

## Tools

- `mcp__zapier__google_tasks_create_task`
- `mcp__zapier__google_tasks_find_task` (idempotency check)

---

## Steps

### 1. Compute date range

- `week_ending` = today if today is Friday Brisbane; otherwise next-coming Friday (lets manual test runs still create a sensibly-dated task).
- `week_starting` = `week_ending` − 4 days
- Format both as `YYYY-MM-DD`

### 2. Idempotency check

`mcp__zapier__google_tasks_find_task` — search "My Tasks" for any OPEN task with title containing `Perigon timesheet — week ending <week_ending>`. If one exists, exit silently — don't duplicate.

### 3. Create the task

`mcp__zapier__google_tasks_create_task`:
- task_list: `My Tasks`
- title: `Perigon timesheet — week ending <YYYY-MM-DD> — days worked?`
- due: `<week_ending>T17:00:00+10:00`
- notes:

```
[zerobi-timesheet] week_ending=<YYYY-MM-DD> week_starting=<YYYY-MM-DD>

How to respond:
1. Edit this task's TITLE to just the number of days you worked for Perigon this week.
   Examples: "4", "4.5", "0"
2. Tick the task complete.

The following Friday's daily routine reads completed tasks tagged [zerobi-timesheet] and updates the draft Perigon invoice in Xero accordingly.

— autocreated by Friday timesheet routine
```

---

## Rules

- One task per week. Idempotency check before create.
- The `[zerobi-timesheet]` marker in notes is load-bearing — Monday's routine greps on this. Never remove or rename.
- The `week_ending=<YYYY-MM-DD>` line in notes is the binding to a specific week. Required.
- Australian English. No emojis.
