"use client";

import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { format } from "date-fns";

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { ZbCard, ZbCardHead, ZbCardBody } from "@/components/zb-card";
import type { LoanInterest } from "@/lib/schema";

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

export function LoanInterestCard({
  data,
  className,
}: {
  data: LoanInterest;
  className?: string;
}) {
  const chartConfig: ChartConfig = {
    interest: { label: "Interest charged", color: "var(--c-terracotta)" },
    balance: { label: "Loan balance", color: "var(--c-lime-dim)" },
  };

  // Left axis: monthly interest ($0 → rounded max). Right axis: loan balance (large negative).
  const interestMax = Math.ceil(Math.max(...data.series.map((d) => d.interest), 1) / 1000) * 1000;
  const interestTicks = Array.from({ length: 5 }, (_, i) => Math.round((interestMax / 4) * i));

  const balVals = data.series.map((d) => d.balance);
  const balMin = Math.floor(Math.min(...balVals) / 10000) * 10000;
  const balMax = Math.ceil(Math.max(...balVals) / 10000) * 10000;
  const balTicks = Array.from({ length: 5 }, (_, i) => Math.round(balMin + ((balMax - balMin) / 4) * i));

  return (
    <ZbCard className={className}>
      <ZbCardHead
        title="Home loan interest"
        caption={`${data.series.length} months · Macquarie xxxx5874`}
      />
      <ZbCardBody className="space-y-6">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] mono uppercase tracking-wider text-[var(--ink-3)] mb-2">
              {data.headline.label}
            </div>
            <div className="kpi-value tnum">{fmtAudFull(data.headline.value)}</div>
          </div>
          <div className="text-right">
            <div className="text-[15px] font-medium text-[var(--c-terracotta)]">
              {fmtAudFull(data.comparison.value)}
            </div>
            <div className="mono uppercase tracking-wider text-[10px] text-[var(--ink-4)] mt-1">
              {data.comparison.period}
            </div>
          </div>
        </div>

        <ChartContainer config={chartConfig} className="h-64 w-full">
          <ComposedChart data={data.series} margin={{ top: 8, bottom: 0, left: -6, right: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis
              dataKey={(d: { timestamp: number }) => format(d.timestamp, "MMM yy")}
              tickLine={false}
              tickMargin={8}
              axisLine={false}
              minTickGap={8}
              tick={{ fontSize: 10, fill: "var(--ink-3)" }}
            />
            <YAxis
              yAxisId="left"
              domain={[0, interestMax]}
              ticks={interestTicks}
              tickFormatter={(v: number) => fmtAud(v)}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--c-terracotta)" }}
              tickMargin={8}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[balMin, balMax]}
              ticks={balTicks}
              tickFormatter={(v: number) => fmtAudCompact(v)}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--c-lime-dim)" }}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={{ fill: "color-mix(in oklab, var(--ink) 6%, transparent)" }}
              content={<ChartTooltipContent className="w-44" />}
            />
            <Bar
              yAxisId="left"
              dataKey="interest"
              fill="var(--color-interest)"
              radius={[3, 3, 0, 0]}
              maxBarSize={34}
            />
            <Line
              yAxisId="right"
              dataKey="balance"
              type="monotone"
              stroke="var(--color-balance)"
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
          </ComposedChart>
        </ChartContainer>
      </ZbCardBody>
    </ZbCard>
  );
}

export default LoanInterestCard;
