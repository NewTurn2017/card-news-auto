# Design: Editor UX V2 - Premium Light Theme + Editor Overhaul

> Plan Reference: `docs/01-plan/features/editor-ux-v2.plan.md`

---

## 1. Color Token Specification

### 1.1 CSS Custom Properties (`globals.css :root`)

```css
:root {
  --background: #F0EEE6;
  --foreground: #1A1A1A;
  --accent: #D97757;
  --accent-hover: #C4674A;
  --surface: #FFFFFF;
  --surface-hover: #F7F5EF;
  --border: #E2DFD5;
  --muted: #8C8578;
  --card-width: 1080px;
  --card-height: 1350px;
}
```

### 1.2 Tailwind Theme Mapping (`@theme inline`)

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-surface: var(--surface);
  --color-surface-hover: var(--surface-hover);
  --color-border: var(--border);
  --color-muted: var(--muted);
}
```

### 1.3 Scrollbar (Light)

```css
::-webkit-scrollbar-track { background: var(--background); }
::-webkit-scrollbar-thumb { background: var(--border); }
::-webkit-scrollbar-thumb:hover { background: var(--muted); }
```

### 1.4 Card Slide Text Size Updates

```css
.card-slide .slide-category { font-size: 20px; }  /* was 14px */
.card-slide .slide-subtitle { font-size: 30px; }   /* was 22px */
```

### 1.5 Whitespace Pre-line for Newlines

```css
.card-slide .slide-title,
.card-slide .slide-subtitle,
.card-slide .slide-body {
  white-space: pre-line;
}
```

---

## 2. Component Design

### 2.1 EditorPanel - Accordion Structure

**State**:
```typescript
const [openSection, setOpenSection] = useState<string>("content");
```

**Section Config**:
```typescript
const SECTIONS = [
  { id: "content", label: "콘텐츠", icon: Type },
  { id: "style",   label: "스타일", icon: Palette },
  { id: "layout",  label: "레이아웃", icon: LayoutGrid },
  { id: "image",   label: "이미지", icon: ImageIcon },
] as const;
```

**Layout Structure**:
```
<div className="flex h-full flex-col">
  {/* Sticky Top: Slide Navigation */}
  <div className="sticky top-0 z-10 bg-surface border-b border-border p-4">
    <SlideNavigation ... />
  </div>

  {/* Scrollable Accordion Body */}
  <div className="flex-1 overflow-y-auto p-4 space-y-2">
    {SECTIONS.map(section => (
      <AccordionCard
        key={section.id}
        id={section.id}
        label={section.label}
        icon={section.icon}
        isOpen={openSection === section.id}
        onToggle={() => setOpenSection(
          openSection === section.id ? "" : section.id
        )}
      >
        {/* section content */}
      </AccordionCard>
    ))}
  </div>

  {/* Sticky Bottom: Slide Actions */}
  <div className="sticky bottom-0 bg-surface border-t border-border p-4">
    <SlideActions ... />
  </div>
</div>
```

**AccordionCard Component** (inline, not separate file):
```typescript
function AccordionCard({ id, label, icon: Icon, isOpen, onToggle, children }) {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium
                   text-foreground hover:bg-surface-hover transition-colors"
      >
        <Icon size={16} className="text-muted" />
        <span>{label}</span>
        <ChevronDown
          size={16}
          className={`ml-auto text-muted transition-transform duration-200
                      ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <div className={`transition-all duration-200 ease-out overflow-hidden
                       ${isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="px-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
}
```

---

### 2.2 ContentFields - Textarea Conversion

**Changes**:
- `subtitle`: `<input>` -> `<textarea rows={2}>`
- All textareas: `resize-none` -> `resize-y`
- Input style class: `bg-surface-hover border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20`

```tsx
// category
<input
  type="text"
  value={content.category || ""}
  onChange={(e) => update("category", e.target.value)}
  placeholder="AI & INSIGHT"
  className={inputClass}
/>

// title
<textarea
  value={content.title || ""}
  onChange={(e) => update("title", e.target.value)}
  placeholder="제목을 입력하세요"
  rows={2}
  className={`${inputClass} resize-y`}
/>

// subtitle - CHANGED from input to textarea
<textarea
  value={content.subtitle || ""}
  onChange={(e) => update("subtitle", e.target.value)}
  placeholder="부제를 입력하세요"
  rows={2}
  className={`${inputClass} resize-y`}
/>

// body
<textarea
  value={content.body || ""}
  onChange={(e) => update("body", e.target.value)}
  placeholder="본문을 입력하세요"
  rows={3}
  className={`${inputClass} resize-y`}
/>
```

---

### 2.3 Optimistic UI + Debounce Architecture

**Data Flow**:
```
EditPage
├── localContent: SlideContent (useState)
├── debouncedSave: (content) => void (useRef + setTimeout, 500ms)
├── handleContentChange(content):
│   ├── setLocalContent(content)         // instant UI
│   └── debouncedSave(content)           // delayed mutation
├── useEffect cleanup: flush pending save on unmount
└── useEffect(convexSlide): sync localContent when server data arrives
     (only if no pending local edits)

EditorPanel
├── receives: localContent, onContentChange
├── ContentFields onChange -> onContentChange(content)
└── (no direct mutation calls for content)

CardSlideRenderer
├── receives: slide with localContent merged
└── renders instantly from local state
```

**Implementation in EditPage**:
```typescript
// Local content state for instant preview
const [localContent, setLocalContent] = useState<SlideContent | null>(null);
const pendingRef = useRef(false);
const timerRef = useRef<ReturnType<typeof setTimeout>>();

const handleContentChange = useCallback((content: SlideContent) => {
  setLocalContent(content);
  pendingRef.current = true;

  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = setTimeout(async () => {
    await updateSlideMutation({
      slideId: convexSlide._id,
      content: {
        title: content.title ?? "",
        category: content.category,
        subtitle: content.subtitle,
        body: content.body,
        source: content.source,
      },
    });
    pendingRef.current = false;
  }, 500);
}, [convexSlide?._id, updateSlideMutation]);

// Sync from server when no pending local edits
useEffect(() => {
  if (!pendingRef.current && convexSlide) {
    setLocalContent(convexSlide.content ?? { title: "" });
  }
}, [convexSlide?.content]);

// Flush on unmount or slide change
useEffect(() => {
  return () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    // flush handled by clearing timer - mutation already queued
  };
}, []);

// Build slide for preview using localContent
const previewSlide = {
  ...mapConvexSlide(convexSlide),
  content: localContent ?? convexSlide.content ?? { title: "" },
};
```

---

### 2.4 Export Fix - CORS Filter

**`src/lib/export-png.ts`**:
```typescript
const SLIDE_OPTIONS = {
  width: 1080,
  height: 1350,
  pixelRatio: 1,
  cacheBust: true,
  filter: (node: Element) => {
    if (node instanceof HTMLLinkElement
        && node.rel === 'stylesheet'
        && node.href
        && !node.href.startsWith(window.location.origin)) {
      return false;
    }
    return true;
  },
} as const;
```

**Note**: 카드 슬라이드에서 사용하는 폰트는 `font-family` CSS 속성으로 지정되어 있고, 폰트 CDN link를 filter로 제외해도 시스템에 캐시된 폰트가 사용됨. 완벽한 폰트 재현이 필요하면 추후 `@font-face` inline embedding 추가.

---

### 2.5 Lucide Icon Mapping

**Dependencies**: `lucide-react` (already installed)

#### SlideActions.tsx
```tsx
import { Sparkles, Trash2 } from "lucide-react";
// ✨ -> <Sparkles size={14} />
// 🗑 -> <Trash2 size={14} />
```

#### InstagramFrame.tsx
```tsx
import {
  Heart, MessageCircle, Send, Bookmark,
  Home, Search, Grid3X3, Play, CircleUserRound
} from "lucide-react";
// Action bar: Heart(20), MessageCircle(20), Send(20) | Bookmark(20)
// Bottom nav: Home(20), Search(20), Grid3X3(20), Play(20), CircleUserRound(20)
```

#### PhoneMockup.tsx
```tsx
import { Signal, BatteryMedium, Wifi } from "lucide-react";
// Status bar: Signal(12), Wifi(12), BatteryMedium(14)
```

#### SlideNavigation.tsx
```tsx
import {
  Plus, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight
} from "lucide-react";
// Button size: min-w-11 min-h-11 for touch targets
```

#### EditPage top bar
```tsx
import { RefreshCw } from "lucide-react";
// 🔄 다시 생성 -> <RefreshCw size={14} /> 다시 생성
```

#### ExportModal.tsx
```tsx
import { X } from "lucide-react";
// ✕ -> <X size={16} />
```

---

### 2.6 PhoneMockup Responsive

```tsx
export default function PhoneMockup({ children }: PhoneMockupProps) {
  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <div className="overflow-hidden rounded-[40px] border-[3px] border-zinc-300
                      bg-white shadow-xl">
        {/* Dynamic Island style notch */}
        <div className="flex items-center justify-between bg-white px-6 py-2
                        text-xs text-zinc-800">
          <span className="font-medium">9:41</span>
          <div className="absolute left-1/2 top-2 h-[22px] w-[90px]
                          -translate-x-1/2 rounded-full bg-black" />
          <div className="flex items-center gap-1.5">
            <Signal size={12} />
            <Wifi size={12} />
            <BatteryMedium size={14} />
          </div>
        </div>
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
```

---

### 2.7 SlideNavigation Touch Optimization

```tsx
// Button base class for 44px touch target
const navBtn = "flex items-center justify-center min-w-11 min-h-11 rounded-lg transition-colors";

<div className="flex items-center justify-center gap-1">
  <button onClick={onAdd}
    className={`${navBtn} bg-accent/10 text-accent hover:bg-accent/20`}>
    <Plus size={18} />
  </button>
  <div className="flex items-center gap-1">
    <button onClick={onFirst} disabled={current === 0}
      className={`${navBtn} text-muted hover:text-foreground disabled:opacity-30`}>
      <ChevronsLeft size={18} />
    </button>
    <button onClick={onPrev} disabled={current === 0}
      className={`${navBtn} text-muted hover:text-foreground disabled:opacity-30`}>
      <ChevronLeft size={18} />
    </button>
    <span className="mx-2 rounded-full bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
      {current + 1} / {total}
    </span>
    <button onClick={onNext} disabled={current === total - 1}
      className={`${navBtn} text-muted hover:text-foreground disabled:opacity-30`}>
      <ChevronRight size={18} />
    </button>
    <button onClick={onLast} disabled={current === total - 1}
      className={`${navBtn} text-muted hover:text-foreground disabled:opacity-30`}>
      <ChevronsRight size={18} />
    </button>
  </div>
</div>
```

---

### 2.8 Mobile Responsive Layout

**Breakpoint**: `md` (768px)

**EditPage Structure**:
```tsx
// Mobile tab state
const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

return (
  <div className="flex h-screen flex-col bg-background">
    {/* Top bar - responsive */}
    <div className="flex items-center justify-between border-b border-border px-4 md:px-6 py-3">
      <div className="flex items-center gap-2 text-sm text-muted">
        <button onClick={() => router.push("/dashboard")}
          className="hover:text-foreground">
          <ArrowLeft size={16} />
        </button>
        <span className="hidden md:inline">카드뉴스 만들기</span>
        <span className="hidden md:inline">›</span>
        <span className="text-foreground truncate max-w-[150px] md:max-w-none">
          {project.title}
        </span>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <span className="hidden md:inline-flex rounded-lg border border-border
                         px-3 py-1.5 text-xs text-muted">
          자동 저장
        </span>
        <button className="rounded-lg border border-border p-2 md:px-4 md:py-1.5
                           text-sm text-muted hover:bg-surface-hover hover:text-foreground">
          <RefreshCw size={14} className="md:mr-1.5 md:inline" />
          <span className="hidden md:inline">다시 생성</span>
        </button>
        <ExportButton ... />
      </div>
    </div>

    {/* Mobile Tab Switcher */}
    <div className="flex md:hidden border-b border-border">
      <button
        onClick={() => setMobileTab("edit")}
        className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors
          ${mobileTab === "edit"
            ? "text-accent border-b-2 border-accent"
            : "text-muted"}`}
      >
        편집
      </button>
      <button
        onClick={() => setMobileTab("preview")}
        className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors
          ${mobileTab === "preview"
            ? "text-accent border-b-2 border-accent"
            : "text-muted"}`}
      >
        미리보기
      </button>
    </div>

    {/* Main Content */}
    <div className="flex flex-1 overflow-hidden">
      {/* Editor - full width mobile, 420px desktop */}
      <div className={`w-full md:w-[420px] shrink-0 border-r border-border overflow-y-auto
                       ${mobileTab !== "edit" ? "hidden md:block" : ""}`}>
        <EditorPanel ... />
      </div>

      {/* Preview - full width mobile, flex-1 desktop */}
      <div className={`flex flex-1 flex-col items-center justify-center gap-4
                       bg-background p-4 md:p-8
                       ${mobileTab !== "preview" ? "hidden md:flex" : ""}`}>
        <PhoneMockup>...</PhoneMockup>
        <SlideNavigation ... />
      </div>
    </div>
  </div>
);
```

---

## 3. File Change Summary

| File | Change Type | Task |
|------|-------------|------|
| `src/app/globals.css` | Modify | TASK-1,3,4 |
| `src/components/editor/EditorPanel.tsx` | Major rewrite | TASK-2,5 |
| `src/components/editor/ContentFields.tsx` | Modify | TASK-3 |
| `src/components/editor/SlideNavigation.tsx` | Rewrite | TASK-7,8 |
| `src/components/editor/SlideActions.tsx` | Modify | TASK-7 |
| `src/components/preview/CardSlideRenderer.tsx` | Minor | TASK-3 |
| `src/components/preview/PhoneMockup.tsx` | Rewrite | TASK-7,8 |
| `src/components/preview/InstagramFrame.tsx` | Modify | TASK-7 |
| `src/components/export/ExportModal.tsx` | Minor | TASK-7 |
| `src/lib/export-png.ts` | Modify | TASK-6 |
| `src/app/(app)/edit/[id]/page.tsx` | Major rewrite | TASK-5,7,9 |

## 4. Implementation Order (Dependency-Aware)

```
Step 1: globals.css (theme + text size + whitespace)
Step 2: export-png.ts (CORS fix)
Step 3: ContentFields.tsx (textarea)
Step 4: SlideNavigation.tsx (lucide + touch)
Step 5: SlideActions.tsx (lucide)
Step 6: PhoneMockup.tsx (lucide + responsive)
Step 7: InstagramFrame.tsx (lucide)
Step 8: ExportModal.tsx (lucide)
Step 9: EditorPanel.tsx (accordion + debounce integration)
Step 10: edit/[id]/page.tsx (optimistic UI + mobile responsive)
Step 11: CardSlideRenderer.tsx (whitespace already from CSS, verify)
```
