import { readRaw } from "@/lib/raw";
import { readQueue } from "@/lib/queue";
import {
  RawMeta,
  DailyCalendar, DailyUnread, DailyInvoices, DailyActions,
  WeeklyCalendar, WeeklyInbox, WeeklyJira,
  ProfitLoss, BalanceSheet as BSchema, Cash, Customers, Receivables as RSchema, BankSpend,
  Deadlines, GmailDrafts as GDSchema,
} from "@/lib/schema";

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

export const dynamic = "force-dynamic";

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

  const deadlines       = readRaw("deadlines.json", Deadlines);

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
          <KpiStrip
            pl={pl.stale ? null : pl.data}
            cash={cash.stale ? null : cash.data}
            customers={customers.stale ? null : customers.data}
          />
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
