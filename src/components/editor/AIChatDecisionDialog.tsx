"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChatEditRenderModel } from "@/lib/chatEdit";

interface AIChatDecisionDialogProps {
  isApplying?: boolean;
  isOpen: boolean;
  model: ChatEditRenderModel | null;
  onApply: () => void;
  onCancel: () => void;
  onRetry: () => void;
}

export function AIChatDecisionDialog({
  isApplying = false,
  isOpen,
  model,
  onApply,
  onCancel,
  onRetry,
}: AIChatDecisionDialogProps) {
  if (!isOpen || !model) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />

      <Card className="relative z-10 w-full max-w-lg rounded-3xl border-border/80 shadow-2xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>이 변경을 적용할까요?</CardTitle>
              <CardDescription className="mt-1 text-xs leading-5">
                미리보기는 이미 반영되어 있습니다. 적용하면 실제 편집 데이터에 저장됩니다.
              </CardDescription>
            </div>
            <Badge variant="secondary">{model.scopeLabel}</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-2xl bg-accent/5 px-4 py-3">
            <p className="text-sm font-medium leading-6 text-foreground">{model.summary}</p>
          </div>

          <div className="space-y-2">
            {model.operations.slice(0, 4).map((operation) => (
              <div
                key={operation.key}
                className="rounded-2xl border border-border bg-background px-4 py-3"
              >
                <p className="text-sm font-medium text-foreground">{operation.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{operation.target}</p>
              </div>
            ))}
            {model.operations.length > 4 && (
              <p className="text-xs text-muted">
                외 {model.operations.length - 4}개의 변경안이 더 있습니다.
              </p>
            )}
          </div>

          {model.warnings.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">확인할 점</p>
              <ul className="mt-2 space-y-1.5 leading-6">
                {model.warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <Button onClick={onApply} disabled={isApplying} className="rounded-xl">
              {isApplying ? "적용 중..." : "적용"}
            </Button>
            <Button
              variant="outline"
              onClick={onRetry}
              disabled={isApplying}
              className="rounded-xl"
            >
              다시 제안
            </Button>
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={isApplying}
              className="rounded-xl"
            >
              취소
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
