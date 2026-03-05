import Link from "next/link";

export default function Home() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">카드뉴스 만들기</h1>
      <p className="text-muted">
        텍스트를 입력하면 AI가 자동으로 카드뉴스를 만들어드립니다
      </p>
      <Link
        href="/create"
        className="mt-4 rounded-lg bg-accent px-6 py-3 font-semibold text-background transition-colors hover:bg-accent-hover"
      >
        + 새 카드뉴스 만들기
      </Link>
    </div>
  );
}
