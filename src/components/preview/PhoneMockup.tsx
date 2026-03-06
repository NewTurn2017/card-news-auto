"use client";

import { Signal, Wifi, BatteryMedium } from "lucide-react";

interface PhoneMockupProps {
  children: React.ReactNode;
  width?: number;
}

export default function PhoneMockup({ children, width }: PhoneMockupProps) {
  const phoneWidth = width ? width + 6 : 330; // card width + border
  return (
    <div className="relative mx-auto" style={{ width: phoneWidth }}>
      <div className="overflow-hidden rounded-[44px] border-[3px] border-zinc-200 bg-white shadow-2xl ring-1 ring-black/5">
        {/* Status bar with Dynamic Island */}
        <div className="relative flex items-center justify-between bg-white px-6 py-2.5 text-[11px] text-zinc-800">
          <span className="font-semibold tabular-nums">9:41</span>
          <div className="absolute left-1/2 top-1.5 h-[24px] w-[100px] -translate-x-1/2 rounded-full bg-black" />
          <div className="flex items-center gap-1">
            <Signal size={12} strokeWidth={2.5} />
            <Wifi size={12} strokeWidth={2.5} />
            <BatteryMedium size={14} strokeWidth={2} />
          </div>
        </div>

        {/* Content */}
        <div className="overflow-hidden">{children}</div>

        {/* Home indicator */}
        <div className="flex justify-center bg-black pb-2 pt-1">
          <div className="h-[4px] w-[120px] rounded-full bg-white/30" />
        </div>
      </div>
    </div>
  );
}
