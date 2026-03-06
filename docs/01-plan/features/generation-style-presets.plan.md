# Plan: Generation Style Presets (내 스타일 저장)

## Executive Summary

| Item | Detail |
|------|--------|
| Feature | Generation Style Presets + Flexible Slide Count |
| Start Date | 2026-03-07 |
| Target | /create 페이지 생성 플로우 개선 |

### Value Delivered

| Perspective | Description |
|-------------|-------------|
| Problem | 매번 같은 톤/말투/글자수를 수동 설정해야 하며, 슬라이드 수도 [5,7,9,11]로 제한됨 |
| Solution | 생성 스타일 프리셋을 DB에 영구 저장하고, 슬라이드 수를 1~10장 자유 선택 가능하게 확장 |
| Function UX Effect | 내용 확인 후 저장된 스타일 선택 -> 즉시 생성. 반복 작업 시간 대폭 단축 |
| Core Value | 사용자 고유의 브랜드 톤을 일관성 있게 유지하며 카드뉴스 대량 생산 가능 |

---

## 1. 현재 상태 분석

### 1.1 현재 생성 플로우
```
소스 선택 → 내용 확인(소스 리뷰) → 슬라이드 수 선택 [5,7,9,11] → 생성
```

### 1.2 현재 한계
- **생성 스타일 커스터마이징 없음**: `getPlanningPrompt()`가 하드코딩된 프롬프트 사용 (톤, 말투, 글자수 등 조절 불가)
- **슬라이드 수 제한**: 4개 고정 옵션 `[5, 7, 9, 11]`만 가능
- **기존 `stylePresets` 테이블**: 비주얼 스타일(색상/폰트/크기)만 저장. 생성 스타일과는 별개

### 1.3 관련 코드 현황
| 파일 | 역할 | 변경 필요 |
|------|------|-----------|
| `convex/schema.ts` | DB 스키마 | 새 테이블 추가 |
| `convex/actions/generate.ts` | AI 생성 로직 | 프롬프트에 스타일 파라미터 주입 |
| `src/app/(app)/create/page.tsx` | 생성 페이지 UI | 스타일 선택 UI + 슬라이드 수 자유 입력 |
| `convex/stylePresets.ts` | 비주얼 프리셋 CRUD | 참고만 (별도 테이블 사용) |

---

## 2. 목표 상태

### 2.1 변경된 생성 플로우
```
소스 선택 → 내용 확인 → [내 스타일 선택/새로 만들기] + 슬라이드 수(1~10) → 생성
```

### 2.2 핵심 기능

#### F1: Generation Style Preset (생성 스타일 프리셋)
- **저장 항목**:
  - `name`: 프리셋 이름 (예: "전문적인 IT 뉴스", "캐주얼 트렌드")
  - `tone`: 말투/톤 (예: "전문적", "친근한", "유머러스한", "격식체")
  - `writingStyle`: 글쓰기 스타일 (예: "간결체", "설명체", "대화체")
  - `contentLength`: 글자수 가이드 (예: "짧게", "보통", "길게" 또는 커스텀 숫자)
  - `targetAudience`: 대상 독자 (예: "일반인", "전문가", "MZ세대")
  - `additionalInstructions`: 추가 지시사항 (자유 텍스트, 선택)
- **CRUD**: 생성, 조회, 수정, 삭제
- **영구 저장**: Convex DB `generationPresets` 테이블
- **개수 제한**: 사용자당 최대 20개

#### F2: Flexible Slide Count (유연한 슬라이드 수)
- 1~10장 자유 선택 (슬라이더 또는 숫자 입력)
- 기존 고정 버튼 `[5, 7, 9, 11]` 제거
- 프롬프트에서 슬라이드 수에 따른 구조 자동 조정 (1장이면 커버만, 2장이면 커버+마무리)

---

## 3. 기술 설계 개요

### 3.1 새 Convex 테이블: `generationPresets`

```typescript
generationPresets: defineTable({
  userId: v.id("users"),
  name: v.string(),
  tone: v.string(),              // "전문적" | "친근한" | "유머러스한" | 커스텀
  writingStyle: v.string(),      // "간결체" | "설명체" | "대화체" | 커스텀
  contentLength: v.string(),     // "짧게" | "보통" | "길게" | 커스텀
  targetAudience: v.optional(v.string()),
  additionalInstructions: v.optional(v.string()),
  isDefault: v.optional(v.boolean()),  // 기본 프리셋 마킹
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_userId", ["userId"])
```

### 3.2 생성 액션 변경: `generateCardNews`

```
기존: generateCardNews({ projectId, slideCount })
변경: generateCardNews({ projectId, slideCount, presetId? })
```

- `presetId`가 있으면 DB에서 프리셋 로드 → 프롬프트에 스타일 지시 주입
- 없으면 기본 스타일로 생성 (하위 호환)

### 3.3 프롬프트 변경: `getPlanningPrompt`

```
기존: 하드코딩된 에디터 역할
변경: 톤/말투/글자수/대상 독자를 프롬프트에 동적 삽입

예시:
"당신은 인스타그램 카드뉴스 전문 에디터입니다.
 말투: {tone}으로 작성하세요.
 글쓰기 스타일: {writingStyle}
 각 슬라이드 본문 길이: {contentLength}
 대상 독자: {targetAudience}
 추가 지시: {additionalInstructions}"
```

### 3.4 슬라이드 수 로직 변경

| 슬라이드 수 | 구조 |
|-------------|------|
| 1장 | 커버만 (핵심 메시지 1개) |
| 2장 | 커버 + 마무리 |
| 3장 | 커버 + 내용 1 + 마무리 |
| 4~10장 | 커버 + 내용 N + 마무리 |

---

## 4. UI 변경 계획

### 4.1 Create 페이지 - 소스 리뷰 후 생성 단계

```
┌─────────────────────────────────────┐
│  내 스타일                           │
│  ┌─────────┐ ┌─────────┐ ┌──────┐  │
│  │전문 IT   │ │캐주얼    │ │ + 새로│  │
│  │뉴스 ✓   │ │트렌드    │ │ 만들기│  │
│  └─────────┘ └─────────┘ └──────┘  │
│                                     │
│  슬라이드 수: [━━━━●━━━━━] 7장      │
│               1              10     │
│                                     │
│  [카드뉴스 생성하기]                  │
└─────────────────────────────────────┘
```

### 4.2 스타일 생성/편집 모달

```
┌─────────────────────────────────────┐
│  내 스타일 만들기              [X]   │
│                                     │
│  이름: [전문적인 IT 뉴스          ]  │
│                                     │
│  말투:  ○ 전문적  ● 친근한  ○ 유머   │
│         ○ 격식체  ○ 직접 입력       │
│                                     │
│  글쓰기 스타일:                      │
│         ● 간결체  ○ 설명체  ○ 대화체 │
│                                     │
│  글자수: ○ 짧게  ● 보통  ○ 길게     │
│                                     │
│  대상 독자: [일반인              ]   │
│                                     │
│  추가 지시사항 (선택):               │
│  [                               ]  │
│                                     │
│  [저장하기]                          │
└─────────────────────────────────────┘
```

---

## 5. 구현 순서

### Phase 1: Backend (Convex)
1. `convex/schema.ts` - `generationPresets` 테이블 추가
2. `convex/generationPresets.ts` - CRUD (list, save, update, remove, setDefault)
3. `convex/actions/generate.ts` - `presetId` 파라미터 추가 + 프롬프트 동적 생성

### Phase 2: Frontend (Create Page)
4. `src/app/(app)/create/page.tsx` - 슬라이드 수 슬라이더 (1~10) 교체
5. `src/app/(app)/create/page.tsx` - 스타일 프리셋 선택 UI 추가
6. 스타일 생성/편집 모달 컴포넌트

### Phase 3: Polish
7. 기본 프리셋 마킹 기능
8. 프리셋 없이 생성 시 하위 호환 유지
9. 빌드/타입 검증

---

## 6. 리스크 및 고려사항

| 리스크 | 대응 |
|--------|------|
| 프롬프트 품질 저하 (스타일 조합에 따라) | 톤/스타일 옵션을 사전 정의된 값으로 제한 + 자유 입력 옵션 |
| 1장 슬라이드 시 구조 문제 | 슬라이드 수별 프롬프트 분기 처리 |
| 기존 프로젝트 하위 호환 | `presetId`를 optional로 처리, 없으면 기본 동작 |
| 프리셋 과다 생성 | 사용자당 최대 20개 제한 |

---

## 7. 성공 기준

- [ ] 생성 스타일 프리셋 CRUD 동작 (생성, 조회, 수정, 삭제)
- [ ] 프리셋 선택 시 해당 톤/말투/글자수가 생성 결과에 반영됨
- [ ] 슬라이드 수 1~10장 자유 선택 가능
- [ ] 기존 프리셋 없이도 생성 가능 (하위 호환)
- [ ] 빌드 에러 없음
