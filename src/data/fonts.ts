export interface KoreanFont {
  id: string;
  name: string;
  family: string;
  category: "sans" | "serif" | "display" | "handwriting";
  weights: number[];
  cdnUrl?: string;
}

export const KOREAN_FONTS: KoreanFont[] = [
  // ── Sans-serif ──────────────────────────────
  {
    id: "pretendard",
    name: "Pretendard",
    family: "'Pretendard', sans-serif",
    category: "sans",
    weights: [400, 600, 700],
    cdnUrl: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css",
  },
  {
    id: "noto-sans-kr",
    name: "Noto Sans KR",
    family: "'Noto Sans KR', sans-serif",
    category: "sans",
    weights: [400, 500, 700],
    cdnUrl: "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800&display=swap",
  },
  {
    id: "nanum-gothic",
    name: "나눔고딕",
    family: "'Nanum Gothic', sans-serif",
    category: "sans",
    weights: [400, 700, 800],
    cdnUrl: "https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap",
  },
  {
    id: "nanum-square",
    name: "나눔스퀘어",
    family: "'NanumSquare', sans-serif",
    category: "sans",
    weights: [400, 700, 800],
    cdnUrl: "https://cdn.jsdelivr.net/gh/moonspam/NanumSquare@2.0/nanumsquare.css",
  },
  {
    id: "gmarket-sans",
    name: "G마켓 산스",
    family: "'GmarketSans', sans-serif",
    category: "sans",
    weights: [300, 500, 700],
    cdnUrl: "https://cdn.jsdelivr.net/gh/webfontworld/gmarket/GmarketSans.css",
  },
  {
    id: "spoqa-han-sans",
    name: "스포카 한 산스",
    family: "'Spoqa Han Sans Neo', sans-serif",
    category: "sans",
    weights: [400, 500, 700],
    cdnUrl: "https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/css/SpoqaHanSansNeo.css",
  },
  {
    id: "wanted-sans",
    name: "Wanted Sans",
    family: "'WantedSans', sans-serif",
    category: "sans",
    weights: [400, 600, 700],
    cdnUrl: "https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.css",
  },
  {
    id: "gothic-a1",
    name: "Gothic A1",
    family: "'Gothic A1', sans-serif",
    category: "sans",
    weights: [400, 600, 700, 800],
    cdnUrl: "https://fonts.googleapis.com/css2?family=Gothic+A1:wght@400;600;700;800&display=swap",
  },
  {
    id: "ibm-plex-sans-kr",
    name: "IBM Plex Sans KR",
    family: "'IBM Plex Sans KR', sans-serif",
    category: "sans",
    weights: [400, 500, 600, 700],
    cdnUrl: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap",
  },
  {
    id: "suit",
    name: "SUIT",
    family: "'SUIT', sans-serif",
    category: "sans",
    weights: [400, 600, 700, 800],
    cdnUrl: "https://cdn.jsdelivr.net/gh/sunn-us/SUIT/fonts/variable/woff2/SUIT-Variable.css",
  },

  // ── Serif ───────────────────────────────────
  {
    id: "nanum-myeongjo",
    name: "나눔명조",
    family: "'Nanum Myeongjo', serif",
    category: "serif",
    weights: [400, 700, 800],
    cdnUrl: "https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap",
  },
  {
    id: "noto-serif-kr",
    name: "Noto Serif KR",
    family: "'Noto Serif KR', serif",
    category: "serif",
    weights: [400, 600, 700],
    cdnUrl: "https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&display=swap",
  },
  {
    id: "gowun-batang",
    name: "고운바탕",
    family: "'Gowun Batang', serif",
    category: "serif",
    weights: [400, 700],
    cdnUrl: "https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap",
  },
  {
    id: "song-myung",
    name: "송명",
    family: "'Song Myung', serif",
    category: "serif",
    weights: [400],
    cdnUrl: "https://fonts.googleapis.com/css2?family=Song+Myung&display=swap",
  },
  {
    id: "maruburi",
    name: "마루 부리",
    family: "'MaruBuri', serif",
    category: "serif",
    weights: [400, 700],
    cdnUrl: "https://cdn.jsdelivr.net/gh/webfontworld/MaruBuri/MaruBuri.css",
  },

  // ── Display (임팩트/타이틀) ──────────────────
  {
    id: "black-han-sans",
    name: "블랙한산스",
    family: "'Black Han Sans', sans-serif",
    category: "display",
    weights: [400],
    cdnUrl: "https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap",
  },
  {
    id: "do-hyeon",
    name: "도현",
    family: "'Do Hyeon', sans-serif",
    category: "display",
    weights: [400],
    cdnUrl: "https://fonts.googleapis.com/css2?family=Do+Hyeon&display=swap",
  },
  {
    id: "jua",
    name: "주아",
    family: "'Jua', sans-serif",
    category: "display",
    weights: [400],
    cdnUrl: "https://fonts.googleapis.com/css2?family=Jua&display=swap",
  },
  {
    id: "sunflower",
    name: "해바라기",
    family: "'Sunflower', sans-serif",
    category: "display",
    weights: [300, 500, 700],
    cdnUrl: "https://fonts.googleapis.com/css2?family=Sunflower:wght@300;500;700&display=swap",
  },
  {
    id: "gowun-dodum",
    name: "고운돋움",
    family: "'Gowun Dodum', sans-serif",
    category: "display",
    weights: [400],
    cdnUrl: "https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap",
  },

  // ── Handwriting (손글씨) ────────────────────
  {
    id: "nanum-pen",
    name: "나눔펜",
    family: "'Nanum Pen Script', cursive",
    category: "handwriting",
    weights: [400],
    cdnUrl: "https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&display=swap",
  },
  {
    id: "gamja-flower",
    name: "감자꽃",
    family: "'Gamja Flower', cursive",
    category: "handwriting",
    weights: [400],
    cdnUrl: "https://fonts.googleapis.com/css2?family=Gamja+Flower&display=swap",
  },
  {
    id: "poor-story",
    name: "푸어스토리",
    family: "'Poor Story', cursive",
    category: "handwriting",
    weights: [400],
    cdnUrl: "https://fonts.googleapis.com/css2?family=Poor+Story&display=swap",
  },
  {
    id: "hi-melody",
    name: "하이멜로디",
    family: "'Hi Melody', cursive",
    category: "handwriting",
    weights: [400],
    cdnUrl: "https://fonts.googleapis.com/css2?family=Hi+Melody&display=swap",
  },
  {
    id: "gaegu",
    name: "개구",
    family: "'Gaegu', cursive",
    category: "handwriting",
    weights: [300, 400, 700],
    cdnUrl: "https://fonts.googleapis.com/css2?family=Gaegu:wght@300;400;700&display=swap",
  },
];

export const DEFAULT_FONT_ID = "pretendard";

export const FONT_CATEGORIES = [
  { id: "sans", label: "고딕" },
  { id: "serif", label: "명조" },
  { id: "display", label: "타이틀" },
  { id: "handwriting", label: "손글씨" },
] as const;

export function getFontById(id: string): KoreanFont {
  return KOREAN_FONTS.find((f) => f.id === id) ?? KOREAN_FONTS[0];
}

function normalizeFontFamily(family: string): string {
  return family.replace(/['"]/g, "").replace(/\s*,\s*/g, ", ").trim();
}

export function getFontByFamily(family: string): KoreanFont | undefined {
  const target = normalizeFontFamily(family);
  return KOREAN_FONTS.find((f) => normalizeFontFamily(f.family) === target);
}
