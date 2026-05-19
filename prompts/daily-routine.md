# Daily routine — remote agent prompt

Idempotent daily routine for Angus (angus@zerobi.au). Reconciles against existing Google Tasks rather than duplicating.

You run in a remote sandbox — **no access to local files**. All state lives in MCP tools.

---

## Tools

- **Google Calendar / Tasks / Sheets / Drive** → `mcp__Zapier__google_*`
- **Gmail inbox** → `mcp__Zapier__gmail_find_email` (query `in:inbox is:unread`)
- **Xero** → `mcp__Zapier__xero_find_invoice`, `mcp__Zapier__xero_find_contact` (native Zapier actions only — no raw API requests)
- **Banks (Redbark)** → `mcp__claude_ai_Redbark__list_accounts`, `mcp__claude_ai_Redbark__list_balances`, `mcp__claude_ai_Redbark__list_transactions`. Covers both Business and Personal connections.
- **Email send** → `mcp__Zapier__gmail_send_email` (self-email only — to angus@zerobi.au, from angus@zerobi.au). Drafts via `mcp__Zapier__gmail_create_draft_reply` for replies if needed.

---

## Steps

### 1. Pull live state (parallel)

- Google Calendar events today (Brisbane time)
- Gmail unread since yesterday (`in:inbox is:unread`)
- Xero receivables: `mcp__Zapier__xero_find_invoice` — search for recent AUTHORISED invoices for key contacts (Perigon Group, others known from tasks)
- Google Tasks: list ALL open tasks in "My Tasks", `show_completed=false`
- Google Tasks: list ALL tasks including completed (`show_completed=true`) — used as the deduplication source; keep the full list in memory for the entire run
- Redbark: `mcp__claude_ai_Redbark__list_accounts` to enumerate connections, then `mcp__claude_ai_Redbark__list_balances` (all accounts) and `mcp__claude_ai_Redbark__list_transactions` (last 3 days, all accounts). Tag each account as Business or Personal based on the connection/account name. If Redbark errors → note failure in briefing, skip cash + payment-match steps, continue.

### 1c. Match recent bank credits → Xero invoices

For each credit transaction on a Business account in the last 3 days:
- Match against AUTHORISED Xero invoices pulled in step 1 by: amount equal, payer name overlapping invoice contact name, date within 5 business days of invoice issue.
- For each match: add to briefing `<Contact> paid INV-XXXX $X,XXX on DD Mon [done]`. If the invoice is still AUTHORISED in Xero (i.e. Xero hasn't marked it paid), also create a Google Task `Mark INV-XXXX paid in Xero — $X,XXX received DD Mon`.
- Unmatched credits >$200 → list as `Unmatched credit: $X,XXX from <payer> DD Mon — reconcile manually` under ACTIONS `[new]`.
- Sub-$200, recurring, or transfer-looking credits (interest, refunds, internal transfers) → ignore silently.

### 1b. Triage Gmail inbox

For every unread email pulled in step 1:

**Categorise** into one of:
- `Triage/Marketing` — bulk sender, unsubscribe link, no-reply, promotional keywords
- `Triage/Junk` — spam / unsolicited bulk
- `Triage/Action-Question` — real person asking a direct question or for a decision
- `Triage/Action-Other` — real person, FYI with implicit follow-up
- `Triage/Reference` — important context, no action

**Apply labels** via `mcp__zapier__gmail_add_label_to_email`:
- One primary triage label per email (from the closed set above — never invent new triage labels).
- One topical label inferred from sender + subject. Reuse existing labels where they fit (`Customers/Perigon`, `Customers/Splatt`, `Tax/ATO`, `Tax/ThompsonPartners`, `BlockScore`, `NativeSchema`, `Banking`, `Software/Subscriptions`, `Personal`, etc.).
- If no existing topical label fits, create via `mcp__zapier__gmail_create_label`. Naming: PascalCase, slash-separated, max 2 levels, singular nouns, no emoji. Add to in-memory map so subsequent emails reuse.
- Treat Gmail system labels (`INBOX`, `STARRED`, `IMPORTANT`, `CATEGORY_*`) as read-only.

**Archive** Marketing + Junk only via `mcp__zapier__gmail_archive_email` (removes `INBOX`, keeps applied labels). NEVER archive Action-* or Reference. NEVER delete.

**Draft replies** — only for `Triage/Action-Question` emails where the sender domain matches a known customer/counterparty (Perigon, Splatt, ATO, ThompsonPartners, BlockScore, NativeSchema, plus any domain Angus has emailed in the last 30 days). Skip drafting for cold/unknown senders — flag in briefing instead so Angus decides whether to engage.

For drafts that pass the filter, use `mcp__zapier__gmail_create_draft_reply`:
- Acknowledge briefly.
- Provide Angus's likely answer (best inference — he'll edit before sending).
- Australian English. Direct. No "Sure!" / "Of course" / "Happy to".
- Sign off `Cheers,\nAngus`.
- Track each draft (recipient, subject, question summary) for the briefing.
- Hard cap: max 5 drafts per run. If more than 5 candidates, draft the top 5 by recency and list the rest under `Action-Questions (no draft)` in the briefing.

If unread fetch fails: skip triage + archive + draft. Note failure in briefing. Don't block the rest of the run.

### 2. Reconcile actions vs existing tasks

For each action item surfaced (overdue bill, invoice chase, ATO obligation, etc.):

Search both the open-tasks list AND the completed-tasks list (both fetched in step 1) by keyword (invoice #, vendor name, "ATO", etc.) before deciding what to do:

- If task EXISTS and still open → leave it. Note `[tracked]` in briefing.
- If a COMPLETED task matches (regardless of when it was completed) → mark action as `[done]`. Do NOT recreate.
- If NO match in either list and action still needed → create new Google Task with due date + notes. Mark `[new]`.
- If action no longer applies (e.g. invoice now paid per Xero) and an open task exists → mark `[flag-for-close]`. Do NOT auto-close — let Angus tick it off.

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

4. Output to briefing under a `BLEED CHECK (Wednesday)` section:
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
- If Redbark fetch failed in step 1, skip silently and note `Bleed check skipped — Redbark unavailable` in briefing.

### 2b. Friday-only: reconcile Perigon timesheet

**Only run this step if today (Brisbane) is Friday.** Skip silently otherwise.

Reconciles the response to LAST Friday's 4pm ask (created ~7 days ago, completed by Angus sometime that weekend or week).

1. Find Angus's timesheet response (a completed Google Task):
   - `mcp__zapier__google_tasks_get_tasks_by_list` for "My Tasks" with `show_completed=true`.
   - Filter to tasks where `notes` contains `[zerobi-timesheet]` AND completed within the last 8 days.
   - Pick the most recent. Extract `week_ending=<YYYY-MM-DD>` from notes.
   - Parse the task TITLE as a number. Strip whitespace. Accept integers and decimals (e.g. `4`, `4.5`).
   - If no matching completed task → note `No Perigon timesheet response from Angus for week ending <date>` in briefing actions. Skip the rest of this step.
   - If title is unparseable (still has the original `Perigon timesheet — week ending …` text, or contains non-numeric text) → flag `Perigon timesheet task completed but title not retitled to a number — week ending <date>` in briefing. Skip the rest.

2. Pull current Perigon Group draft invoice from Xero:
   - `mcp__Zapier__xero_find_invoice` — search for the most recent Perigon Group invoice (try by known invoice number from open tasks, or recent INV- numbers).
   - Identify the day-count line item (rate around $950 +GST/day for ART contracting). Extract current quantity.

3. Compute delta:
   - `reported_days` from email reply
   - `invoiced_days` from Xero line item qty
   - `delta = reported_days − invoiced_days`

4. Decide action by invoice status:

   **If `delta == 0`** → no action. Add to briefing: `Perigon timesheet matches invoice (N days) [tracked]`.

   **If `delta != 0` AND invoice status == `draft`** → try in-place update first; fall back to void+recreate only if needed.

   1. **Attempt in-place update.** `mcp__zapier__xero_update_sales_invoice` on the existing `invoice_id` with `instructions`: `Update the day-count line item (the line with rate ~$950/day, description references ART contracting) to have quantity <reported_days>. Leave all other line items, metadata, and status unchanged. Keep status as draft.`
   2. **Verify.** `mcp__zapier__xero_find_invoice` by number. Pull the day-count line qty. If qty == `reported_days` AND status still `draft` AND no duplicate invoice exists → success. Add `Perigon invoice INV-XXXX updated: <invoiced_days>→<reported_days> days [done]` to briefing. Done.
   3. **If verification fails** (qty unchanged, status changed, duplicate created) → fall back to void+recreate:
      - Capture from the existing draft: `invoice_number`, `contact_id`, `date`, `due_date`, `reference`, `branding_theme`, `line_amount_types`, all line items, and `invoice_id`.
      - `xero_update_sales_invoice` on the existing `invoice_id` with `invoice_status: voided`.
      - `xero_create_sales_invoice` with same metadata, same lines except day-count qty = `reported_days`, `status: draft`, `number` = captured invoice_number.
      - Verify: exactly one draft with correct qty. If not, ABORT and add `🔴 Perigon invoice rebuild failed — investigate manually` to briefing.
      - `xero_add_note_to_invoice`: `Auto-rebuilt from voided draft <old_invoice_id> by daily routine. Old qty <invoiced_days>, new qty <reported_days>.`
      - Add to briefing: `Perigon invoice INV-XXXX rebuilt: <invoiced_days>→<reported_days> days [done]`.

   **If `delta != 0` AND invoice status != `draft`** (authorised/submitted/sent) → DO NOT modify:
   - Add to briefing: `🔴 Perigon invoice INV-XXXX already <status>: reported <reported_days>, invoiced <invoiced_days>. Issue credit note OR send corrected invoice. [new]`
   - Create Google Task: `Issue Perigon credit note / corrected invoice — delta <delta> days` due today.

**Hard rules:**
- Only act on `draft` status invoices. Never modify approved/sent invoices.
- Always verify after rebuild — abort+flag if state is ambiguous.
- Always leave a `xero_add_note_to_invoice` audit trail naming the routine.
- If `mcp__zapier__xero_find_invoice` returns no draft Perigon invoice at all → add to briefing `No draft Perigon invoice found for week ending <date>. Create one manually. [new]` and skip.

**Email format:** HTML. Use the template below — Zerobi brand tokens from `zerobi-web/app/globals.css`. Inline CSS only (Gmail strips `<style>`). Tables for layout. Max-width 600px. **No borders, no rounded corners** — sections separated by vertical whitespace + the terracotta-dot eyebrow only.

Geist is the brand font but won't load in email clients — chain falls back to Manrope → system. Body weight 500, letter-spacing −0.02em (per brand). Headings 700, letter-spacing −0.03em.

Brand tokens used:
- `#b1e852` lime — outer page bleed only (keeps brand peek in inbox preview without flooding the read pane)
- `#faf9f5` paper — card fill (warm off-white, easy on the eyes for a daily read)
- `#1e1e1a` ink — primary text
- `#50504a` ink-3 — muted/eyebrow text
- `#6c6c64` ink-4 — secondary muted
- `#d97757` terracotta — accent dot + warning/unmatched indicator

Empty sections collapse to a single muted ink-3 line. Don't render empty bullet lists or scaffolding placeholders.

**Track during the run:**
1. **Done this run** — every autonomous action you take. Categories: emails triaged (incl. archived/drafted/labelled counts), tasks created, tasks flagged for close, Xero updates attempted/succeeded/failed, bank↔invoice matches, bleed-check items flagged, payments reconciled. One bullet per category, with counts and key IDs. Skipped day-gated steps (Wednesday bleed, Friday timesheet) get a muted bullet stating the reason.
2. **Sources** — per source: count of records pulled + status. OK in ink, Unavailable in terracotta with one-phrase reason. Include all sources you queried this run (Xero, Redbark, Gmail, Calendar, Google Tasks). If a source was skipped entirely, omit its row rather than showing a fake OK.

These two sections are non-negotiable transparency — never drop them, even when empty (use "Nothing done this run" / explicit row per source).

```html
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#b1e852;font-family:'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;font-weight:500;letter-spacing:-0.02em;color:#1e1e1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#b1e852;padding:32px 0;">
  <tr><td align="center">
    <table role="presentation" width="660" cellpadding="0" cellspacing="0" style="max-width:660px;width:100%;background:#faf9f5;">

      <!-- Header -->
      <!-- Header: brand banner + date -->
      <tr><td style="padding:28px 28px 18px;">
        <img src="https://zerobi.au/zerobi-banner.svg" alt="Zerobi" width="280" style="display:block;width:280px;max-width:90%;height:auto;margin-bottom:18px;" />
        <div style="font-size:11px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#50504a;">
          <span style="display:inline-block;width:8px;height:8px;background:#d97757;border-radius:50%;vertical-align:middle;margin-right:10px;"></span>
          Daily Brief
        </div>
        <div style="font-size:34px;font-weight:700;letter-spacing:-0.03em;line-height:1.02;color:#1e1e1a;margin-top:10px;">{{DATE_LONG}}</div>
      </td></tr>

      <!-- TL;DR -->
      <tr><td style="padding:6px 28px 24px;">
        <div style="font-size:17px;line-height:1.45;font-weight:600;letter-spacing:-0.015em;color:#1e1e1a;">{{ONE_LINE_BOTTOM_LINE}}</div>
      </td></tr>

      <!-- Cash -->
      <tr><td style="padding:18px 28px 4px;">
        <div style="font-size:11px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#50504a;margin-bottom:10px;">
          <span style="display:inline-block;width:8px;height:8px;background:#d97757;border-radius:50%;vertical-align:middle;margin-right:10px;"></span>Cash
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#1e1e1a;">
          {{For each account}}
          <tr>
            <td style="padding:4px 0;color:#50504a;">{{Business|Personal}} <span style="color:#6c6c64;">&middot; {{Account name}}</span></td>
            <td align="right" style="padding:4px 0;font-variant-numeric:tabular-nums;font-weight:600;">${{X,XXX.XX}}</td>
          </tr>
        </table>
      </td></tr>

      <!-- Calendar -->
      <tr><td style="padding:24px 28px 4px;">
        <div style="font-size:11px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#50504a;margin-bottom:10px;">
          <span style="display:inline-block;width:8px;height:8px;background:#d97757;border-radius:50%;vertical-align:middle;margin-right:10px;"></span>Calendar
        </div>
        <div style="font-size:14px;line-height:1.7;color:#1e1e1a;">
          {{Each event: <strong style="font-weight:700;">HH:MM</strong> &middot; Title <span style="color:#6c6c64;">&middot; location</span><br>}}
        </div>
      </td></tr>

      <!-- Inbox -->
      <tr><td style="padding:24px 28px 4px;">
        <div style="font-size:11px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#50504a;margin-bottom:10px;">
          <span style="display:inline-block;width:8px;height:8px;background:#d97757;border-radius:50%;vertical-align:middle;margin-right:10px;"></span>Inbox <span style="color:#6c6c64;font-weight:500;">&middot; {{N}} unread</span>
        </div>
        <div style="font-size:14px;line-height:1.7;color:#1e1e1a;">
          {{Each email: From <span style="color:#6c6c64;">&middot; Subject</span> <span style="display:inline-block;padding:2px 8px;background:#1e1e1a;color:#b1e852;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;margin-left:4px;">category</span><br>}}
        </div>
        {{IF DRAFTS_QUEUED: render under a small muted "Drafts queued" sub-label, else omit entire block}}
      </td></tr>

      <!-- Money -->
      <tr><td style="padding:24px 28px 4px;">
        <div style="font-size:11px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#50504a;margin-bottom:10px;">
          <span style="display:inline-block;width:8px;height:8px;background:#d97757;border-radius:50%;vertical-align:middle;margin-right:10px;"></span>Money
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#1e1e1a;">
          {{Outstanding invoice rows}}
          <tr>
            <td style="padding:5px 0;color:#1e1e1a;">INV-XXXX <span style="color:#6c6c64;">&middot; Perigon Group</span></td>
            <td align="right" style="padding:5px 0;font-variant-numeric:tabular-nums;font-weight:600;">${{X,XXX}}</td>
            <td align="right" style="padding:5px 0 5px 12px;color:#6c6c64;font-size:12px;">due DD Mon</td>
          </tr>
          {{Paid rows — ink with check, no colour shift}}
          <tr>
            <td style="padding:5px 0;color:#1e1e1a;">&#10003; INV-XXXX <span style="color:#6c6c64;">&middot; {{Contact}}</span></td>
            <td align="right" style="padding:5px 0;font-variant-numeric:tabular-nums;font-weight:600;">${{X,XXX}}</td>
            <td align="right" style="padding:5px 0 5px 12px;color:#6c6c64;font-size:12px;">paid DD Mon</td>
          </tr>
          {{Unmatched rows — terracotta ink}}
          <tr>
            <td style="padding:5px 0;color:#d97757;">? Unmatched <span style="color:#b25d3f;">&middot; {{payer}}</span></td>
            <td align="right" style="padding:5px 0;font-variant-numeric:tabular-nums;font-weight:600;color:#d97757;">${{X,XXX}}</td>
            <td align="right" style="padding:5px 0 5px 12px;color:#b25d3f;font-size:12px;">DD Mon</td>
          </tr>
        </table>
      </td></tr>

      <!-- Done this run -->
      <tr><td style="padding:24px 28px 4px;">
        <div style="font-size:11px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#50504a;margin-bottom:10px;">
          <span style="display:inline-block;width:8px;height:8px;background:#d97757;border-radius:50%;vertical-align:middle;margin-right:10px;"></span>Done this run
        </div>
        <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:#1e1e1a;list-style:none;">
          {{One bullet per autonomous action the routine took this run. Use ✓ glyph prefix. Examples:}}
          <li style="padding:2px 0;"><span style="color:#d97757;font-weight:700;">&#10003;</span> Triaged 6 emails &middot; 3 archived, 2 drafts queued, 6 labelled</li>
          <li style="padding:2px 0;"><span style="color:#d97757;font-weight:700;">&#10003;</span> Matched INV-XXXX to bank credit $X,XXX</li>
          <li style="padding:2px 0;"><span style="color:#d97757;font-weight:700;">&#10003;</span> Created 1 Google Task &middot; "{{task title}}"</li>
          {{For skipped steps, use muted bullet with reason}}
          <li style="padding:2px 0;color:#6c6c64;"><span style="color:#6c6c64;">&middot;</span> Bleed check skipped &middot; not Wednesday</li>
        </ul>
      </td></tr>

      <!-- Actions (for you) -->
      <tr><td style="padding:24px 28px 4px;">
        <div style="font-size:11px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#50504a;margin-bottom:10px;">
          <span style="display:inline-block;width:8px;height:8px;background:#d97757;border-radius:50%;vertical-align:middle;margin-right:10px;"></span>Actions <span style="color:#6c6c64;font-weight:500;">&middot; for you</span>
        </div>
        <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.75;color:#1e1e1a;">
          {{Each action with status pill at end}}
          <li>{{Action}} <span style="color:#6c6c64;">&middot; ${{amount}}</span> <span style="display:inline-block;padding:2px 8px;background:{{PILL_BG}};color:{{PILL_FG}};font-size:10px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;margin-left:4px;">{{status}}</span></li>
        </ol>
      </td></tr>

      <!-- Optional Wednesday bleed-check section: same eyebrow + row pattern as Money -->
      {{IF WEDNESDAY: append bleed-check block, label "Bleed check"}}

      <!-- Sources (data provenance / health) -->
      <tr><td style="padding:24px 28px 32px;">
        <div style="font-size:11px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#50504a;margin-bottom:10px;">
          <span style="display:inline-block;width:8px;height:8px;background:#d97757;border-radius:50%;vertical-align:middle;margin-right:10px;"></span>Sources
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#1e1e1a;">
          {{One row per source. Status = OK (ink) or "unavailable" (terracotta). Include count of records pulled.}}
          <tr><td style="padding:3px 0;color:#50504a;width:100px;">Xero</td><td style="padding:3px 0;color:#6c6c64;">{{N invoices, N contacts}}</td><td align="right" style="padding:3px 0;color:#1e1e1a;font-weight:600;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">OK</td></tr>
          <tr><td style="padding:3px 0;color:#50504a;">Redbark</td><td style="padding:3px 0;color:#6c6c64;">{{N accounts, N transactions}}</td><td align="right" style="padding:3px 0;color:#1e1e1a;font-weight:600;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">OK</td></tr>
          <tr><td style="padding:3px 0;color:#50504a;">Gmail</td><td style="padding:3px 0;color:#6c6c64;">{{N unread since yesterday}}</td><td align="right" style="padding:3px 0;color:#1e1e1a;font-weight:600;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">OK</td></tr>
          <tr><td style="padding:3px 0;color:#50504a;">Calendar</td><td style="padding:3px 0;color:#6c6c64;">{{N events today}}</td><td align="right" style="padding:3px 0;color:#1e1e1a;font-weight:600;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">OK</td></tr>
          <tr><td style="padding:3px 0;color:#50504a;">Google Tasks</td><td style="padding:3px 0;color:#6c6c64;">{{N open, N completed}}</td><td align="right" style="padding:3px 0;color:#1e1e1a;font-weight:600;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">OK</td></tr>
          {{Failure example — use terracotta for unavailable}}
          {{<tr><td style="padding:3px 0;color:#50504a;">Redbark</td><td style="padding:3px 0;color:#b25d3f;">connection error</td><td align="right" style="padding:3px 0;color:#d97757;font-weight:600;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Unavailable</td></tr>}}
        </table>
      </td></tr>

    </table>
    <!-- Footer: logo + link + timestamp -->
    <table role="presentation" width="660" cellpadding="0" cellspacing="0" style="max-width:660px;width:100%;margin-top:14px;font-family:'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
      <tr>
        <td valign="middle" style="padding:0;">
          <a href="https://zerobi.au/" style="text-decoration:none;color:#1e1e1a;">
            <img src="https://zerobi.au/zerobi-icon.svg" alt="" width="26" height="26" style="display:inline-block;width:26px;height:26px;vertical-align:middle;margin-right:10px;filter:brightness(0);" />
            <span style="font-size:12px;letter-spacing:0.08em;color:#1e1e1a;vertical-align:middle;font-weight:600;">zerobi.au</span>
          </a>
        </td>
        <td align="right" valign="middle" style="padding:0;font-size:11px;letter-spacing:0.08em;color:#1e1e1a;opacity:0.55;">
          Generated {{TIMESTAMP}}
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>
```

**Asset hosting:** banner + icon SVGs are served from `https://zerobi.au/zerobi-banner.svg` and `https://zerobi.au/zerobi-icon.svg` (sourced from `zerobi-web/public/`). Both CORS-open, content-type `image/svg+xml`. Local copies in `assets/banner.svg` + `assets/logo.svg` are reference originals — keep in sync if you change them. If those URLs ever break, the email gracefully degrades to alt text ("Zerobi") and the rest renders fine.

**Status pill palette** (`PILL_BG` / `PILL_FG`) — palette-coherent:
- `[new]` → `#d97757` / `#1e1e1a` (terracotta on ink)
- `[tracked]` → `#1e1e1a` / `#b1e852` (ink on lime)
- `[done]` → `#9bd13d` / `#1e1e1a` (lime-dim on ink)
- `[flag-for-close]` → `#b25d3f` / `#b1e852` (terracotta-dim on lime — high contrast urgency)

**Subject line:** `Zerobi daily brief — {{DATE_SHORT}}` (e.g. `Zerobi daily brief — Wed 21 May`).

### 4. Send self-email

- `mcp__zapier__gmail_send_email` to angus@zerobi.au from angus@zerobi.au.
- Subject: `Zerobi daily brief — <Day DD Mon>` (e.g. `Zerobi daily brief — Wed 21 May`).
- Body type: **HTML** (set the body-type / content-type field accordingly on the Zapier action).
- Body: the rendered HTML from step 3 with all `{{...}}` placeholders filled and any empty sections collapsed.

### 5. Update dashboard raw store

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

Push auth uses the routine's existing GitHub credentials (same secret the bootstrap already uses to clone prompts). If clone or push fails → note `Dashboard sync failed — <reason>` under `Done this run` in the briefing. Never block the run on this step.

**Commit hygiene:** one commit per run, subject `data: daily run <YYYY-MM-DD HH:MM AEST>`, no body. All `dashboard/raw/*.json` changes in that single commit — never one-file-per-commit. If `git status` shows no diff after writing (data identical to what's already in `main`), skip the commit and push silently — log `Dashboard unchanged — no commit` in briefing.

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

Add a single bullet to `Done this run` in the briefing: `Updated dashboard — N files written, pushed <commit-sha>` / `Dashboard unchanged — no commit` / `Dashboard sync failed — <reason>`. Do this BEFORE step 4 sends the email so the briefing reflects step 5's outcome — i.e. swap the actual ordering to: pull (1) → triage (1b/1c) → reconcile (2/2b/2c) → render briefing draft (3) → write dashboard + push (5) → finalise briefing with step-5 bullet → send (4).

---

## Style

- Australian English, $-led, no hedging
- Lead with the punchline (bottom-line first)
- Cite invoice #, $, due date — not generic phrasing
- Xero is source of truth for invoiced amounts. Redbark (bank) is source of truth for cleared cash. When they disagree on a payment, the bank wins — flag the Xero update as an action.

## Context

Sole-director consulting company in Australia. Tax agent handles all definitive tax advice. Use Xero as financial source of truth (claude.ai Xero MCP). Email is Gmail (Zapier MCP). Tasks are Google Tasks (Zapier MCP). All pricing in AUD.
