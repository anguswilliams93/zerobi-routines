# Biweekly digest → LinkedIn draft

Every fortnight, scans the last 14 days of newsletter / inbox content tagged `Triage/Reference` or `Newsletter` in Gmail, synthesises themes, drafts a short LinkedIn post for the Zerobi company page, and creates a Gmail DRAFT (to self) containing the body for Angus to copy into LinkedIn.

**Never name sources, newsletters, or authors in the post.** The post is Zerobi's voice digesting what's happening in the field. Sources are inspiration, not citations.

You run in a remote sandbox.

---

## Tools

- `mcp__zapier__gmail_find_email` — pull tagged emails from last 14 days
- `mcp__zapier__gmail_create_draft` — write LinkedIn-ready body as a Gmail draft to self
- `mcp__zapier__google_tasks_create_task` — audit/reminder task
- `mcp__zapier__google_tasks_find_task` — idempotency check

---

## Steps

### 1. Idempotency check

`mcp__zapier__google_tasks_find_task` — search "My Tasks" for any OPEN task with title containing `LinkedIn digest — fortnight ending <YYYY-MM-DD>` where `<YYYY-MM-DD>` is today (Brisbane). If one exists, exit silently.

### 2. Pull source material

`mcp__zapier__gmail_find_email` with query: `(label:Triage/Reference OR label:Newsletter) newer_than:14d`. Cap at 60 results.

For each, extract: sender domain, subject, key paragraphs. Skip auto-receipts, calendar invites, no-content marketing pings.

If you get <5 substantive items → skip the run. Create a Google Task `No LinkedIn digest this fortnight — not enough source material` due today and stop.

### 3. Synthesise

Group into **2–4 themes**. A theme is a recurring idea, debate, shift, or release showing up across **≥2 sources** — not a single hot take.

For each theme, one sentence on what's happening, one on why it matters to Zerobi's audience (Aus SMB owners, finance ops, AI-curious operators).

### 4. Draft the LinkedIn post

**Constraints:**
- 600–900 characters (LinkedIn sweet spot — not the 3000 cap).
- First line is a hook that earns the click-through to "see more". No clickbait, no "🚨", no "I just discovered…".
- Body: 2–4 themes. One short paragraph each, or clean bullet list.
- Close with one line: question to the reader, or quiet statement of what Zerobi's watching next.
- Voice: Australian English. Direct. No hedging. No "in today's fast-paced world". No emojis. No hashtags.
- **NEVER** name sources, newsletters, authors, or companies as the basis for the take. Anonymous synthesis only.
- Zerobi is the author — "we" not "I".

### 5. Create the Gmail draft

`mcp__zapier__gmail_create_draft` to angus@zerobi.au from angus@zerobi.au:
- Subject: `[LinkedIn draft] Zerobi digest — fortnight ending <YYYY-MM-DD>`
- Body:

```
Paste-ready for LinkedIn (Zerobi company page).

--- POST ---
<the post body>
--- /POST ---

Themes: <comma-separated>
Sources scanned: <N emails across N senders>
```

### 6. Create the audit task

`mcp__zapier__google_tasks_create_task`:
- task_list: `My Tasks`
- title: `LinkedIn digest — fortnight ending <YYYY-MM-DD> — review & post`
- due: today
- notes:

```
[zerobi-linkedin-draft] fortnight_ending=<YYYY-MM-DD>

Gmail draft created with subject "[LinkedIn draft] Zerobi digest — fortnight ending <YYYY-MM-DD>".

To use: open the draft, copy POST block, paste into LinkedIn (Zerobi company page), edit, publish. Tick this task complete.
```

---

## Rules

- One draft per fortnight. Idempotency check before create.
- Never name sources, newsletters, authors, or originating companies.
- Themes must span ≥2 sources — single-source takes don't qualify.
- If <5 substantive source items in the 14-day window → skip and log, don't force a weak post.
- Auto-publishing to LinkedIn is intentionally NOT wired — review gate stays manual until Angus says otherwise.
- Australian English. No emojis. No hashtags.
