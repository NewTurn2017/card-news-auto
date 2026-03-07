function createBaseSlides() {
  return [
    {
      slideRef: "slide-1",
      type: "cover",
      layoutId: "center",
      content: {
        category: "AI & INSIGHT",
        title: "AI가 바꾸는 콘텐츠 제작 속도",
        subtitle: "10분 걸리던 작업을 1분으로",
        body: "자료 수집부터 카드뉴스 초안 완성까지 자동화가 가능해졌습니다.",
      },
      style: {
        bgType: "gradient",
        gradientFrom: "#667eea",
        gradientTo: "#764ba2",
        textColor: "#ffffff",
        accentColor: "#4ae3c0",
        fontFamily: "'Pretendard', sans-serif",
      },
      image: null,
    },
    {
      slideRef: "slide-2",
      type: "content",
      layoutId: "center-left",
      content: {
        category: "AI & INSIGHT",
        title: "생성은 빨라졌지만 편집은 아직 느리다",
        subtitle: "마지막 손질이 여전히 병목입니다",
        body: "톤 조정, 제목 다듬기, 강조색 변경, 이미지 정리 같은 작업은 여전히 수동 UI 조작에 의존합니다.",
      },
      style: {
        bgType: "solid",
        bgColor: "#0f0f0f",
        textColor: "#ffffff",
        accentColor: "#4ae3c0",
        fontFamily: "'Pretendard', sans-serif",
        bodyLineHeight: 1.45,
      },
      image: {
        externalUrl: "https://images.example.com/editor-bottleneck.jpg",
        opacity: 45,
        size: 110,
        fit: "cover",
      },
    },
    {
      slideRef: "slide-3",
      type: "content",
      layoutId: "editorial",
      content: {
        category: "AI & INSIGHT",
        title: "대화형 편집이 필요한 이유",
        subtitle: "명령형 인터페이스가 더 빠를 수 있습니다",
        body: "사용자는 더 미니멀하게, 더 고급스럽게, 더 짧게 같은 의도를 말하고 결과를 검토한 뒤 적용하고 싶어합니다.",
      },
      style: {
        bgType: "solid",
        bgColor: "#f5f0e8",
        textColor: "#1f172a",
        accentColor: "#b8860b",
        fontFamily: "'MaruBuri', serif",
      },
      image: null,
    },
  ];
}

function createProjectContext() {
  return {
    projectId: "project-demo",
    projectTitle: "AI Chat Auto Edit MVP",
    currentSlideRef: "slide-2",
    slides: createBaseSlides(),
  };
}

export const chatEditEvalCases = [
  {
    id: "title-impact-current",
    description: "현재 슬라이드 제목만 더 짧고 강하게 바꾸기",
    instruction: "현재 슬라이드 제목을 더 짧고 임팩트 있게 바꿔줘. 다른 건 그대로 둬.",
    scope: "current_slide",
    selectedField: null,
    projectContext: createProjectContext(),
    expectations: {
      expectedScope: "current_slide",
      requiredOperationTypes: ["update_content"],
      forbiddenOperationTypes: ["apply_style_to_all"],
      allowedSlideRefs: ["current", "slide-2"],
      mustTouchFields: ["title"],
    },
  },
  {
    id: "luxury-minimal-current",
    description: "현재 슬라이드를 다크하고 럭셔리한 톤으로",
    instruction:
      "현재 슬라이드를 더 다크하고 럭셔리하게 바꿔줘. 너무 화려하지 말고 미니멀한 분위기로 정리해.",
    scope: "current_slide",
    selectedField: null,
    projectContext: createProjectContext(),
    expectations: {
      expectedScope: "current_slide",
      requiredOperationTypes: ["update_style"],
      allowedSlideRefs: ["current", "slide-2"],
    },
  },
  {
    id: "layout-center-slide-2",
    description: "2번 슬라이드를 중앙형 레이아웃으로 재배치",
    instruction:
      "2번 슬라이드를 더 메시지 중심으로 보이게 중앙 정렬 느낌으로 바꿔줘.",
    scope: "current_slide",
    selectedField: null,
    projectContext: createProjectContext(),
    expectations: {
      expectedScope: "current_slide",
      requiredOperationTypes: ["update_layout"],
      allowedSlideRefs: ["current", "slide-2"],
    },
  },
  {
    id: "remove-image-current",
    description: "현재 슬라이드 배경 이미지 제거",
    instruction:
      "배경 이미지는 제거하고 텍스트 중심으로 정리해줘. 가독성이 더 좋아야 해.",
    scope: "current_slide",
    selectedField: null,
    projectContext: createProjectContext(),
    expectations: {
      expectedScope: "current_slide",
      requiredOperationTypes: ["update_image"],
      allowedSlideRefs: ["current", "slide-2"],
    },
  },
  {
    id: "selected-body-readability",
    description: "선택된 본문만 가독성 좋게 수정",
    instruction:
      "선택한 본문만 더 읽기 쉽게 다듬고 줄 간격도 조금 넓혀줘. 나머지 요소는 그대로.",
    scope: "selected_text",
    selectedField: "body",
    projectContext: createProjectContext(),
    expectations: {
      expectedScope: "selected_text",
      requiredOperationTypes: ["update_content", "update_style"],
      forbiddenOperationTypes: ["apply_style_to_all"],
      allowedSlideRefs: ["current", "slide-2"],
      mustTouchFields: ["body"],
    },
  },
  {
    id: "all-slides-luxury-theme",
    description: "전체 슬라이드 톤 통일",
    instruction:
      "전체 카드뉴스를 통일감 있게 더 고급스럽고 브랜드 발표 자료처럼 정리해줘. 카피는 크게 건드리지 말고 비주얼 위주로.",
    scope: "all_slides",
    selectedField: null,
    projectContext: createProjectContext(),
    expectations: {
      expectedScope: "all_slides",
      requiredOperationTypes: ["apply_style_to_all"],
      allowedSlideRefs: ["all", "current", "slide-1", "slide-2", "slide-3"],
    },
  },
  {
    id: "accent-color-slide-2",
    description: "현재 슬라이드 강조색만 변경",
    instruction:
      "2번 슬라이드 강조색을 청록보다 조금 더 고급스러운 골드 계열 느낌으로 바꿔줘.",
    scope: "current_slide",
    selectedField: null,
    projectContext: createProjectContext(),
    expectations: {
      expectedScope: "current_slide",
      requiredOperationTypes: ["update_style"],
      allowedSlideRefs: ["current", "slide-2"],
    },
  },
  {
    id: "minimal-safe-ambiguous",
    description: "모호한 요청에서 최소 수정 전략 확인",
    instruction: "전체적으로 좀 더 세련되게.",
    scope: "current_slide",
    selectedField: null,
    projectContext: createProjectContext(),
    expectations: {
      expectedScope: "current_slide",
      allowedSlideRefs: ["current", "slide-2"],
    },
  },
];
