"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { useConvexAuth } from "convex/react";
import Logo from "@/components/layout/Logo";
import { ExternalLink, Zap, Download, PlusCircle, Sparkles, LayoutGrid, Type, Palette, FileDown } from "lucide-react";

export default function Home() {
  const { isAuthenticated } = useConvexAuth();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 bg-background/80 backdrop-blur-md border-b border-border">
        <Logo href="/" size="sm" />
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-semibold bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
            >
              대시보드
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 text-sm font-semibold bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
              >
                무료 시작
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-8 flex flex-col items-center text-center overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-20 blur-3xl"
            style={{
              background: "radial-gradient(ellipse, #c4b5fd 0%, #93c5fd 50%, transparent 80%)",
              animation: "pulse 8s ease-in-out infinite",
            }}
          />
          <div
            className="absolute top-20 -right-20 w-[400px] h-[400px] rounded-full opacity-10 blur-3xl"
            style={{
              background: "radial-gradient(ellipse, #fbcfe8 0%, transparent 70%)",
              animation: "pulse 6s ease-in-out infinite 2s",
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface text-muted text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            AI 자동 카드뉴스 제작 플랫폼
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black text-foreground leading-tight tracking-tight mb-6">
            콘텐츠 제작 시간을
            <br />
            <span className="text-accent">90% 단축</span>하세요
          </h1>

          <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            URL, SNS, 검색, 텍스트 — 어떤 소스든 1분 안에
            <br />
            프로급 카드뉴스로 변환합니다
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="px-8 py-4 bg-accent text-background font-bold text-base rounded-xl hover:bg-accent-hover transition-all hover:scale-105 hover:shadow-lg hover:shadow-accent/20"
            >
              무료로 시작하기
            </Link>
            <Link
              href="#how-it-works"
              className="px-8 py-4 bg-surface border border-border text-foreground font-semibold text-base rounded-xl hover:bg-surface-hover transition-all"
            >
              작동 방식 보기
            </Link>
          </div>

          {/* Social proof */}
          <p className="mt-8 text-sm text-muted">
            신용카드 불필요 · 무료 플랜 영구 제공
          </p>
        </div>

        {/* Hero mockup */}
        <div className="relative z-10 mt-16 w-full max-w-5xl mx-auto">
          <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background">
              <div className="w-3 h-3 rounded-full bg-border" />
              <div className="w-3 h-3 rounded-full bg-border" />
              <div className="w-3 h-3 rounded-full bg-border" />
              <div className="ml-4 flex-1 bg-surface rounded px-3 py-1 text-xs text-muted">
                cardnews.pro/create
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-48">
              {/* Mock source input */}
              <div className="md:col-span-1 rounded-xl border border-border bg-background p-4">
                <p className="text-xs text-muted mb-3 font-medium uppercase tracking-wider">소스 입력</p>
                <div className="flex gap-2 mb-4">
                  {["URL", "SNS", "검색", "텍스트"].map((tab, i) => (
                    <span
                      key={tab}
                      className={`px-2 py-1 rounded text-xs font-medium ${i === 0 ? "bg-accent text-background" : "text-muted"}`}
                    >
                      {tab}
                    </span>
                  ))}
                </div>
                <div className="h-8 rounded-lg bg-surface border border-border flex items-center px-3">
                  <span className="text-xs text-muted">https://example.com/article</span>
                </div>
                <div className="mt-3 h-9 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center">
                  <span className="text-xs text-accent font-semibold">AI 생성 시작</span>
                </div>
              </div>
              {/* Mock card previews */}
              <div className="md:col-span-2 grid grid-cols-3 gap-3">
                {[
                  { bg: "from-[#667eea] to-[#764ba2]", label: "커버" },
                  { bg: "from-[#f093fb] to-[#f5576c]", label: "내용 1" },
                  { bg: "from-[#11998e] to-[#38ef7d]", label: "내용 2" },
                ].map((card) => (
                  <div
                    key={card.label}
                    className={`aspect-[4/5] rounded-xl bg-gradient-to-br ${card.bg} flex items-end p-3`}
                  >
                    <div className="w-full">
                      <div className="h-2 rounded-full bg-white/30 mb-1.5 w-3/4" />
                      <div className="h-1.5 rounded-full bg-white/20 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">워크플로우</p>
            <h2 className="text-4xl font-black text-foreground">3단계로 완성되는 카드뉴스</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            {[
              {
                step: "01",
                title: "소스 입력",
                desc: "URL, SNS 계정, 검색어, 또는 직접 텍스트를 입력하세요. AI가 자동으로 핵심 내용을 추출합니다.",
                icon: <ExternalLink size={24} />,
                color: "#4ae3c0",
              },
              {
                step: "02",
                title: "AI 자동 생성",
                desc: "AI가 내용을 분석하고 최적의 레이아웃으로 카드뉴스를 자동 구성합니다.",
                icon: <Zap size={24} />,
                color: "#667eea",
              },
              {
                step: "03",
                title: "편집 & 내보내기",
                desc: "직관적인 에디터로 세부 조정 후 PNG, ZIP, PDF로 내보내기. 인스타그램 최적화 포맷 지원.",
                icon: <Download size={24} />,
                color: "#f093fb",
              },
            ].map((item: { step: string; title: string; desc: string; icon: ReactNode; color: string }) => (
              <div key={item.step} className="relative group">
                <div className="rounded-2xl border border-border bg-surface p-8 hover:border-border/80 transition-all hover:-translate-y-1 hover:shadow-xl">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                    style={{ backgroundColor: `${item.color}15`, color: item.color }}
                  >
                    {item.icon}
                  </div>
                  <div className="text-xs font-bold text-muted mb-2 tracking-widest">{item.step}</div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-24 px-8 bg-surface/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">기능</p>
            <h2 className="text-4xl font-black text-foreground">프로급 기능, 간단한 사용법</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { title: "4가지 소스 타입", desc: "URL · SNS · 검색 · 텍스트", icon: <PlusCircle size={24} /> },
              { title: "실시간 AI 생성", desc: "생성 과정을 실시간으로 확인", icon: <Sparkles size={24} /> },
              { title: "9가지 레이아웃", desc: "센터 · 바텀 · 스플릿 등", icon: <LayoutGrid size={24} /> },
              { title: "한글 폰트 지원", desc: "Pretendard · 나눔 · G마켓 등", icon: <Type size={24} /> },
              { title: "그라데이션 배경", desc: "선셋 · 오션 · 포레스트 등", icon: <Palette size={24} /> },
              { title: "PNG/ZIP/PDF 내보내기", desc: "인스타 1080×1350 최적화", icon: <FileDown size={24} /> },
            ].map((feat: { title: string; desc: string; icon: ReactNode }) => (
              <div
                key={feat.title}
                className="rounded-xl border border-border bg-background p-6 hover:border-accent/40 transition-all group"
              >
                <div className="mb-4 text-muted group-hover:text-accent transition-colors">
                  {feat.icon}
                </div>
                <h3 className="font-bold text-foreground text-sm mb-1">{feat.title}</h3>
                <p className="text-xs text-muted">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black text-foreground mb-6">
            지금 바로 시작하세요
          </h2>
          <p className="text-lg text-muted mb-10">
            회원가입만 하면 무료로 사용할 수 있습니다.
            <br />
            별도 구독 없이 프로급 카드뉴스를 만드세요.
          </p>
          <Link
            href="/signup"
            className="inline-flex px-10 py-5 bg-accent text-background font-bold text-lg rounded-2xl hover:bg-accent-hover transition-all hover:scale-105 hover:shadow-2xl hover:shadow-accent/30"
          >
            무료로 시작하기 →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-8 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo href="/" size="sm" />
          <p className="text-xs text-muted">
            Made by WithGenie
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
