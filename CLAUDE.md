# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Parent project guidance lives at `C:\dev\zerobi\CLAUDE.md` and covers the sibling `website/` repo and the broader two-repo split. Read it before working across both. This file covers only what's specific to `zerobi-routines`.

## Repo shape

```
routines/
├── prompts/          # one .md per remote Claude Code routine (deployed via git push to main)
├── dashboard/        # local Next.js 16 dashboard (package name: weekly-digest)
│   ├── raw/          # JSON data written by the daily routine, read by the dashboard
│   ├── lib/schema.ts # zod schemas — the contract between writer and reader
│   ├── lib/raw.ts    # validates raw/<path>.json against a schema, returns { data, stale }
│   ├── lib/queue.ts  # writes raw/actions/queue.json (dashboard-only mutation queue)
│   └── components/shadcn-studio/blocks/  # KPI cards from /kpi-dashboard-mcp skill
└── assets/           # brand SVGs (reference originals, kept in sync with website/public/)
```

The two halves are co-located on purpose. The daily routine clones this repo, writes `dashboard/raw/*.json`, commits with subject `data: daily run …`, and pushes to `main`. Angus's local checkout pulls; `force-dynamic` re-reads disk on the next page load.

## Dashboard commands

`dashboard/` uses `npm` (`package-lock.json` is the lockfile, not bun).

```bash
cd dashboard
npm install
npm run dev          # next dev --webpack, port 3000
npm run build
npm run lint
npm run typecheck    # tsc --noEmit
```

No test suite. Verification gates: typecheck → build → manual browser check. UI changes are not complete until the chart/card renders with real data in `npm run dev`.

Known pre-existing lint issues (don't fix unless asked): `components/theme-toggle.tsx:19` (setState-in-effect), `lib/queue.ts:4` (unused `z` import).

## Prompts: deploy flow

```bash
# edit prompts/*.md, commit, push — that's the deploy
git add prompts/<file>.md
git commit -m "<conventional>: <change>"
git push origin main
```

Each `prompts/*.md` file is the literal prompt body. The remote routine's bootstrap clones this repo and `cat`s the relevant file at run time, so `main` is canonical.

**MCP tool naming inside prompts** — exact prefixes, no shortcuts:
- `mcp__zapier__*` — Gmail / Calendar / Tasks / Drive / Sheets / Xero / Jira via Zapier
- `mcp__claude_ai_Redbark__*` — bank balances / transactions (covers Business + Personal connections)
- `mcp__claude_ai_Xero__*` — native Xero (cash position, P&L, top customers) — different surface from `mcp__zapier__xero_*`

Routines run in a remote sandbox with **no filesystem** — only MCP tools. Don't add steps that assume local file access.

## Writer ↔ reader contract (most error-prone area)

`prompts/daily-routine.md` step 5 writes JSON; `dashboard/lib/schema.ts` validates it. They MUST move together. If you change a schema, change the matching write step in the same PR — otherwise the dashboard renders permanently stale for that section.

Each `raw/*.json` payload has a `_meta` envelope: `{ fetched_at, source, ok, note? }`. On fetch failure, set `_meta.ok = false` and `_meta.note = "<reason>"` rather than omitting the file — `lib/raw.ts` returns `{ stale: true, reason }` which renders a placeholder card.

**File ownership** (overwriting partial data corrupts the dashboard):

| Path | Writer |
|---|---|
| `daily/calendar.json`, `daily/actions.json`, `financial/cash.json`, `financial/receivables.json`, `financial/bank-balances.json`, `meta.json` | daily routine |
| `daily/unread.json`, `daily/invoices.json`, `daily/gmail-drafts.json`, `weekly/*`, `financial/pl.json`, `financial/balance-sheet.json`, `financial/customers.json`, `financial/bank-spend.json`, `deadlines.json` | weekly scheduler (not yet implemented — currently seeded manually) |
| `actions/queue.json` | **dashboard server actions only** — the daily routine must NEVER touch this. It's the outbound queue for an external Xero/Gmail mutation processor. |

## KPI cards via /kpi-dashboard-mcp skill

New KPI cards go through the `kpi-dashboard-mcp` skill, which defines two fixed shadcn block patterns:

- **Pattern A** (line chart + summary table) — `components/shadcn-studio/blocks/chart-bank-balances.tsx`
- **Pattern B** (metrics tiles + radial pie + plan bar) — `components/shadcn-studio/blocks/chart-money-snapshot.tsx`

Both are wrapped in the bespoke `ZbCard` chrome (`components/zb-card.tsx`) to match the koji21 lime/ink/terracotta design language — do NOT use the raw shadcn `<Card>` outer; it breaks visual consistency with the rest of the dashboard.

Brand colour map for charts inside these blocks:
- Business / primary series → `var(--c-terracotta)`
- Personal / secondary series → `var(--ink)` (NOT `--c-ink-3` — too washed out on the lime surface)
- Tertiary segments → `var(--c-lime-dim)`

## Brand tokens: triple-sync

The lime/ink/terracotta palette tokens (`--c-lime`, `--c-ink`, `--c-terracotta`, `--bg`, `--surface`) exist in **three** places that must stay in sync:

1. `dashboard/app/globals.css`
2. `../website/app/globals.css` (sibling repo)
3. Inline CSS inside the HTML email template in `prompts/daily-routine.md` (Gmail strips `<style>`, so the daily-brief email hard-codes the hex values)

The email template fetches `https://zerobi.au/zerobi-banner.svg` and `https://zerobi.au/zerobi-icon.svg` — those URLs are served by the deployed `website/public/`. `assets/banner.svg` and `assets/logo.svg` here are reference originals.

## Style rules (apply to dashboard copy AND email content)

- Australian English. No "Sure!" / "Of course" / "Happy to". Sign off `Cheers,\nAngus`.
- Currency `AUD`, locale `en-AU`, dates ISO 8601 with `+10:00` (Brisbane).
- Idempotency in routines is enforced via Google Tasks lookups (`show_completed=true`) and Gmail Sent-label dedupe. Never skip those checks — duplicate tasks and re-sent emails are the primary failure mode.
