"use client";

import useSWR from "swr";
import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSliders,
  Loader2,
  ShieldAlert,
  Tags,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlatformBindingStatus } from "@/hooks/use-platform-binding-status";
import { useShareEnabled } from "@/hooks/use-share-enabled";
import { request } from "@/lib/api";
import {
  DEFAULT_SHARE_PUBLICATION_POLICY,
  type SharePolicyRule,
  type SharePublicationPolicy,
} from "@/lib/share-publication-policy";

export function SharePublicationRules() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const shareEnabled = useShareEnabled();
  const binding = usePlatformBindingStatus();
  const canLoadPolicy = shareEnabled && binding.isBound;
  const { data, error, isLoading, mutate } = useSWR<SharePublicationPolicy>(
    canLoadPolicy ? "/share/publication-policy" : null,
    request,
    {
      fallbackData: DEFAULT_SHARE_PUBLICATION_POLICY,
      revalidateOnFocus: false,
    },
  );
  const policy = data ?? DEFAULT_SHARE_PUBLICATION_POLICY;
  const statusLabel = error ? "策略不可用" : "已同步策略";

  if (!canLoadPolicy) {
    return null;
  }

  if (isCollapsed) {
    return (
      <section>
        <Card
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => setIsCollapsed(false)}
        >
          <CardHeader className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      error
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {statusLabel}
                  </Badge>
                  <span className="font-semibold">分享规则</span>
                  {isLoading && shareEnabled && (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  默认 {policy.defaultDecision.toLowerCase()} ·{" "}
                  {policy.categories.length} 个分类 ·{" "}
                  {policy.shareRules.length} 条有序规则
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="展开分享规则"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsCollapsed(false);
                }}
              >
                <ChevronDown />
              </Button>
            </div>
          </CardHeader>
        </Card>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">分享规则</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            以下限制和分类来自 telegram-seed，并在发布资源时再次校验。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={error ? "destructive" : "secondary"}
          >
            {statusLabel}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="收起分享规则"
            onClick={() => setIsCollapsed(true)}
          >
            <ChevronUp />
          </Button>
        </div>
      </div>

      {isLoading && shareEnabled ? (
        <Card>
          <CardContent className="flex min-h-28 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="animate-spin" />
            正在加载平台策略
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Tags aria-hidden="true" className="size-4" />
                分类
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Fact
                  label="默认决策"
                  value={policy.defaultDecision}
                  tone={policy.defaultDecision === "ALLOW" ? "allow" : "deny"}
                />
                <Fact
                  label="默认分类"
                  value={policy.defaultCategoryId}
                />
              </div>
              <div className="grid gap-2">
                {policy.categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{category.label}</span>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {category.id}
                      </code>
                      {category.id === policy.defaultCategoryId && (
                        <Badge variant="outline">默认</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {category.defaultForFileTypes.length > 0
                        ? `自动匹配文件类型：${category.defaultForFileTypes.join(", ")}`
                        : "仅支持手动选择"}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSliders aria-hidden="true" className="size-4" />
                有序规则
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {error && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  无法刷新平台策略，在下一次成功同步前显示本地兜底配置。
                </div>
              )}
              {policy.shareRules.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  没有显式规则，未匹配的文件都将应用默认决策。
                </div>
              ) : (
                policy.shareRules.map((rule, index) => (
                  <RuleRow key={rule.id} rule={rule} index={index} />
                ))
              )}
              <button
                type="button"
                className="mt-1 w-fit text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={() => void mutate()}
              >
                刷新规则
              </button>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}

function Fact({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "allow" | "deny";
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === "allow"
            ? "mt-1 font-semibold text-emerald-600 dark:text-emerald-400"
            : tone === "deny"
              ? "mt-1 font-semibold text-destructive"
              : "mt-1 font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}

function RuleRow({ rule, index }: { rule: SharePolicyRule; index: number }) {
  const isAllow = rule.decision === "ALLOW";
  const conditions = describeMatch(rule.match);

  return (
    <article className="rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">#{index + 1}</Badge>
            <code className="truncate text-xs text-muted-foreground">
              {rule.id}
            </code>
          </div>
          <p className="mt-2 text-sm font-medium">{rule.reason}</p>
        </div>
        <Badge
          className={
            isAllow
              ? "gap-1 bg-emerald-600 text-white hover:bg-emerald-600"
              : "gap-1"
          }
          variant={isAllow ? "default" : "destructive"}
        >
          {isAllow ? (
            <CheckCircle2 aria-hidden="true" className="size-3.5" />
          ) : (
            <ShieldAlert aria-hidden="true" className="size-3.5" />
          )}
          {rule.decision}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {conditions.map((condition) => (
          <Badge key={condition} variant="secondary" className="font-normal">
            {condition}
          </Badge>
        ))}
      </div>
    </article>
  );
}

function describeMatch(match: SharePolicyRule["match"]): string[] {
  const conditions = [
    ...(match.fileTypes?.map((value) => `类型: ${value}`) ?? []),
    ...(match.mimeTypes?.map((value) => `MIME: ${value}`) ?? []),
    ...(match.mimeTypePrefixes?.map((value) => `MIME 前缀 ${value}`) ?? []),
    ...(match.minFileSizeBytes === undefined
      ? []
      : [`大小 >= ${formatBytes(match.minFileSizeBytes)}`]),
    ...(match.maxFileSizeBytes === undefined
      ? []
      : [`大小 <= ${formatBytes(match.maxFileSizeBytes)}`]),
  ];
  return conditions.length > 0 ? conditions : ["全部文件"];
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return String(bytes);
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}
