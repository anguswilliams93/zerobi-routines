# Meeting prep — remote agent prompt

Hourly check during Brisbane business hours. If a calendar event with external attendees starts in the next 75 minutes, send a prep brief.

You run in a remote sandbox — no local file access.

---

## Tools

- **Google Calendar** → `mcp__zapier__google_calendar_find_events`
- **Gmail** → `mcp__zapier__gmail_find_email`
- **Drive** → `mcp__zapier__google_drive_find_a_file` (optional, for contracts/proposals)
- **Email send** → `mcp__zapier__gmail_send_email`

---

## Steps

### 1. Find the next meeting

`mcp__zapier__google_calendar_find_events`:
- start_time = now + 75 minutes (Brisbane)
- end_time = now (Brisbane)
- ordering = startTime
- expand_recurring = true

Filter the results:
- Must have at least one attendee whose email is NOT `angus@zerobi.au` (skip solo blocks)
- Must start in the next 75 minutes
- Must NOT have already had a prep email sent (check Sent label `Meeting-Prep/<event-id>` — see step 4)

If no matching event → exit silently. Do not send an email.

### 2. Gather attendee context

For each external attendee:

- `mcp__zapier__gmail_find_email` with query `from:<attendee-email> OR to:<attendee-email>`, limit 5, sorted newest first. Extract subject + date + 1-line summary.
- Note any explicit asks, open questions, or commitments from those threads.

Also pull the event's own description / location / agenda field if present.

### 3. Compose brief

```
🎯 Meeting prep — <event title>
<start time Brisbane> · <duration>

Attendees:
- <name> <email> — <role/company if inferable>

Last contact:
- <date> "<subject>" — <1-line summary>
- <date> "<subject>" — <1-line summary>

Open threads / asks:
- <thing they asked for / need an answer on>

Likely agenda:
- <inferred from event description + recent emails>

Suggested talking points:
- <3-5 bullets, specific not generic>

Risks / watch-outs:
- <e.g. unpaid invoice, overdue deliverable, prior commitment>
```

### 4. Send brief + dedupe

- `mcp__zapier__gmail_send_email` to angus@zerobi.au from angus@zerobi.au.
- Subject: `Prep: <event title> @ <HH:MM Brisbane>`
- Body: the brief.
- After send: apply label `Meeting-Prep/<event-id-or-iCal-uid>` to the sent message via `mcp__zapier__gmail_add_label_to_email`. This is the dedupe signal — next hourly run skips events that already have a `Meeting-Prep/<id>` label in Sent.

Create the dedupe label via `mcp__zapier__gmail_create_label` if it doesn't exist.

---

## Rules

- One brief per meeting, ever. Dedupe via Sent label.
- Skip purely-internal meetings (only angus@zerobi.au) — those are focus blocks, not meetings.
- Skip events with no attendees at all (calendar holds).
- Skip recurring events that have already been prepped in their series — match on individual event UID, not series UID.
- Australian English, $-led where relevant, no hedging.
- If gmail/calendar fetch fails: log the failure, do not send a half-baked brief. Try again next hour.

## Context

Sole-director consulting in Australia. Largest customer relationships are sensitive — always note unpaid invoices or overdue items if Xero data is relevant (but don't pull Xero by default — only if the attendee's domain matches a known customer and the meeting title hints at billing/commercial).
