import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CardFlow - AI 카드뉴스 자동 생성";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 20,
            background: "#0f0f0f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #fbbf24",
            marginBottom: 32,
          }}
        >
          <span
            style={{
              fontSize: 56,
              fontWeight: 900,
              background: "linear-gradient(135deg, #fde68a, #fbbf24)",
              backgroundClip: "text",
              color: "#fbbf24",
            }}
          >
            C
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            background: "linear-gradient(90deg, #fde68a, #fef9c3, #fbbf24)",
            backgroundClip: "text",
            color: "#fbbf24",
            marginBottom: 16,
          }}
        >
          CardFlow
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "#a1a1aa",
            marginBottom: 48,
          }}
        >
          AI 카드뉴스 자동 생성
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 16 }}>
          {["URL", "SNS", "YouTube", "검색", "텍스트"].map((label) => (
            <div
              key={label}
              style={{
                padding: "10px 24px",
                borderRadius: 999,
                background: "rgba(251, 191, 36, 0.1)",
                border: "1px solid rgba(251, 191, 36, 0.3)",
                color: "#fde68a",
                fontSize: 20,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
