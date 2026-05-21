"use client";

import {
  BadgePercentIcon,
  ChartNoAxesCombinedIcon,
  CirclePercentIcon,
  DollarSignIcon,
  ShoppingBagIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";

import { Label, Pie, PieChart } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { ZbCard, ZbCardHead, ZbCardBody } from "@/components/zb-card";
import { cn } from "@/lib/utils";
import type { MoneySnapshot } from "@/lib/schema";

const ICONS: Record<string, LucideIcon> = {
  wallet: WalletIcon,
  trend: TrendingUpIcon,
  trendDown: TrendingDownIcon,
  discount: BadgePercentIcon,
  dollar: DollarSignIcon,
  orders: ShoppingBagIcon,
  chart: ChartNoAxesCombinedIcon,
  pct: CirclePercentIcon,
};

const TOTAL_BARS = 24;

export function MoneySnapshotCard({
  data,
  org,
  className,
}: {
  data: MoneySnapshot;
  org: { name: string; email: string };
  className?: string;
}) {
  const filledBars = Math.round((data.progress.pct * TOTAL_BARS) / 100);
  const planBarsData = Array.from({ length: TOTAL_BARS }, (_, i) => ({
    bucket: i,
    value: i < filledBars ? 1 : 0,
  }));

  const ringConfig: ChartConfig = {
    value: { label: data.headline.label },
    ...Object.fromEntries(
      data.ring.map((seg) => [
        seg.name,
        { label: seg.name, color: seg.color },
      ]),
    ),
  };

  const ringData = data.ring.map((seg) => ({
    name: seg.name,
    value: seg.value,
    fill: seg.color,
  }));

  const up = data.comparison.direction === "up";
  const down = data.comparison.direction === "down";

  return (
    <ZbCard className={className}>
      <ZbCardHead title="Money snapshot" caption={data.comparison.period} />
      <ZbCardBody className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-5">
          {/* LEFT — org + tiles */}
          <div className="flex flex-col gap-6 lg:col-span-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-sm bg-[var(--ink)] text-[var(--bg)] flex items-center justify-center">
                <WalletIcon className="size-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold text-[var(--ink)]">{org.name}</span>
                <span className="mono text-[10px] uppercase tracking-wider text-[var(--ink-3)]">
                  {org.email}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {data.tiles.map((tile, i) => {
                const Icon = ICONS[tile.icon] ?? DollarSignIcon;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-sm border border-[var(--line)] bg-[var(--bg-3)]/40 px-3.5 py-2.5"
                  >
                    <div className="size-9 rounded-sm bg-[var(--c-terracotta)]/15 text-[var(--c-terracotta)] flex items-center justify-center shrink-0">
                      <Icon className="size-[18px]" />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="mono text-[10px] uppercase tracking-wider text-[var(--ink-3)] truncate">
                        {tile.title}
                      </span>
                      <span className="text-[16px] font-semibold text-[var(--ink)] tnum">
                        {tile.value}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT — ring */}
          <div className="lg:col-span-2 flex flex-col rounded-sm border border-[var(--line)] bg-[var(--bg-3)]/40 p-4">
            <div className="mono text-[10px] uppercase tracking-wider text-[var(--ink-3)] mb-2">
              {data.headline.label}
            </div>
            <ChartContainer config={ringConfig} className="h-36 w-full">
              <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={ringData}
                  dataKey="value"
                  nameKey="name"
                  startAngle={300}
                  endAngle={660}
                  innerRadius={56}
                  outerRadius={74}
                  paddingAngle={2}
                  stroke="var(--surface)"
                  strokeWidth={2}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) - 8}
                            className="tnum"
                            style={{ fontSize: 16, fontWeight: 700, fill: "var(--ink)" }}
                          >
                            {fmtCurrency(data.headline.value, data.headline.currency)}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 14}
                            style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", fill: "var(--ink-3)" }}
                            className="mono"
                          >
                            today
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex items-center justify-between pt-3 mt-auto border-t border-[var(--line)]">
              <span className="mono text-[10px] uppercase tracking-wider text-[var(--ink-3)]">
                {data.comparison.period}
              </span>
              <span
                className={cn(
                  "text-[18px] font-semibold tnum",
                  up && "text-[var(--c-terracotta)]",
                  down && "text-[var(--danger)]",
                  !up && !down && "text-[var(--ink-3)]",
                )}
              >
                {up ? "+" : down ? "−" : ""}
                {Math.abs(data.comparison.pct).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM — plan progress */}
        <div className="rounded-sm border border-[var(--line)] bg-[var(--bg-3)]/40 p-4">
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="flex flex-col justify-center gap-3 lg:col-span-2">
              <div className="mono text-[10px] uppercase tracking-wider text-[var(--ink-3)]">
                {data.progress.label}
              </div>
              <div className="text-[44px] leading-none font-extrabold tracking-tight text-[var(--ink)] tnum">
                {Math.round(data.progress.pct)}%
              </div>
              <div className="text-[12px] text-[var(--ink-3)]">{data.progress.caption}</div>
            </div>
            <div className="flex flex-col gap-4 lg:col-span-3">
              <div className="grid gap-3 md:grid-cols-2">
                {data.ring.slice(0, 4).map((seg) => (
                  <div key={seg.name} className="flex items-center gap-2">
                    <span
                      className="inline-block size-2.5 rounded-sm"
                      style={{ background: seg.color }}
                    />
                    <span className="text-[12px] font-medium text-[var(--ink-2)]">{seg.name}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <div
                  className="flex w-full items-stretch gap-[3px]"
                  role="meter"
                  aria-valuenow={Math.round(data.progress.pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={data.progress.label}
                >
                  {planBarsData.map((b) => (
                    <span
                      key={b.bucket}
                      className="h-7 flex-1 rounded-[2px]"
                      style={{
                        background: b.value
                          ? "var(--c-terracotta)"
                          : "color-mix(in oklab, var(--ink) 10%, transparent)",
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between mono text-[9px] uppercase tracking-wider text-[var(--ink-4)]">
                  <span>0%</span>
                  <span>{filledBars}/{TOTAL_BARS} segments</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ZbCardBody>
    </ZbCard>
  );
}

function fmtCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    maximumFractionDigits: Math.abs(value) >= 10_000 ? 0 : 2,
  }).format(value);
}

export default MoneySnapshotCard;
