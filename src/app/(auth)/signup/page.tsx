"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import Logo from "@/components/layout/Logo";

export default function SignupPage() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    setIsLoading(true);
    try {
      await signIn("password", { email, password, flow: "signUp" });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      await signIn("google");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google 가입에 실패했습니다.");
    }
  };

  const passwordStrength = (() => {
    if (!password) return null;
    if (password.length < 6) return { level: 1, label: "약함", color: "#ef4444" };
    if (password.length < 10) return { level: 2, label: "보통", color: "#f59e0b" };
    return { level: 3, label: "강함", color: "#4ae3c0" };
  })();

  return (
    <div className="min-h-screen flex">
      {/* Left: Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12">
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #11998e 0%, #38ef7d 60%, #0f4c39 100%)",
          }}
        />
        <div
          className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, #ffffff, transparent)" }}
        />
        <div
          className="absolute bottom-1/4 left-1/4 w-48 h-48 rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, #4ae3c0, transparent)" }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <Logo href="/signup" size="md" />
        </div>

        {/* Center */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            오늘부터 시작하는
            <br />
            <span className="text-white/80">콘텐츠 자동화</span>
          </h2>
          <p className="text-white/70 text-lg leading-relaxed mb-10">
            무료 계정으로 시작하세요.
            <br />
            Gemini API Key만 있으면 무제한 생성.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: "1분", label: "카드뉴스 완성" },
              { value: "90%", label: "시간 절약" },
              { value: "무료", label: "기본 플랜" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center">
                <div className="text-2xl font-black text-white mb-1">{stat.value}</div>
                <div className="text-white/60 text-xs">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/30 text-xs">
            신용카드 불필요 · 언제든지 탈퇴 가능
          </p>
        </div>
      </div>

      {/* Right: Signup form */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 bg-background">
        {/* Mobile logo */}
        <div className="lg:hidden mb-10">
          <Logo href="/signup" size="sm" />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-black text-foreground mb-2">무료 계정 만들기</h1>
            <p className="text-muted text-sm">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-accent hover:underline">
                로그인
              </Link>
            </p>
          </div>

          {/* Google OAuth button - prominent */}
          <button
            onClick={handleGoogleSignup}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-border bg-surface hover:bg-surface-hover transition-colors text-foreground text-sm font-semibold mb-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google로 가입하기
          </button>
          <p className="text-center text-xs text-muted mb-6">빠르고 안전한 Google 계정으로 가입 (권장)</p>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted text-xs">또는 이메일로</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="px-4 py-3.5 rounded-xl bg-surface border border-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent/60 focus:bg-surface-hover transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8자 이상"
                required
                className="px-4 py-3.5 rounded-xl bg-surface border border-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent/60 focus:bg-surface-hover transition-colors"
              />
              {/* Password strength indicator */}
              {passwordStrength && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className="h-1 flex-1 rounded-full transition-all"
                        style={{
                          backgroundColor:
                            level <= passwordStrength.level
                              ? passwordStrength.color
                              : "#2a2a2a",
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={`px-4 py-3.5 rounded-xl bg-surface border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:bg-surface-hover transition-colors ${
                  confirmPassword && confirmPassword !== password
                    ? "border-red-500/50 focus:border-red-500/70"
                    : "border-border focus:border-accent/60"
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-accent text-background font-bold text-sm rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  계정 생성 중...
                </span>
              ) : (
                "계정 만들기"
              )}
            </button>

            <p className="text-center text-xs text-muted mt-2">
              가입하면{" "}
              <span className="text-muted/80 underline cursor-pointer">이용약관</span>
              {" "}및{" "}
              <span className="text-muted/80 underline cursor-pointer">개인정보처리방침</span>
              에 동의하게 됩니다.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
