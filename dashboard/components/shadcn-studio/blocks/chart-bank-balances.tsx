"use client";

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

export function BankBalancesCard({
  data,
  className,
}: {
  data: BankBalances;
  className?: string;
}) {
  const chartConfig: ChartConfig = {
    business: { label: "Business", color: data.summary[0]?.color ?? "var(--c-terracotta)" },
    personal: { label: "Personal", color: data.summary[1]?.color ?? "var(--ink)" },
  };

  const allValues = data.series.flatMap((d) => [d.business, d.personal]);
  const maxVal = Math.max(...allValues, 1);
  const yMax = Math.ceil(maxVal / 5000) * 5000;
  const yTicks = Array.from({ length: 6 }, (_, i) => Math.round((yMax / 5) * i));

  const up = data.comparison.direction === "up";
  const down = data.comparison.direction === "down";

  return (
    <ZbCard className={className}>
      <ZbCardHead title="Bank balances" caption={`${data.series.length}d · CommBank + ING`} />
      <ZbCardBody className="space-y-6">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] mono uppercase tracking-wider text-[var(--ink-3)] mb-2">
              {data.headline.label}
            </div>
            <div className="kpi-value tnum">{fmtAudFull(data.headline.value)}</div>
          </div>
          <div className="text-right">
            <div
              className={cn(
                "text-[15px] font-medium",
                up && "text-[var(--c-terracotta)]",
                down && "text-[var(--danger)]",
                !up && !down && "text-[var(--ink-3)]",
              )}
            >
              {up ? "+" : down ? "−" : ""}
              {fmtAudFull(Math.abs(data.comparison.value))} ({Math.abs(data.comparison.pct).toFixed(1)}%)
            </div>
            <div className="mono uppercase tracking-wider text-[10px] text-[var(--ink-4)] mt-1">
              {data.comparison.period}
            </div>
          </div>
        </div>

        <ChartContainer config={chartConfig} className="h-64 w-full">
          <LineChart data={data.series} margin={{ top: 8, bottom: 0, left: -10, right: 15 }}>
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
              domain={[0, yMax]}
              ticks={yTicks}
              tickFormatter={(v: number) => fmtAud(v)}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--ink-3)" }}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={{ stroke: "var(--line-strong)", strokeDasharray: "3 3" }}
              content={<ChartTooltipContent className="w-40" hideLabel />}
            />
            <Line
              dataKey="business"
              type="monotone"
              stroke="var(--color-business)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              dataKey="personal"
              type="monotone"
              stroke="var(--color-personal)"
              strokeWidth={2}
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
              <TableHead className="mono uppercase tracking-wider text-[10px] text-[var(--ink-3)] text-end">Δ 30d</TableHead>
              <TableHead className="mono uppercase tracking-wider text-[10px] text-[var(--ink-3)] text-end">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.summary.map((row) => {
              const rUp = row.change_30d > 0;
              const rDown = row.change_30d < 0;
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
                      rUp && "text-[var(--c-terracotta)]",
                      rDown && "text-[var(--danger)]",
                    )}
                  >
                    {rUp ? "+" : rDown ? "−" : ""}
                    {fmtAudFull(Math.abs(row.change_30d))}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-end tnum mono text-[12px] py-3",
                      rUp && "text-[var(--c-terracotta)]",
                      rDown && "text-[var(--danger)]",
                    )}
                  >
                    {rUp ? "+" : rDown ? "−" : ""}
                    {Math.abs(row.change_pct).toFixed(1)}%
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
