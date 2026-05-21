"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { format } from "date-fns";

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ZbCard, ZbCardHead, ZbCardBody } from "@/components/zb-card";
import { cn } from "@/lib/utils";
import type { BankBalances } from "@/lib/schema";

const fmtAud = (v: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(v);

const fmtAudFull = (v: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);

const fmtAudCompact = (v: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(v);

const PERIODS = [30, 60, 90, "all"] as const;
type Period = (typeof PERIODS)[number];

const KEY_BY_NAME: Record<string, "business" | "personal" | "homeloan" | "offset"> = {
  Business: "business",
  Personal: "personal",
  "Home loan": "homeloan",
  Offset: "offset",
};

export function BankBalancesCard({
  data,
  className,
}: {
  data: BankBalances;
  className?: string;
}) {
  const [period, setPeriod] = useState<Period>(30);

  const chartConfig: ChartConfig = {
    business: { label: "Business", color: data.summary[0]?.color ?? "var(--c-terracotta)" },
    personal: { label: "Personal", color: data.summary[1]?.color ?? "var(--ink)" },
    homeloan: { label: "Home loan", color: data.summary[2]?.color ?? "var(--c-lime-dim)" },
    offset: { label: "Offset", color: data.summary[3]?.color ?? "var(--positive)" },
  };

  // Slice the series to the selected window; every metric below recomputes from `view`.
  const view = period === "all" ? data.series : data.series.slice(-period);
  const windowDays = Math.max(view.length - 1, 0);

  // Left axis: cash accounts incl. offset (0 → rounded max). Right axis: home loan (large negative liability).
  const cashValues = view.flatMap((d) => [d.business, d.personal, d.offset]);
  const maxVal = Math.max(...cashValues, 1);
  const yMax = Math.ceil(maxVal / 5000) * 5000;
  const yTicks = Array.from({ length: 6 }, (_, i) => Math.round((yMax / 5) * i));

  const loanValues = view.map((d) => d.homeloan);
  const loanMin = Math.floor(Math.min(...loanValues) / 50000) * 50000;
  const loanMax = Math.ceil(Math.max(...loanValues) / 50000) * 50000;
  const loanTicks = Array.from({ length: 5 }, (_, i) =>
    Math.round(loanMin + ((loanMax - loanMin) / 4) * i),
  );

  // Headline cash (business + personal + offset; excludes the home loan) across the selected window.
  const firstRow = view[0];
  const lastRow = view[view.length - 1];
  const totFirst = firstRow.business + firstRow.personal + firstRow.offset;
  const totLast = lastRow.business + lastRow.personal + lastRow.offset;
  const compValue = totLast - totFirst;
  const compPct = totFirst !== 0 ? (compValue / totFirst) * 100 : 0;
  const up = compPct > 0.5;
  const down = compPct < -0.5;

  // Home-loan movement over the window — surfaced in the delta but NOT folded into cash available.
  // Positive = balance rose toward zero = debt paid down.
  const loanChange = lastRow.homeloan - firstRow.homeloan;
  const loanUp = loanChange > 0;
  const loanDown = loanChange < 0;

  // Per-account rows recomputed for the window (name/account/colour come from the stored summary).
  const rows = data.summary.map((s) => {
    const key = KEY_BY_NAME[s.name];
    if (!key) return { name: s.name, account: s.account, color: s.color, current: s.current, change: s.change_30d, pct: s.change_pct };
    const vals = view.map((d) => d[key]);
    const f = vals[0];
    const c = vals[vals.length - 1];
    const change = c - f;
    const base = key === "homeloan" ? Math.abs(f) : f;
    const pct = base !== 0 ? (change / base) * 100 : 0;
    return { name: s.name, account: s.account, color: s.color, current: c, change, pct };
  });

  return (
    <ZbCard className={className}>
      <ZbCardHead
        title="Bank balances"
        caption={`${period === "all" ? data.series.length : period}d · CommBank + ING + Macquarie`}
      />
      <ZbCardBody className="space-y-6">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] mono uppercase tracking-wider text-[var(--ink-3)] mb-2">
              {data.headline.label}
            </div>
            <div className="kpi-value tnum">{fmtAudFull(totLast)}</div>
          </div>
          <div className="text-right">
            <div
              className={cn(
                "text-[15px] font-medium",
                up && "text-[var(--positive)]",
                down && "text-[var(--danger)]",
                !up && !down && "text-[var(--ink-3)]",
              )}
            >
              {up ? "+" : down ? "−" : ""}
              {fmtAudFull(Math.abs(compValue))} ({Math.abs(compPct).toFixed(1)}%)
            </div>
            <div className="mono uppercase tracking-wider text-[10px] text-[var(--ink-4)] mt-1">
              cash · vs {windowDays} days ago
            </div>
            <div
              className={cn(
                "text-[12px] font-medium mt-1.5",
                loanUp && "text-[var(--positive)]",
                loanDown && "text-[var(--danger)]",
                !loanUp && !loanDown && "text-[var(--ink-3)]",
              )}
            >
              <span className="mono uppercase tracking-wider text-[10px] text-[var(--ink-4)]">Home loan </span>
              {loanUp ? "+" : loanDown ? "−" : ""}
              {fmtAudFull(Math.abs(loanChange))}
            </div>
          </div>
        </div>

        <div className="flex gap-1 justify-end">
          {PERIODS.map((p) => (
            <button
              key={String(p)}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "mono uppercase tracking-wider text-[10px] px-2.5 py-1 rounded-sm border transition-colors cursor-pointer",
                period === p
                  ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]"
                  : "border-[var(--line)] text-[var(--ink-3)] hover:border-[var(--line-strong)]",
              )}
            >
              {p === "all" ? "All" : `${p}d`}
            </button>
          ))}
        </div>

        <ChartContainer config={chartConfig} className="h-64 w-full">
          <LineChart data={view} margin={{ top: 8, bottom: 0, left: -10, right: 15 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis
              dataKey={(d: { timestamp: number }) => format(d.timestamp, "MMM d")}
              tickLine={false}
              tickMargin={8}
              axisLine={false}
              minTickGap={15}
              tick={{ fontSize: 10, fill: "var(--ink-3)" }}
            />
            <YAxis
              yAxisId="left"
              domain={[0, yMax]}
              ticks={yTicks}
              tickFormatter={(v: number) => fmtAud(v)}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--ink-3)" }}
              tickMargin={8}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[loanMin, loanMax]}
              ticks={loanTicks}
              tickFormatter={(v: number) => fmtAudCompact(v)}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--c-lime-dim)" }}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={{ stroke: "var(--line-strong)", strokeDasharray: "3 3" }}
              content={<ChartTooltipContent className="w-40" hideLabel />}
            />
            <Line
              yAxisId="left"
              dataKey="business"
              type="monotone"
              stroke="var(--color-business)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              yAxisId="left"
              dataKey="personal"
              type="monotone"
              stroke="var(--color-personal)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              yAxisId="left"
              dataKey="offset"
              type="monotone"
              stroke="var(--color-offset)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              yAxisId="right"
              dataKey="homeloan"
              type="monotone"
              stroke="var(--color-homeloan)"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
              connectNulls
            />
            <ChartLegend
              verticalAlign="top"
              content={<ChartLegendContent />}
              className="justify-end mono text-[10px] uppercase tracking-wider text-[var(--ink-3)] max-sm:mb-4 max-sm:flex-col max-sm:items-start"
            />
          </LineChart>
        </ChartContainer>

        <Table>
          <TableHeader>
            <TableRow className="border-[var(--line)]">
              <TableHead className="mono uppercase tracking-wider text-[10px] text-[var(--ink-3)]">Account</TableHead>
              <TableHead className="mono uppercase tracking-wider text-[10px] text-[var(--ink-3)]">Institution</TableHead>
              <TableHead className="mono uppercase tracking-wider text-[10px] text-[var(--ink-3)] text-end">Current</TableHead>
              <TableHead className="mono uppercase tracking-wider text-[10px] text-[var(--ink-3)] text-end">
                Δ {period === "all" ? "all" : `${period}d`}
              </TableHead>
              <TableHead className="mono uppercase tracking-wider text-[10px] text-[var(--ink-3)] text-end">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const rUp = row.change > 0;
              const rDown = row.change < 0;
              return (
                <TableRow key={row.name} className="border-[var(--line)]">
                  <TableCell className="flex items-center gap-2 py-3">
                    <span
                      className="h-5 w-1 rounded-sm"
                      style={{ background: row.color }}
                    />
                    <span className="text-[13px] font-semibold text-[var(--ink)]">{row.name}</span>
                  </TableCell>
                  <TableCell className="text-[12px] text-[var(--ink-3)] py-3">{row.account}</TableCell>
                  <TableCell className="text-end tnum mono text-[12px] py-3">{fmtAudFull(row.current)}</TableCell>
                  <TableCell
                    className={cn(
                      "text-end tnum mono text-[12px] py-3",
                      rUp && "text-[var(--positive)]",
                      rDown && "text-[var(--danger)]",
                    )}
                  >
                    {rUp ? "+" : rDown ? "−" : ""}
                    {fmtAudFull(Math.abs(row.change))}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-end tnum mono text-[12px] py-3",
                      rUp && "text-[var(--positive)]",
                      rDown && "text-[var(--danger)]",
                    )}
                  >
                    {rUp ? "+" : rDown ? "−" : ""}
                    {Math.abs(row.pct).toFixed(1)}%
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ZbCardBody>
    </ZbCard>
  );
}

export default BankBalancesCard;
