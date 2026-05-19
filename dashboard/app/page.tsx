import { readRaw } from "@/lib/raw";
import { readQueue } from "@/lib/queue";
import {
  RawMeta,
  DailyCalendar, DailyUnread, DailyInvoices, DailyActions,
  WeeklyCalendar, WeeklyInbox, WeeklyJira,
  ProfitLoss, BalanceSheet as BSchema, Cash, Customers, Receivables as RSchema, BankSpend,
  BankBalances,
  Deadlines, GmailDrafts as GDSchema,
  type MoneySnapshot,
} from "@/lib/schema";
import { AUDk } from "@/lib/format";

import { PageHeader } from "@/components/page-header";
import { SideNav } from "@/components/side-nav";
import { SectionHead } from "@/components/section-head";
import { KpiStrip } from "@/components/kpi-strip";

import { Agenda } from "@/components/daily/agenda";
import { Unread } from "@/components/daily/unread";
import { Invoices } from "@/components/daily/invoices";
import { Actions } from "@/components/daily/actions";
import { GmailDraftsPanel } from "@/components/daily/gmail-drafts";

import { RevenueBars } from "@/components/financial/revenue-bars";
import { PsiPanel } from "@/components/financial/psi-panel";
import { TopExpenses } from "@/components/financial/top-expenses";
import { BalanceSheet } from "@/components/financial/balance-sheet";
import { TaxObligations } from "@/components/financial/tax-obligations";
import { BlockscoreLedger } from "@/components/financial/blockscore-ledger";
import { Receivables } from "@/components/financial/receivables";
import { WorkingCapital } from "@/components/financial/working-capital";
import { BankSpend as BankSpendPanel } from "@/components/financial/bank-spend";
import { CashMovement } from "@/components/financial/cash-movement";

import { WeekCalendar } from "@/components/schedule/week-calendar";
import { InboxPulse } from "@/components/schedule/inbox-pulse";
import { JiraTasks } from "@/components/schedule/jira-tasks";

import { DeadlineGrid } from "@/components/deadlines/deadline-grid";

import { MoneySnapshotCard } from "@/components/shadcn-studio/blocks/chart-money-snapshot";
import { BankBalancesCard } from "@/components/shadcn-studio/blocks/chart-bank-balances";

export const dynamic = "force-dynamic";

function buildMoneySnapshot(
  pl: ReturnType<typeof readRaw<typeof ProfitLoss>>,
  cash: ReturnType<typeof readRaw<typeof Cash>>,
  bankSpend: ReturnType<typeof readRaw<typeof BankSpend>>,
): MoneySnapshot | null {
  if (pl.stale || cash.stale) return null;
  const ar = cash.data.receivables;
  const ap = cash.data.payables;
  const c = cash.data.cash_at_bank;
  const wc = cash.data.working_capital;
  const net30in = bankSpend.stale ? 0 : bankSpend.data.total_in;
  const net30out = bankSpend.stale ? 0 : bankSpend.data.total_out;
  return {
    headline: { value: c, currency: "AUD", label: "Cash at bank" },
    comparison: {
      value: pl.data.net_profit_ytd,
      pct: pl.data.net_margin_pct,
      direction: pl.data.net_margin_pct >= 12 ? "up" : pl.data.net_margin_pct >= 0 ? "flat" : "down",
      period: `${pl.data.period} margin`,
    },
    tiles: [
      { title: "YTD Revenue",    value: AUDk(pl.data.revenue_ytd),  icon: "trend" },
      { title: "YTD Net Profit", value: AUDk(pl.data.net_profit_ytd), icon: "dollar" },
      { title: "Receivables",    value: AUDk(ar),                   icon: "discount" },
      { title: "Payables",       value: AUDk(ap),                   icon: "orders" },
    ],
    ring: [
      { name: "Cash",        value: Math.max(c, 0),  color: "var(--c-lime-dim)" },
      { name: "Receivables", value: Math.max(ar, 0), color: "var(--c-terracotta)" },
      { name: "Payables",    value: Math.max(ap, 0), color: "var(--ink-3)" },
    ],
    progress: {
      label: "Net margin",
      pct: Math.max(0, Math.min(100, pl.data.net_margin_pct)),
      caption: `Working capital ${AUDk(wc)} · last 90d net ${AUDk(net30in - net30out)}`,
    },
  };
}

export default function Page() {
  const meta            = readRaw("meta.json", RawMeta);
  const cal             = readRaw("daily/calendar.json", DailyCalendar);
  const unread          = readRaw("daily/unread.json", DailyUnread);
  const invoices        = readRaw("daily/invoices.json", DailyInvoices);
  const actions         = readRaw("daily/actions.json", DailyActions);
  const gmailDrafts     = readRaw("daily/gmail-drafts.json", GDSchema);
  const queue           = readQueue();

  const weekCal         = readRaw("weekly/calendar.json", WeeklyCalendar);
  const weekInbox       = readRaw("weekly/inbox.json", WeeklyInbox);
  const jira            = readRaw("weekly/jira.json", WeeklyJira);

  const pl              = readRaw("financial/pl.json", ProfitLoss);
  const bs              = readRaw("financial/balance-sheet.json", BSchema);
  const cash            = readRaw("financial/cash.json", Cash);
  const customers       = readRaw("financial/customers.json", Customers);
  const receivables     = readRaw("financial/receivables.json", RSchema);
  const bankSpend       = readRaw("financial/bank-spend.json", BankSpend);
  const bankBalances    = readRaw("financial/bank-balances.json", BankBalances);

  const deadlines       = readRaw("deadlines.json", Deadlines);

  const moneySnapshot = buildMoneySnapshot(pl, cash, bankSpend);

  const today = new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="app">
      <SideNav live={!meta.stale} />

      <main>
        <PageHeader generatedAt={!meta.stale ? meta.data.generated_at : undefined} />

        {/* ── 00 · TODAY ── */}
        <section id="today" className="sec" data-i="0">
          <SectionHead
            title="Today"
            note={today}
          />
          <div className="row split">
            <Agenda res={cal} />
            <Unread res={unread} />
          </div>
        </section>

        {/* ── 01 · CALENDAR (Zapier · Google Calendar) ── */}
        <section id="calendar" className="sec" data-i="1">
          <SectionHead
            source="Google Calendar · Zapier"
            title="This week"
            note="Seven days of meetings and focus blocks."
          />
          <div className="row">
            <WeekCalendar res={weekCal} />
          </div>
        </section>

        {/* ── 02 · EMAIL (Zapier · Outlook + Gmail drafts) ── */}
        <section id="email" className="sec" data-i="2">
          <SectionHead
            source="Outlook + Gmail · Zapier"
            title="Email"
            note="Unread, weekly pulse, and queued Gmail drafts."
          />
          <div className="row split">
            <Unread res={unread} />
            <InboxPulse res={weekInbox} />
          </div>
          <div className="row">
            <GmailDraftsPanel res={gmailDrafts} queue={queue} />
          </div>
        </section>

        {/* ── 03 · TASKS (Zapier · Tasks + Jira) ── */}
        <section id="tasks" className="sec" data-i="3">
          <SectionHead
            source="Google Tasks + Jira · Zapier"
            title="Tasks"
            note="Open actions and Jira tickets."
          />
          <div className="row split">
            <Actions res={actions} />
            <JiraTasks res={jira} />
          </div>
        </section>

        {/* ── 04 · MONEY (claude.ai · Xero) ── */}
        <section id="money" className="sec" data-i="4">
          <SectionHead
            source="Xero · claude.ai"
            title="Money"
            note="Revenue, cash, receivables, expenses."
          />
          {moneySnapshot ? (
            <MoneySnapshotCard
              data={moneySnapshot}
              org={{ name: "Zerobi", email: "angus@zerobi.au" }}
              className="w-full"
            />
          ) : (
            <KpiStrip
              pl={pl.stale ? null : pl.data}
              cash={cash.stale ? null : cash.data}
              customers={customers.stale ? null : customers.data}
            />
          )}
          {!bankBalances.stale && (
            <div className="row" style={{ marginTop: 14 }}>
              <BankBalancesCard data={bankBalances.data} className="w-full" />
            </div>
          )}
          <div className="row two-col">
            <RevenueBars res={customers} />
            <PsiPanel res={customers} />
          </div>
          <div className="row split">
            <TopExpenses res={pl} />
            <BalanceSheet res={bs} />
          </div>
          <div className="row split">
            <Receivables res={receivables} queue={queue} />
            <WorkingCapital res={cash} />
          </div>
          <div className="row split">
            <BankSpendPanel res={bankSpend} />
            <CashMovement res={bankSpend} />
          </div>
          <div className="row split">
            <Invoices res={invoices} />
            <BlockscoreLedger />
          </div>
        </section>

        {/* ── 05 · OBLIGATIONS (derived · deadlines, tax, blockscore) ── */}
        <section id="obligations" className="sec" data-i="5">
          <SectionHead
            source="Derived · tax & deadlines"
            title="Obligations"
            note="Tax dates and statutory deadlines."
          />
          <DeadlineGrid res={deadlines} />
          <div className="row" style={{ marginTop: 14 }}>
            <TaxObligations />
          </div>
        </section>

        <footer className="foot">
          <div className="brand">Zerobi</div>
          <div>Tax advice: <a href="mailto:mark@thompsonpartners.com.au">Thompson Partners</a></div>
          <div>{!meta.stale ? meta.data.generated_at : "no refresh"}</div>
        </footer>
      </main>
    </div>
  );
}
