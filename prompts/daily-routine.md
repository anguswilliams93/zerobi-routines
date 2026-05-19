# Daily routine — remote agent prompt

Idempotent daily routine for Angus (angus@zerobi.au). Reconciles against existing Google Tasks rather than duplicating.

You run in a remote sandbox — **no access to local files**. All state lives in MCP tools.

---

## Tools

**Prefer native MCPs over Zapier — Zapier is per-call billed, native is not. Use Zapier ONLY for actions native cannot perform.**

- **Calendar (read)** → `mcp__claude_ai_Google_Calendar__list_events` (native)
- **Gmail (read/search)** → `mcp__claude_ai_Gmail__search_threads`, `mcp__claude_ai_Gmail__get_thread`, `mcp__claude_ai_Gmail__list_labels` (native)
- **Gmail (write: label / archive / create-label)** → `mcp__claude_ai_Zapier__gmail_add_label_to_email`, `_archive_email`, `_create_label` (Zapier required — native lacks write scope)
- **Xero (read)** → `mcp__claude_ai_Xero__get_contacts_and_receivables`, `_get_cash_position` (native; one call each, covers full AR/AP/working capital and outstanding invoices)
- **Banks (Redbark)** → `mcp__claude_ai_Redbark__list_accounts`, `_list_balances`, `_list_transactions` (native; covers Business + Personal)
- **Google Tasks** → `mcp__claude_ai_Zapier__google_tasks_get_tasks_by_list`, `_create_task` (Zapier — no native equivalent)

**No email send.** The local dashboard at `routines/dashboard/raw/` is the sole output of this routine. Do not draft replies or send a daily brief.

---

## Steps

### 1. Pull live state (parallel)

Issue these calls in parallel. Native MCPs first; Zapier only where unavoidable.

- Calendar events today, Brisbane time — `mcp__claude_ai_Google_Calendar__list_events` (native)
- Gmail unread — `mcp__claude_ai_Gmail__search_threads` with query **exactly** `in:inbox is:unread` (native). **Defensive filter after fetch:** drop any returned message whose `labels` array does not contain `UNREAD`. Never broaden this query — no `in:inbox` alone, no time-window variants (`newer_than:`, `after:`), no `is:starred`. Reading an already-read email wastes Zapier tasks on the downstream label/archive calls and risks re-triaging mail Angus has already handled.
- Xero AR + cash — `mcp__claude_ai_Xero__get_contacts_and_receivables` and `mcp__claude_ai_Xero__get_cash_position` (native; two calls cover everything — no per-invoice search needed)
- Google Tasks — `mcp__claude_ai_Zapier__google_tasks_get_tasks_by_list` with `show_completed=true` ONCE. The returned list contains both open and completed; filter in-memory. **Do not make a second `show_completed=false` call — wastes a Zapier task.**
- Redbark — `list_accounts` then `list_balances` (all accounts in one batch) and `list_transactions` (last 3 days per Business connection). Tag accounts Business vs Personal by connection name. If Redbark errors → set `_meta.ok=false` on `financial/cash.json` and `financial/bank-balances.json`, skip cash + payment-match steps, continue.

### 1c. Match recent bank credits → Xero invoices (dashboard-only)

For each credit transaction on a Business account in the last 3 days:
- Match against AUTHORISED Xero invoices pulled in step 1 by: amount equal, payer name overlapping invoice contact name, date within 5 business days of invoice issue.
- Record matches in `dashboard/raw/financial/receivables.json` (the invoice will drop off Xero's AR list once Angus reconciles in Xero — no separate "watch for payment" or "mark paid" task).
- Unmatched credits >$200 → record as a `note` field on `_meta` of `financial/cash.json` (e.g. `"$X,XXX unmatched credit from <payer> on DD Mon"`). Dashboard surfaces it.
- Sub-$200, recurring, or transfer-looking credits (interest, refunds, internal transfers) → ignore silently.

**Hard rule: never create a Google Task for invoice reconciliation, payment-clearing, or mark-paid workflows.** Angus reconciles in Xero directly. The dashboard's Money section is the surface for that information.

### 1b. Triage Gmail inbox

**Scope: ONLY messages that came back from step 1's `in:inbox is:unread` search AND still carry the `UNREAD` label at processing time.** Skip every read email — never label, archive, draft, or even open them. If a thread has both read and unread messages, operate only on the unread message(s).

For every unread message pulled in step 1:

**Categorise** into one of:
- `Triage/Marketing` — bulk sender, unsubscribe link, no-reply, promotional keywords
- `Triage/Junk` — spam / unsolicited bulk
- `Triage/Action-Question` — real person asking a direct question or for a decision
- `Triage/Action-Other` — real person, FYI with implicit follow-up
- `Triage/Reference` — important context, no action

**Automated infrastructure alerts auto-archive — DO NOT create tasks.** Includes Proton (DNS / DKIM / SPF warnings), GitHub Dependabot, Cloudflare, AWS billing/status, Vercel deploy alerts, monitoring services. Apply `Triage/Reference`, archive immediately, no Google Task. Angus monitors infra noise via the dashboard counter, not via inbox-driven actions.

**Apply labels** via `mcp__zapier__gmail_add_label_to_email`:
- One primary triage label per email (from the closed set above — never invent new triage labels).
- One topical label inferred from sender + subject. Reuse existing labels where they fit (`Customers/Perigon`, `Customers/Splatt`, `Tax/ATO`, `Tax/ThompsonPartners`, `BlockScore`, `NativeSchema`, `Banking`, `Software/Subscriptions`, `Personal`, etc.).
- If no existing topical label fits, create via `mcp__zapier__gmail_create_label`. Naming: PascalCase, slash-separated, max 2 levels, singular nouns, no emoji. Add to in-memory map so subsequent emails reuse.
- Treat Gmail system labels (`INBOX`, `STARRED`, `IMPORTANT`, `CATEGORY_*`) as read-only.

**Archive** Marketing + Junk only via `mcp__zapier__gmail_archive_email` (removes `INBOX`, keeps applied labels). NEVER archive Action-* or Reference. NEVER delete.

**Draft replies** — only for `Triage/Action-Question` emails where the sender domain matches a known customer/counterparty (Perigon, Splatt, ATO, ThompsonPartners, BlockScore, NativeSchema, plus any domain Angus has emailed in the last 30 days). Skip drafting for cold/unknown senders — the draft simply doesn't exist; Angus sees the email in his inbox.

For drafts that pass the filter, use `mcp__zapier__gmail_create_draft_reply`:
- Acknowledge briefly.
- Provide Angus's likely answer (best inference — he'll edit before sending).
- Australian English. Direct. No "Sure!" / "Of course" / "Happy to".
- Sign off `Cheers,\nAngus`.
- Drafts appear in Gmail's Drafts folder; the dashboard surfaces them via `dashboard/raw/daily/gmail-drafts.json`.
- Hard cap: max 5 drafts per run. If more than 5 candidates, draft the top 5 by recency; the rest stay unread in the inbox for Angus to handle.

If unread fetch fails: skip triage + archive. Log failure to stdout. Don't block the rest of the run.

### 2. Reconcile actions vs existing tasks

For each action item surfaced (ATO obligation, statutory deadline, contractual reminder, scheduled compliance event). **NOT invoice-clearing, payment-watching, or mark-paid workflows — those are dashboard-only per step 1c.**

Search both the open-tasks list AND the completed-tasks list (both fetched in step 1) by keyword (invoice #, vendor name, "ATO", etc.) before deciding what to do:

- If task EXISTS and still open → leave it.
- If a COMPLETED task matches (regardless of when it was completed) → do NOT recreate.
- If NO match in either list and action still needed → create new Google Task with due date + notes.
- If action no longer applies (e.g. obligation now met) and an open task exists → leave it open; Angus closes it manually.

**Hard rules:**
- NEVER recreate a task that already exists open.
- NEVER recreate a task the user has already completed — check the completed list every time before calling create.

### 2c. Wednesday-only: business/personal bleed check

**Only run this step if today (Brisbane) is Wednesday.** Skip silently otherwise.

Sole-director leak detector. Scans last 7 days of bank transactions for cross-pollination between Business and Personal accounts.

1. `mcp__claude_ai_Redbark__list_transactions` last 7 days on all accounts (already pulled if step 1 cache covers it; otherwise refetch).

2. On **Business accounts**, flag debits where the merchant/description strongly suggests personal spend:
   - Groceries (Coles, Woolworths, Aldi, IGA — unless tagged as office snacks)
   - Personal subscriptions (Netflix, Spotify, Apple Music, Disney+, gym, dating apps)
   - Restaurants/cafes outside business hours or with no calendar-event match that day
   - Personal travel (consumer airline tickets without a client calendar event)

3. On **Personal accounts**, flag debits that look like business spend:
   - SaaS / dev tools (Anthropic, OpenAI, GitHub, AWS, GCP, Vercel, Cloudflare, JetBrains, Linear, Notion paid, Figma)
   - Domain / hosting providers
   - Business books, courses, conference tickets

4. Log to stdout under a `BLEED CHECK (Wednesday)` section:
   ```
   BLEED CHECK (Wednesday)
   Business → personal: <list as "DD Mon  $X  <merchant>  <suspected personal reason>">
   Personal → business: <list as "DD Mon  $X  <merchant>  <suspected business reason>">
   <or "Clean — no obvious cross-pollination this week">
   ```

5. For any flagged item > $50, create a Google Task `Bleed check: <merchant> $X on DD Mon — reimburse / recode?` due Friday. Idempotency: skip if existing open task contains the same merchant + date.

**Hard rules:**
- Flag, never auto-recode. Angus decides direction (reimburse, journal, leave).
- Be conservative — false positives waste attention. When in doubt, skip.
- If Redbark fetch failed in step 1, skip silently and log `Bleed check skipped — Redbark unavailable` to stdout.

### 2b. Friday-only: reconcile Perigon timesheet

**Only run this step if today (Brisbane) is Friday.** Skip silently otherwise.

Reconciles the response to LAST Friday's 4pm ask (created ~7 days ago, completed by Angus sometime that weekend or week).

1. Find Angus's timesheet response (a completed Google Task):
   - `mcp__zapier__google_tasks_get_tasks_by_list` for "My Tasks" with `show_completed=true`.
   - Filter to tasks where `notes` contains `[zerobi-timesheet]` AND completed within the last 8 days.
   - Pick the most recent. Extract `week_ending=<YYYY-MM-DD>` from notes.
   - Parse the task TITLE as a number. Strip whitespace. Accept integers and decimals (e.g. `4`, `4.5`).
   - If no matching completed task → log `No Perigon timesheet response from Angus for week ending <date>` to stdout. Skip the rest of this step.
   - If title is unparseable (still has the original `Perigon timesheet — week ending …` text, or contains non-numeric text) → log `Perigon timesheet task completed but title not retitled to a number — week ending <date>` to stdout. Skip the rest.

2. Pull current Perigon Group draft invoice from Xero:
   - `mcp__Zapier__xero_find_invoice` — search for the most recent Perigon Group invoice (try by known invoice number from open tasks, or recent INV- numbers).
   - Identify the day-count line item (rate around $950 +GST/day for ART contracting). Extract current quantity.

3. Compute delta:
   - `reported_days` from email reply
   - `invoiced_days` from Xero line item qty
   - `delta = reported_days − invoiced_days`

4. Decide action by invoice status:

   **If `delta == 0`** → no action. Log: `Perigon timesheet matches invoice (N days) [tracked]`.

   **If `delta != 0` AND invoice status == `draft`** → try in-place update first; fall back to void+recreate only if needed.

   1. **Attempt in-place update.** `mcp__zapier__xero_update_sales_invoice` on the existing `invoice_id` with `instructions`: `Update the day-count line item (the line with rate ~$950/day, description references ART contracting) to have quantity <reported_days>. Leave all other line items, metadata, and status unchanged. Keep status as draft.`
   2. **Verify.** `mcp__zapier__xero_find_invoice` by number. Pull the day-count line qty. If qty == `reported_days` AND status still `draft` AND no duplicate invoice exists → success. Log `Perigon invoice INV-XXXX updated: <invoiced_days>→<reported_days> days [done]` to stdout. Done.
   3. **If verification fails** (qty unchanged, status changed, duplicate created) → fall back to void+recreate:
      - Capture from the existing draft: `invoice_number`, `contact_id`, `date`, `due_date`, `reference`, `branding_theme`, `line_amount_types`, all line items, and `invoice_id`.
      - `xero_update_sales_invoice` on the existing `invoice_id` with `invoice_status: voided`.
      - `xero_create_sales_invoice` with same metadata, same lines except day-count qty = `reported_days`, `status: draft`, `number` = captured invoice_number.
      - Verify: exactly one draft with correct qty. If not, ABORT and log `🔴 Perigon invoice rebuild failed — investigate manually` to stdout.
      - `xero_add_note_to_invoice`: `Auto-rebuilt from voided draft <old_invoice_id> by daily routine. Old qty <invoiced_days>, new qty <reported_days>.`
      - Log: `Perigon invoice INV-XXXX rebuilt: <invoiced_days>→<reported_days> days [done]`.

   **If `delta != 0` AND invoice status != `draft`** (authorised/submitted/sent) → DO NOT modify:
   - Log: `🔴 Perigon invoice INV-XXXX already <status>: reported <reported_days>, invoiced <invoiced_days>. Issue credit note OR send corrected invoice. [new]`
   - Create Google Task: `Issue Perigon credit note / corrected invoice — delta <delta> days` due today.

**Hard rules:**
- Only act on `draft` status invoices. Never modify approved/sent invoices.
- Always verify after rebuild — abort+flag if state is ambiguous.
- Always leave a `xero_add_note_to_invoice` audit trail naming the routine.
- If `mcp__zapier__xero_find_invoice` returns no draft Perigon invoice at all → log `No draft Perigon invoice found for week ending <date>. Create one manually. [new]` and skip.

## Output

**Sole output: the local dashboard at `routines/dashboard/raw/`.** No HTML email, no self-send, no daily brief. The dashboard's Today / Money / Calendar / Inbox sections surface everything that previously rendered in the email.

---

### 3. Update dashboard raw store

Reuse the data already pulled — no new MCP fetches. Write JSON files into the **same** `zerobi-routines` git repo (this repo) under `dashboard/raw/`, then commit and push. The local dashboard reads `dashboard/raw/*.json` directly; a `git pull` on Angus's machine refreshes it.

**Transport: git** (same pattern this routine already uses to read its own prompts).

```bash
git clone --depth 1 https://github.com/anguswilliams93/zerobi-routines.git /tmp/repo
cd /tmp/repo
# … write the JSON files below into dashboard/raw/ …
git -c user.name="zerobi-routine" -c user.email="angus@zerobi.au" add dashboard/raw
git -c user.name="zerobi-routine" -c user.email="angus@zerobi.au" commit -m "data: daily run <YYYY-MM-DD HH:MM AEST>"
git push origin HEAD:main
```

Push auth uses the routine's existing GitHub credentials (same secret the bootstrap already uses to clone prompts). If clone or push fails → log `Dashboard sync failed — <reason>` to stdout. Never block the run.

**Commit hygiene:** one commit per run, subject `data: daily run <YYYY-MM-DD HH:MM AEST>`, no body. All `dashboard/raw/*.json` changes in that single commit — never one-file-per-commit. If `git status` shows no diff after writing (data identical to what's already in `main`), skip the commit and push silently — log `Dashboard unchanged — no commit` to stdout.

**Schema:** payloads must validate against `dashboard/lib/schema.ts` in this repo. Every file gets a `_meta` envelope `{ fetched_at, source, ok, note? }`. `fetched_at` = ISO 8601 with Brisbane offset, recorded at fetch time in step 1 (not write time).

**Files to write** (only the ones the routine has data for — skip the rest, the weekly scheduler owns them):

```
dashboard/raw/daily/calendar.json       ← step 1 Calendar events
{ "_meta": {...}, "events": [{ id, start, end?, title, attendees[], location?, link?, all_day }] }

dashboard/raw/daily/actions.json        ← every Google Task created this run (kind="task")
                                          + flagged-for-close items (kind="task", detail prefixed "FLAG: ")
                                          + drafts queued (kind="draft", title = recipient + subject)
{ "_meta": {...}, "actions": [{ kind, title, detail?, created_at }] }

dashboard/raw/financial/cash.json       ← Redbark Business balances (sum) + Xero AR/AP from step 1
{ "_meta": {...}, "cash_at_bank": <sum Business account balances>,
  "receivables": <sum AUTHORISED Xero invoices>,
  "payables": <sum DRAFT+AUTHORISED bills if pulled, else 0>,
  "working_capital": cash_at_bank + receivables − payables,
  "status": "healthy" | "tight" | "critical" }
  Status thresholds: critical if cash < 5000, tight if cash < 15000, else healthy.

dashboard/raw/financial/receivables.json ← AUTHORISED Xero invoices from step 1
{ "_meta": {...},
  "items": [{ contact, amount, due_date?, days_overdue }],
  "total": <sum amount> }
  days_overdue: 0 if not yet due, else (today − due_date) in days.

dashboard/raw/financial/bank-balances.json ← Pattern A line chart (30d series)
  Append today's closing balance to existing series. Read the existing file first; if missing, start a new series with just today.
  Targets:
    - "business" = CommBank Business Transaction Account (44f489a1-f0fb-42d5-bca2-5210ef991e3f), current balance from Redbark step 1
    - "personal" = ING Orange Everyday (d95116b3-9d59-420f-86d8-4fd86d7db274), current balance from Redbark step 1
  Steps:
    1. Read existing series (if any). Drop any entry with date == today.
    2. Append { timestamp: <today 00:00 UTC millis>, date: <YYYY-MM-DD>, business: <bal>, personal: <bal> }.
    3. Sort by timestamp ascending. Trim to last 30 entries.
    4. Recompute headline.value = business + personal (today's row).
    5. Recompute comparison vs first entry in series: value = today_total − first_total; pct = value / first_total * 100; direction = up if pct > 0.5 else down if pct < -0.5 else flat; period = "vs <N> days ago" where N = (today − first.date).
    6. Recompute summary[].current and summary[].change_30d / change_pct against the first entry per account. summary[0].color = "var(--c-terracotta)", summary[1].color = "var(--c-ink-3)". Keep account labels stable: "CommBank Business Transaction xxxx3231" and "ING Orange Everyday xxxx6206".
  Shape:
  { "_meta": {...},
    "headline": { "value": <num>, "currency": "AUD", "label": "Total cash across bank accounts" },
    "comparison": { "value": <num>, "pct": <num>, "direction": "up"|"down"|"flat", "period": "vs N days ago" },
    "series": [{ "timestamp": <millis>, "date": "YYYY-MM-DD", "business": <num>, "personal": <num> }, ...],
    "summary": [
      { "name": "Business", "account": "CommBank Business Transaction xxxx3231", "current": <num>, "change_30d": <num>, "change_pct": <num>, "color": "var(--c-terracotta)" },
      { "name": "Personal", "account": "ING Orange Everyday xxxx6206",           "current": <num>, "change_30d": <num>, "change_pct": <num>, "color": "var(--c-ink-3)" }
    ]
  }
  If Redbark is unavailable in step 1: do not touch this file (preserves last known good series). Source string: "redbark + carry-forward".

dashboard/raw/meta.json                 ← merge — preserve sources you didn't touch
{ "generated_at": <now ISO Brisbane>,
  "week": <ISO week number>,
  "fy": "FY<YY>" (Australian FY: July–June; e.g. May 2026 → FY26),
  "sources": { "<relpath>": { fetched_at, source, ok, note? }, ... } }
  Read existing meta.json first. For each file you wrote, add/overwrite its sources entry keyed by the path relative to dashboard/raw/ (e.g. "daily/calendar.json"). Leave other sources entries untouched.
  Source strings to use (match existing convention):
    daily/calendar.json        → "zapier_google_calendar_find_events"
    daily/actions.json         → "daily-routine"
    financial/cash.json        → "redbark + claude_ai_Xero__find_invoice"
    financial/receivables.json → "claude_ai_Xero__find_invoice"
    financial/bank-balances.json → "redbark + carry-forward"
  If Redbark was unavailable in step 1, still write financial/cash.json with _meta.ok = false, _meta.note = "redbark unavailable", and use 0 for fields you can't fill (status="tight" as safe default). Same pattern for any other source failure — ok=false + note, never silently lie.
```

**Skip these paths entirely** — the weekly scheduler populates them and overwriting with partial data corrupts the dashboard: `daily/unread.json`, `daily/invoices.json`, `daily/gmail-drafts.json`, `weekly/*`, `financial/pl.json`, `financial/balance-sheet.json`, `financial/customers.json`, `financial/bank-spend.json`, `deadlines.json`, `actions/queue.json` (queue is dashboard-write-only — UI mutates it via server actions; routine must never touch it).

`financial/bank-balances.json` IS daily-routine-owned (append-style writer above). Don't move it to the weekly scheduler.

**Idempotency:** every file is a full overwrite, not append. Running the routine twice in one day is safe — second run wins. The commit-skip-on-no-diff rule above keeps history clean when nothing changed.

Log a single line to stdout: `Updated dashboard — N files written, pushed <commit-sha>` / `Dashboard unchanged — no commit` / `Dashboard sync failed — <reason>`.

Final ordering: pull (1) → triage (1b/1c) → reconcile (2/2b/2c) → write dashboard + push (3). That's it — no email.

---

## Style

- Australian English, $-led, no hedging
- Lead with the punchline (bottom-line first)
- Cite invoice #, $, due date — not generic phrasing
- Xero is source of truth for invoiced amounts. Redbark (bank) is source of truth for cleared cash. When they disagree on a payment, the bank wins — flag the Xero update as an action.

## Context

Sole-director consulting company in Australia. Tax agent handles all definitive tax advice. Use Xero as financial source of truth (claude.ai Xero MCP). Email is Gmail (Zapier MCP). Tasks are Google Tasks (Zapier MCP). All pricing in AUD.
