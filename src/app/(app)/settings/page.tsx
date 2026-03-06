"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { Zap, UserCircle } from "lucide-react";

export default function SettingsPage() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const hasApiKey = useQuery(api.userProfiles.hasApiKey);
  const saveApiKeyAction = useAction(api.actions.apiKeys.saveApiKey);
  const deleteApiKeyMutation = useMutation(api.userProfiles.deleteApiKey);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const currentUser = useQuery(api.userProfiles.me);

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveApiKeyAction({ apiKey });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save API key:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 md:px-8 py-4 md:py-5">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-lg md:text-xl font-black text-foreground">설정</h1>
          <p className="text-xs md:text-sm text-muted mt-0.5">API Key 및 계정 관리</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-8 flex flex-col gap-6 md:gap-8">
        {/* API Key Section */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center text-accent">
              <Zap size={16} />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-base">Gemini API Key</h2>
              <p className="text-xs text-muted">AI 카드뉴스 생성에 사용됩니다. AES-256 암호화 저장.</p>
            </div>
            {hasApiKey && (
              <span className="ml-auto px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold border border-accent/30">
                등록됨
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4 md:p-6">
            {hasApiKey ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-background border border-border">
                  <span className="text-sm text-foreground flex-1 font-mono tracking-widest">
                    {apiKeyVisible ? "AIza••••••••••••••••••••••••••••••••••••••" : "••••••••••••••••••••••••••••••••••••••••"}
                  </span>
                  <button
                    onClick={() => setApiKeyVisible(!apiKeyVisible)}
                    className="text-xs text-muted hover:text-foreground transition-colors px-2 py-1 rounded"
                  >
                    {apiKeyVisible ? "숨기기" : "보기"}
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      if (!confirm("API Key를 삭제하시겠습니까?")) return;
                      try {
                        await deleteApiKeyMutation();
                      } catch (err) {
                        console.error("Failed to delete API key:", err);
                      }
                    }}
                    className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 transition-colors"
                  >
                    키 삭제
                  </button>
                  <button
                    onClick={() => {
                      // TODO: open edit mode
                    }}
                    className="px-4 py-2 text-sm text-muted border border-border rounded-xl hover:bg-surface-hover hover:text-foreground transition-colors"
                  >
                    변경
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveApiKey} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted">
                    Google AI Studio에서 발급받은 Gemini API Key를 입력하세요.
                    키는 서버에서 암호화되어 저장됩니다.
                  </p>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline w-fit"
                  >
                    Google AI Studio에서 발급받기 →
                  </a>
                </div>

                <div className="relative">
                  <input
                    type={apiKeyVisible ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-4 py-3.5 pr-20 rounded-xl bg-background border border-border text-foreground text-sm font-mono placeholder:text-muted/50 focus:outline-none focus:border-accent/60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setApiKeyVisible(!apiKeyVisible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-foreground transition-colors px-2 py-1 rounded"
                  >
                    {apiKeyVisible ? "숨기기" : "보기"}
                  </button>
                </div>

                {saveSuccess && (
                  <div className="px-4 py-3 rounded-xl bg-accent/10 border border-accent/30 text-accent text-sm">
                    API Key가 안전하게 저장되었습니다.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSaving || !apiKey}
                  className="self-start px-6 py-2.5 bg-accent text-background font-bold text-sm rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                      저장 중...
                    </span>
                  ) : (
                    "API Key 저장"
                  )}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Account section */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-muted">
              <UserCircle size={16} />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-base">계정</h2>
              <p className="text-xs text-muted">로그아웃 및 계정 관리</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4 md:p-6">
            <div className="flex items-center gap-4 mb-6">
              {currentUser?.image ? (
                <img
                  src={currentUser.image}
                  alt="프로필"
                  className="w-10 h-10 rounded-full border border-accent/30 object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-bold">
                  {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {currentUser?.name || "사용자"}
                </p>
                <p className="text-xs text-muted">
                  {currentUser?.email || "로딩 중..."}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2.5 text-sm text-muted border border-border rounded-xl hover:bg-surface-hover hover:text-foreground transition-colors"
            >
              로그아웃
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
