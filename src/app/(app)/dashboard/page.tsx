"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Copy, LayoutGrid, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import CardSlideRenderer from "@/components/preview/CardSlideRenderer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CardSlide } from "@/types";

const SOURCE_LABELS: Record<string, string> = {
  url: "URL",
  youtube: "YouTube",
  sns: "SNS",
  search: "검색",
  text: "텍스트",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: "완료", color: "#4ae3c0", bg: "rgba(74,227,192,0.1)" },
  draft: { label: "초안", color: "#888", bg: "rgba(136,136,136,0.1)" },
  generating: { label: "생성 중", color: "#667eea", bg: "rgba(102,126,234,0.1)" },
  collecting: { label: "수집 중", color: "#f093fb", bg: "rgba(240,147,251,0.1)" },
};

const THUMBNAIL_GRADIENTS = [
  "from-[#667eea] to-[#764ba2]",
  "from-[#f093fb] to-[#f5576c]",
  "from-[#11998e] to-[#38ef7d]",
  "from-[#0f0c29] to-[#302b63]",
  "from-[#fc4a1a] to-[#f7b733]",
  "from-[#1a1a2e] to-[#16213e]",
];

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function mapSlideToThumbnailSlide(firstSlide: Doc<"slides">): CardSlide {
  return {
    id: firstSlide._id,
    order: firstSlide.order,
    type: firstSlide.type,
    layoutId: firstSlide.layoutId,
    colorPreset: "custom",
    fontFamily: firstSlide.style.fontFamily,
    content: firstSlide.content,
    style: firstSlide.style,
    image: firstSlide.image
      ? {
          url: firstSlide.image.externalUrl ?? "",
          opacity: firstSlide.image.opacity,
          position: firstSlide.image.position,
          size: firstSlide.image.size,
          fit: firstSlide.image.fit,
        }
      : undefined,
    overlays: firstSlide.overlays?.map((overlay) => ({
      assetId: overlay.assetId,
      x: overlay.x,
      y: overlay.y,
      width: overlay.width,
      opacity: overlay.opacity,
    })),
    htmlContent: firstSlide.htmlContent ?? "",
  };
}

function ProjectThumbnail({ projectId, gradient }: { projectId: Id<"projects">; gradient: string }) {
  const firstSlide = useQuery(api.slides.getFirstSlide, { projectId });
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / 1080);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (firstSlide === undefined) {
    return (
      <div ref={containerRef} className={`absolute inset-0 bg-gradient-to-br ${gradient} animate-pulse`} />
    );
  }

  if (!firstSlide) {
    return (
      <div ref={containerRef} className={`absolute inset-0 bg-gradient-to-br ${gradient}`}>
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <div className="h-2 rounded-full bg-white/30 mb-2 w-3/4" />
          <div className="h-1.5 rounded-full bg-white/20 w-1/2 mb-1" />
          <div className="h-1.5 rounded-full bg-white/20 w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {scale > 0 && (
        <div
          className="origin-top-left"
          style={{ transform: `scale(${scale})`, width: 1080, height: 1350 }}
        >
          <CardSlideRenderer slide={mapSlideToThumbnailSlide(firstSlide)} />
        </div>
      )}
    </div>
  );
}

function ProjectActionDialog({
  children,
  onClose,
  closeDisabled = false,
}: {
  children: React.ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeDisabled ? undefined : onClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function EditTitleModal({
  initialTitle,
  onConfirm,
  onCancel,
  isSaving,
}: {
  initialTitle: string;
  onConfirm: (title: string) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);
  const trimmedTitle = title.trim();
  const isSubmitDisabled = trimmedTitle.length === 0 || trimmedTitle === initialTitle.trim();

  return (
    <ProjectActionDialog onClose={onCancel} closeDisabled={isSaving}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (isSubmitDisabled) return;
          onConfirm(trimmedTitle);
        }}
      >
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Pencil size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-foreground">프로젝트 제목 수정</h3>
            <p className="mt-1 text-sm text-muted">
              대시보드와 편집 화면에 표시되는 제목을 변경합니다.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="project-title" className="text-xs font-semibold text-muted">
            프로젝트 제목
          </label>
          <input
            id="project-title"
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="프로젝트 제목을 입력하세요"
            className="h-11 rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent"
          />
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
            disabled={isSaving}
          >
            취소
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitDisabled || isSaving}>
            {isSaving ? (
              <>
                <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                저장 중...
              </>
            ) : (
              "저장"
            )}
          </Button>
        </div>
      </form>
    </ProjectActionDialog>
  );
}

function DeleteModal({
  projectTitle,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  projectTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <ProjectActionDialog onClose={onCancel} closeDisabled={isDeleting}>
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
          <Trash2 size={20} />
        </div>
        <h3 className="mb-1 text-lg font-bold text-foreground">프로젝트 삭제</h3>
        <p className="mb-6 text-sm text-muted">
          <span className="font-semibold text-foreground">{projectTitle}</span>
          <br />
          프로젝트와 모든 슬라이드가 영구 삭제됩니다.
        </p>
        <div className="flex w-full gap-3">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1"
          >
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1"
          >
            {isDeleting ? (
              <>
                <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                삭제 중...
              </>
            ) : (
              "삭제"
            )}
          </Button>
        </div>
      </div>
    </ProjectActionDialog>
  );
}

export default function DashboardPage() {
  const projects = useQuery(api.projects.listProjects);
  const deleteProjectMutation = useMutation(api.projects.deleteProject);
  const duplicateProjectMutation = useMutation(api.projects.duplicateProject);
  const updateProjectMutation = useMutation(api.projects.updateProject);
  const [editTarget, setEditTarget] = useState<{ id: Id<"projects">; title: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: Id<"projects">; title: string } | null>(null);
  const [duplicatingProjectId, setDuplicatingProjectId] = useState<Id<"projects"> | null>(null);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveTitle = useCallback(async (title: string) => {
    if (!editTarget) return;

    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) return;

    setIsSavingTitle(true);
    try {
      await updateProjectMutation({
        projectId: editTarget.id,
        title: trimmedTitle,
      });
      setEditTarget(null);
    } catch (error) {
      console.error(error);
      window.alert("프로젝트 제목 수정에 실패했습니다.");
    } finally {
      setIsSavingTitle(false);
    }
  }, [editTarget, updateProjectMutation]);

  const handleDuplicate = useCallback(async (projectId: Id<"projects">) => {
    setDuplicatingProjectId(projectId);
    try {
      await duplicateProjectMutation({ projectId });
    } catch (error) {
      console.error(error);
      window.alert("프로젝트 복제에 실패했습니다.");
    } finally {
      setDuplicatingProjectId(null);
    }
  }, [duplicateProjectMutation]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteProjectMutation({ projectId: deleteTarget.id });
      setDeleteTarget(null);
    } catch (error) {
      console.error(error);
      window.alert("프로젝트 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, deleteProjectMutation]);

  if (projects === undefined) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 md:px-8 py-4 md:py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground">내 카드뉴스</h1>
            <p className="text-sm text-muted mt-0.5">{projects.length}개의 프로젝트</p>
          </div>
          <Link
            href="/create"
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-background font-bold text-sm rounded-xl hover:bg-accent-hover transition-all hover:scale-105"
          >
            <span className="text-lg leading-none">+</span>
            새 카드뉴스
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {projects.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center text-muted mb-6">
              <LayoutGrid size={36} />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">아직 카드뉴스가 없어요</h2>
            <p className="text-muted text-sm mb-8">첫 번째 카드뉴스를 만들어보세요</p>
            <Link
              href="/create"
              className="px-6 py-3 bg-accent text-background font-bold text-sm rounded-xl hover:bg-accent-hover transition-colors"
            >
              + 새 카드뉴스 만들기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
            {/* New project card */}
            <Link
              href="/create"
              className="group rounded-2xl border-2 border-dashed border-border hover:border-accent/50 bg-surface/30 hover:bg-surface/60 transition-all flex flex-col items-center justify-center gap-3 aspect-[3/4] cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl border-2 border-dashed border-border group-hover:border-accent/50 flex items-center justify-center text-2xl text-muted group-hover:text-accent transition-colors">
                +
              </div>
              <span className="text-sm text-muted group-hover:text-foreground transition-colors font-medium">
                새 카드뉴스
              </span>
            </Link>

            {/* Project cards */}
            {projects.map((project, index) => {
              const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
              const gradient = THUMBNAIL_GRADIENTS[index % THUMBNAIL_GRADIENTS.length];
              const isDuplicating = duplicatingProjectId === project._id;

              return (
                <div
                  key={project._id}
                  className="group relative rounded-2xl border border-border bg-surface overflow-hidden hover:border-border/60 hover:-translate-y-1.5 hover:shadow-2xl transition-all duration-200"
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-lg border border-border/50 bg-background/70 text-muted backdrop-blur-sm transition-all hover:border-border hover:bg-background/90 hover:text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                        title="프로젝트 액션"
                        aria-label={`${project.title} 액션 열기`}
                      >
                        <MoreHorizontal size={15} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="bottom">
                      <DropdownMenuItem
                        onSelect={() => setEditTarget({ id: project._id, title: project.title })}
                      >
                        <Pencil size={14} className="text-muted" />
                        제목 수정
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => void handleDuplicate(project._id)}
                        disabled={isDuplicating}
                      >
                        <Copy size={14} className="text-muted" />
                        {isDuplicating ? "복제 중..." : "복제"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => setDeleteTarget({ id: project._id, title: project.title })}
                        className="text-red-400 focus:text-red-400"
                      >
                        <Trash2 size={14} />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Link href={`/edit/${project._id}`}>
                    {/* Thumbnail - renders actual first slide */}
                    <div className="aspect-[4/5] relative overflow-hidden bg-surface">
                      <ProjectThumbnail projectId={project._id} gradient={gradient} />
                      {/* Status badge overlay */}
                      {project.status === "generating" && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-[1]">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                            <span className="text-xs text-accent font-semibold">생성 중...</span>
                          </div>
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors z-[1]" />
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2 flex-1">
                          {project.title}
                        </h3>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ color: status.color, backgroundColor: status.bg }}
                          >
                            {status.label}
                          </span>
                          <span className="text-xs text-muted">{SOURCE_LABELS[project.sourceType]}</span>
                        </div>
                        {(project.slideCount ?? 0) > 0 && (
                          <span className="text-xs text-muted">{project.slideCount ?? 0}장</span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-2">{timeAgo(project.updatedAt)}</p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editTarget && (
        <EditTitleModal
          key={editTarget.id}
          initialTitle={editTarget.title}
          onConfirm={(title) => void handleSaveTitle(title)}
          onCancel={() => setEditTarget(null)}
          isSaving={isSavingTitle}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          projectTitle={deleteTarget.title}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
