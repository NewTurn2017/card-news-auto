export function getPlanningPrompt(sourceText: string, slideCount: number = 7) {
  return `당신은 인스타그램 카드뉴스 전문 에디터입니다.
다음 텍스트를 인스타그램 카드뉴스 ${slideCount}장으로 구조화해주세요.

규칙:
- 1장: 커버 (카테고리 + 임팩트 있는 제목 + 부제)
- 2~${slideCount - 1}장: 핵심 내용 (한 장에 한 가지 메시지, 제목 + 본문)
- ${slideCount}장: 마무리 (핵심 요약 또는 행동 유도)
- 제목은 2줄 이내, 짧고 강렬하게
- 부제/본문은 간결하게 (카드뉴스에 맞게)
- category는 영문 대문자 (예: "AI & INSIGHT", "TECH", "TREND")

원본 텍스트:
${sourceText}`;
}

export const PLANNING_SCHEMA = {
  type: "object" as const,
  properties: {
    slides: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          type: {
            type: "string" as const,
            enum: ["cover", "content", "ending"],
          },
          category: { type: "string" as const },
          title: { type: "string" as const },
          subtitle: { type: "string" as const },
          body: { type: "string" as const },
        },
        required: ["type", "title"],
      },
    },
  },
  required: ["slides"],
};

export function getHtmlGenerationPrompt(slide: {
  type: string;
  category?: string;
  title: string;
  subtitle?: string;
  body?: string;
  colorPreset: "light" | "dark";
  layoutDescription: string;
}) {
  const bgColor = slide.colorPreset === "dark" ? "#0f0f0f" : "#ffffff";
  const textColor = slide.colorPreset === "dark" ? "#ffffff" : "#111111";
  const accentColor = slide.colorPreset === "dark" ? "#4ae3c0" : "#0d9488";
  const subtextColor = slide.colorPreset === "dark" ? "#a0a0a0" : "#666666";

  return `다음 카드뉴스 슬라이드를 HTML로 만들어주세요.

슬라이드 정보:
- 타입: ${slide.type}
${slide.category ? `- 카테고리: ${slide.category}` : ""}
- 제목: ${slide.title}
${slide.subtitle ? `- 부제: ${slide.subtitle}` : ""}
${slide.body ? `- 본문: ${slide.body}` : ""}

디자인 규칙:
- 크기: 정확히 1080x1350px (4:5 비율)
- 배경색: ${bgColor}, 텍스트색: ${textColor}, 강조색: ${accentColor}, 보조텍스트: ${subtextColor}
- 레이아웃: ${slide.layoutDescription}
- 폰트: 'Pretendard', sans-serif
- 제목: bold, 큰 사이즈 (48-64px)
- 부제/본문: regular, 보통 사이즈 (20-28px)
- 카테고리: uppercase, letter-spacing 넓게, 작은 사이즈 (14-16px), 강조색
- 인라인 CSS만 사용
- 이미지 태그 없음 (텍스트만)
- 단일 div 루트, width:1080px, height:1350px

HTML만 출력해주세요. 다른 설명 없이.`;
}
