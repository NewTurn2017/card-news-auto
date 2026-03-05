"use client";

interface PhoneMockupProps {
  children: React.ReactNode;
}

export default function PhoneMockup({ children }: PhoneMockupProps) {
  return (
    <div className="relative mx-auto w-[360px]">
      {/* Phone frame */}
      <div className="overflow-hidden rounded-[40px] border-[3px] border-zinc-700 bg-black shadow-2xl">
        {/* Status bar */}
        <div className="flex items-center justify-between bg-black px-6 py-2 text-xs text-white">
          <span>9:41</span>
          <div className="absolute left-1/2 top-3 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
          <div className="flex items-center gap-1">
            <span>▂▄▆█</span>
            <span>🔋</span>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
