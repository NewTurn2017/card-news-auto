export const TONE_OPTIONS = [
  { id: "professional", label: "전문적", promptText: "전문적이고 신뢰감 있는 톤으로" },
  { id: "friendly", label: "친근한", promptText: "친근하고 가벼운 톤으로" },
  { id: "humorous", label: "유머러스한", promptText: "위트 있고 유머러스한 톤으로" },
  { id: "formal", label: "격식체", promptText: "격식을 갖춘 ~합니다/~입니다 체로" },
] as const

export const WRITING_STYLE_OPTIONS = [
  { id: "concise", label: "간결체", promptText: "핵심만 간결하게, 짧은 문장 위주로" },
  { id: "descriptive", label: "설명체", promptText: "상세하게 설명하는 방식으로" },
  { id: "conversational", label: "대화체", promptText: "독자에게 말하듯 대화하는 방식으로" },
] as const

export const CONTENT_LENGTH_OPTIONS = [
  { id: "short", label: "짧게", promptText: "각 슬라이드 본문을 1-2문장으로 짧게" },
  { id: "medium", label: "보통", promptText: "각 슬라이드 본문을 3-4문장으로" },
  { id: "long", label: "길게", promptText: "각 슬라이드 본문을 5-6문장으로 상세하게" },
] as const

export type ToneId = (typeof TONE_OPTIONS)[number]["id"]
export type WritingStyleId = (typeof WRITING_STYLE_OPTIONS)[number]["id"]
export type ContentLengthId = (typeof CONTENT_LENGTH_OPTIONS)[number]["id"]

export function resolveOptionText(
  type: "tone" | "writingStyle" | "contentLength",
  value: string,
): string {
  const optionsMap = {
    tone: TONE_OPTIONS,
    writingStyle: WRITING_STYLE_OPTIONS,
    contentLength: CONTENT_LENGTH_OPTIONS,
  } as const
  const options = optionsMap[type]
  const found = options.find((o) => o.id === value)
  return found ? found.promptText : value
}
