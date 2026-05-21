import { z } from "zod";

export const MetaStamp = z.object({
  fetched_at: z.string(),
  source: z.string(),
  ok: z.boolean().default(true),
  note: z.string().optional(),
});
export type MetaStamp = z.infer<typeof MetaStamp>;

const withMeta = <T extends z.ZodTypeAny>(shape: T) =>
  z.object({ _meta: MetaStamp.optional() }).and(shape);

/* ── meta.json ─────────────────────────────────────────────── */
export const RawMeta = z.object({
  generated_at: z.string(),
  week: z.number().int(),
  fy: z.string(),
  sources: z.record(z.string(), MetaStamp).default({}),
});
export type RawMeta = z.infer<typeof RawMeta>;

/* ── daily/calendar.json ───────────────────────────────────── */
export const CalendarEvent = z.object({
  id: z.string().optional(),
  start: z.string(),
  end: z.string().nullable().optional(),
  title: z.string(),
  attendees: z.array(z.string()).default([]),
  location: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  all_day: z.boolean().default(false),
});
export const DailyCalendar = withMeta(z.object({ events: z.array(CalendarEvent) }));
export type DailyCalendar = z.infer<typeof DailyCalendar>;

/* ── daily/unread.json ─────────────────────────────────────── */
export const UnreadEmail = z.object({
  id: z.string().optional(),
  sender: z.string(),
  subject: z.string(),
  gist: z.string(),
  action_required: z.boolean().default(false),
  received_at: z.string().optional(),
});
export const DailyUnread = withMeta(z.object({ emails: z.array(UnreadEmail) }));
export type DailyUnread = z.infer<typeof DailyUnread>;

/* ── daily/invoices.json ───────────────────────────────────── */
export const InvoiceCandidate = z.object({
  vendor: z.string(),
  amount_aud: z.number(),
  due_date: z.string().optional(),
  invoice_no: z.string().optional(),
  email_subject: z.string().optional(),
  in_budget: z.boolean(),
  budget_match_note: z.string().optional(),
});
export const DailyInvoices = withMeta(z.object({ invoices: z.array(InvoiceCandidate) }));
export type DailyInvoices = z.infer<typeof DailyInvoices>;

/* ── daily/actions.json ────────────────────────────────────── */
export const ActionItem = z.object({
  kind: z.enum(["task", "event", "draft"]),
  title: z.string(),
  detail: z.string().optional(),
  created_at: z.string().optional(),
});
export const DailyActions = withMeta(z.object({ actions: z.array(ActionItem) }));
export type DailyActions = z.infer<typeof DailyActions>;

/* ── weekly/calendar.json ──────────────────────────────────── */
export const WeeklyCalendar = withMeta(z.object({
  range: z.object({ start: z.string(), end: z.string() }),
  events: z.array(CalendarEvent),
}));
export type WeeklyCalendar = z.infer<typeof WeeklyCalendar>;

/* ── weekly/inbox.json ─────────────────────────────────────── */
export const InboxSender = z.object({ sender: z.string(), count: z.number().int() });
export const InboxThread = z.object({ sender: z.string(), subject: z.string(), age_days: z.number(), needs_reply: z.boolean().default(true) });
export const WeeklyInbox = withMeta(z.object({
  total_received: z.number().int().default(0),
  top_senders: z.array(InboxSender).default([]),
  threads_needing_reply: z.array(InboxThread).default([]),
  oldest_unread: z.string().optional(),
}));
export type WeeklyInbox = z.infer<typeof WeeklyInbox>;

/* ── weekly/jira.json (optional) ───────────────────────────── */
export const JiraIssue = z.object({
  key: z.string(),
  summary: z.string(),
  status: z.string(),
  priority: z.string().optional(),
  url: z.string().optional(),
});
export const WeeklyJira = withMeta(z.object({ issues: z.array(JiraIssue) }));
export type WeeklyJira = z.infer<typeof WeeklyJira>;

/* ── financial/pl.json ─────────────────────────────────────── */
export const ProfitLoss = withMeta(z.object({
  period: z.string(),
  revenue_ytd: z.number(),
  expenses_ytd: z.number(),
  net_profit_ytd: z.number(),
  net_margin_pct: z.number(),
  revenue_by_account: z.array(z.object({ name: z.string(), amount: z.number() })).default([]),
  top_expenses: z.array(z.object({ name: z.string(), amount: z.number() })).default([]),
}));
export type ProfitLoss = z.infer<typeof ProfitLoss>;

/* ── financial/balance-sheet.json ──────────────────────────── */
export const BalanceSheet = withMeta(z.object({
  as_at: z.string(),
  rows: z.array(z.object({
    section: z.enum(["asset", "liability", "equity", "total"]),
    label: z.string(),
    sub: z.string().optional(),
    value: z.number(),
    tone: z.enum(["default", "danger", "warning", "signal"]).default("default"),
  })),
}));
export type BalanceSheet = z.infer<typeof BalanceSheet>;

/* ── financial/cash.json ───────────────────────────────────── */
export const Cash = withMeta(z.object({
  cash_at_bank: z.number(),
  receivables: z.number().default(0),
  payables: z.number().default(0),
  working_capital: z.number(),
  status: z.enum(["healthy", "tight", "critical"]).default("healthy"),
}));
export type Cash = z.infer<typeof Cash>;

/* ── financial/customers.json ──────────────────────────────── */
export const Customer = z.object({
  name: z.string(),
  amount: z.number(),
  pct: z.number(),
  tag: z.string().optional(),
  psi: z.boolean().default(false),
});
export const Customers = withMeta(z.object({
  fy: z.string(),
  customers: z.array(Customer),
  psi_total_pct: z.number(),
  psi_failed: z.boolean(),
}));
export type Customers = z.infer<typeof Customers>;

/* ── financial/receivables.json ────────────────────────────── */
export const Receivable = z.object({
  contact: z.string(),
  amount: z.number(),
  due_date: z.string().optional(),
  days_overdue: z.number().default(0),
});
export const Receivables = withMeta(z.object({ items: z.array(Receivable), total: z.number() }));
export type Receivables = z.infer<typeof Receivables>;

/* ── financial/bank-spend.json ─────────────────────────────── */
export const BankSpend = withMeta(z.object({
  window_days: z.number().default(90),
  total_out: z.number(),
  total_in: z.number(),
  net: z.number(),
  by_category: z.array(z.object({ category: z.string(), label: z.string(), amount: z.number() })),
}));
export type BankSpend = z.infer<typeof BankSpend>;

/* ── financial/bank-balances.json (Pattern A — 30d series) ─── */
export const BankBalanceDay = z.object({
  timestamp: z.number(),
  date: z.string(),
  business: z.number(),
  personal: z.number(),
  homeloan: z.number(),
  offset: z.number(),
});
export const BankBalanceSummary = z.object({
  name: z.string(),
  account: z.string(),
  current: z.number(),
  change_30d: z.number(),
  change_pct: z.number(),
  color: z.string(),
});
export const BankBalances = withMeta(z.object({
  headline: z.object({ value: z.number(), currency: z.string().default("AUD"), label: z.string() }),
  comparison: z.object({
    value: z.number(),
    pct: z.number(),
    direction: z.enum(["up", "down", "flat"]),
    period: z.string(),
  }),
  series: z.array(BankBalanceDay),
  summary: z.array(BankBalanceSummary),
}));
export type BankBalances = z.infer<typeof BankBalances>;

/* ── financial/loan-interest.json (monthly interest charged vs loan balance) ─── */
export const LoanInterestEntry = z.object({
  timestamp: z.number(),
  date: z.string(),
  interest: z.number(),
  repayment: z.number(),
  balance: z.number(),
});
export const LoanInterest = withMeta(z.object({
  headline: z.object({ value: z.number(), currency: z.string().default("AUD"), label: z.string() }),
  comparison: z.object({
    value: z.number(),
    pct: z.number(),
    direction: z.enum(["up", "down", "flat"]),
    period: z.string(),
  }),
  series: z.array(LoanInterestEntry),
}));
export type LoanInterest = z.infer<typeof LoanInterest>;

/* ── derived: MoneySnapshot (Pattern B prop shape) ─────────────
   Composed at render time from pl + cash + bank-spend. Not persisted
   to raw/ — kept as a zod schema so the block has a typed contract. */
export const MoneySnapshot = z.object({
  headline: z.object({
    value: z.number(),
    currency: z.string().default("AUD"),
    label: z.string(),
  }),
  comparison: z.object({
    value: z.number(),
    pct: z.number(),
    direction: z.enum(["up", "down", "flat"]),
    period: z.string(),
  }),
  tiles: z
    .array(z.object({ title: z.string(), value: z.string(), icon: z.string() }))
    .length(4),
  ring: z.array(
    z.object({ name: z.string(), value: z.number(), color: z.string() }),
  ),
  progress: z.object({
    label: z.string(),
    pct: z.number(),
    caption: z.string(),
  }),
});
export type MoneySnapshot = z.infer<typeof MoneySnapshot>;

/* ── deadlines.json ────────────────────────────────────────── */
export const Deadline = z.object({
  label: z.string(),
  date: z.string(),
  note: z.string().optional(),
  amount: z.number().optional(),
});
export const Deadlines = withMeta(z.object({ items: z.array(Deadline) }));
export type Deadlines = z.infer<typeof Deadlines>;

/* ── daily/gmail-drafts.json ───────────────────────────────── */
export const GmailDraft = z.object({
  id: z.string(),
  message_id: z.string().optional(),
  thread_id: z.string().optional(),
  to: z.string().default(""),
  subject: z.string().default(""),
  snippet: z.string().default(""),
  body: z.string().default(""),
  updated_at: z.string().optional(),
});
export const GmailDrafts = withMeta(z.object({ drafts: z.array(GmailDraft) }));
export type GmailDraft = z.infer<typeof GmailDraft>;
export type GmailDrafts = z.infer<typeof GmailDrafts>;

/* ── actions/queue.json ────────────────────────────────────── */
export const QueueAction = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("xero_add_note"),
    invoice_id: z.string().optional(),
    contact: z.string(),
    amount: z.number().optional(),
    note: z.string(),
  }),
  z.object({
    type: z.literal("gmail_update_draft"),
    draft_id: z.string(),
    to: z.string(),
    subject: z.string(),
    body: z.string(),
  }),
  z.object({
    type: z.literal("gmail_label"),
    draft_id: z.string(),
    message_id: z.string().optional(),
    label: z.string(),
  }),
  z.object({
    type: z.literal("gmail_discard"),
    draft_id: z.string(),
  }),
]);
export type QueueAction = z.infer<typeof QueueAction>;

export const QueueEntry = z.object({
  id: z.string(),
  created_at: z.string(),
  status: z.enum(["pending", "processed", "failed"]).default("pending"),
  error: z.string().optional(),
  processed_at: z.string().optional(),
  action: QueueAction,
});
export type QueueEntry = z.infer<typeof QueueEntry>;

export const QueueFile = z.object({ entries: z.array(QueueEntry).default([]) });
export type QueueFile = z.infer<typeof QueueFile>;
