import type { LayoutTemplate } from "@/types";

export const layouts: LayoutTemplate[] = [
  // Row 1: Top
  {
    id: "top-left",
    name: "좌상단",
    description: "텍스트가 좌측 상단에 배치",
    className: "layout-top-left",
    textPosition: "top-left",
    textAlign: "left",
  },
  {
    id: "top-center",
    name: "상단 중앙",
    description: "텍스트가 상단 중앙에 배치",
    className: "layout-top-center",
    textPosition: "top-center",
    textAlign: "center",
  },
  {
    id: "top-right",
    name: "우상단",
    description: "텍스트가 우측 상단에 배치",
    className: "layout-top-right",
    textPosition: "top-right",
    textAlign: "right",
  },
  // Row 2: Center
  {
    id: "center-left",
    name: "좌측 중앙",
    description: "텍스트가 좌측 중앙에 배치",
    className: "layout-center-left",
    textPosition: "center-left",
    textAlign: "left",
  },
  {
    id: "center",
    name: "중앙",
    description: "텍스트가 중앙에 배치",
    className: "layout-center",
    textPosition: "center",
    textAlign: "center",
  },
  {
    id: "center-right",
    name: "우측 중앙",
    description: "텍스트가 우측 중앙에 배치",
    className: "layout-center-right",
    textPosition: "center-right",
    textAlign: "right",
  },
  // Row 3: Bottom
  {
    id: "bottom-left",
    name: "좌하단",
    description: "텍스트가 좌측 하단에 배치",
    className: "layout-bottom-left",
    textPosition: "bottom-left",
    textAlign: "left",
  },
  {
    id: "bottom-center",
    name: "하단 중앙",
    description: "텍스트가 하단 중앙에 배치",
    className: "layout-bottom-center",
    textPosition: "bottom-center",
    textAlign: "center",
  },
  {
    id: "bottom-right",
    name: "우하단",
    description: "텍스트가 우측 하단에 배치",
    className: "layout-bottom-right",
    textPosition: "bottom-right",
    textAlign: "right",
  },
  // Row 4: Special
  {
    id: "big-title",
    name: "빅 타이틀",
    description: "큰 제목이 중앙에 임팩트있게",
    className: "layout-big-title",
    textPosition: "center",
    textAlign: "center",
  },
  {
    id: "split",
    name: "상하 분할",
    description: "카테고리 상단, 제목 중앙, 부제 하단",
    className: "layout-split",
    textPosition: "center",
    textAlign: "center",
  },
  {
    id: "editorial",
    name: "에디토리얼",
    description: "좌측 정렬 매거진 스타일",
    className: "layout-editorial",
    textPosition: "center-left",
    textAlign: "left",
  },
];
