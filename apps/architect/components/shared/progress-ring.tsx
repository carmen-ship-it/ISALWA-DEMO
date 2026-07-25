"use client";

import { motion } from "motion/react";

interface ProgressRingProps {
  progress: number;
  size?: number;
  stroke?: number;
  label?: string;
}

export function ProgressRing({
  progress,
  size = 56,
  stroke = 3,
  label,
}: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, progress));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e5e5"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#171717"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          initial={false}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </svg>
      {label ? (
        <span className="absolute text-[10px] font-medium tracking-wide text-neutral-600">
          {label}
        </span>
      ) : null}
    </div>
  );
}
