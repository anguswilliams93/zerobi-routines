"use client";

import { useEffect, useRef, useState } from "react";

export function CountUp({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 900,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const [n, setN] = useState(reducedMotion ? value : 0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    const from = 0;
    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(from + (value - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reducedMotion]);

  const rounded = decimals > 0 ? Number(n).toFixed(decimals) : Math.round(n).toString();
  // add thousands separators using en-AU
  const formatted = decimals > 0
    ? Number(rounded).toLocaleString("en-AU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : Number(rounded).toLocaleString("en-AU");

  return <span className={className}>{prefix}{formatted}{suffix}</span>;
}
