"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { request } from "@/lib/api";
import { describeShareError } from "@/lib/share-errors";
import { useShareEnabled } from "@/hooks/use-share-enabled";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  SourceAccessSelect,
  type AccessScope,
} from "@/components/source-access-select";

export type PublishedSource = {
  sourceId: string;
  resourceId: string | null;
  fileUniqueId: string;
  fileName: string;
  fileSize: string;
  title: string;
  description: string | null;
  tags: string[];
  category: string | null;
  status: string;
  accessScope: AccessScope;
  publicMessageUrl: string | null;
  downloaded: boolean;
  lastErrorCode: string | null;
};

type DeviceStatus = { platformUrl?: string };

type PublishedResourcesPage = {
  items: PublishedSource[];
  page: number;
  pageSize: number;
  total: number;
};

const PAGE_SIZE = 10;

export function PublishedResources() {
  const shareEnabled = useShareEnabled();
  const [editing, setEditing] = useState<PublishedSource | null>(null);
  const [page, setPage] = useState(1);
  const { data, error, isLoading, mutate } = useSWR<PublishedResourcesPage>(
    shareEnabled ? `/share/resources?page=${page}&pageSize=${PAGE_SIZE}` : null,
    request,
    { refreshInterval: 15_000 },
  );
  const { data: device } = useSWR<DeviceStatus>(
    shareEnabled ? "/share/device/status" : null,
    request,
  );
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function revoke(source: PublishedSource) {
    if (!window.confirm(`确定要从平台索引中撤销“${source.title}”吗？`))
      return;
    try {
      await request(`/share/resources/${source.sourceId}`, {
        method: "DELETE",
      });
      await mutate();
      toast({ variant: "success", title: "资源已撤销" });
    } catch (failure) {
      toast({
        variant: "error",
        title: "撤销失败",
        description:
          failure instanceof Error ? failure.message : "请稍后重试。",
      });
    }
  }

  async function copyPlatformLink(source: PublishedSource) {
    if (!source.resourceId || !device?.platformUrl) {
      toast({ variant: "error", title: "平台链接不可用" });
      return;
    }
    try {
      const link = seedResourceDetailsUrl(device.platformUrl, source.resourceId);
      await navigator.clipboard.writeText(link);
      toast({ variant: "success", title: "已复制平台链接" });
    } catch {
      toast({ variant: "error", title: "无法复制平台链接" });
    }
  }

  async function retry(source: PublishedSource) {
    try {
      const metadata = {
        title: source.title,
        description: source.description,
        tags: source.tags,
        category: source.category,
        accessScope: source.accessScope,
        publicMessageUrl: source.publicMessageUrl,
      };
      if (source.status === "PUBLISH_FAILED") {
        await request("/share/resources", {
          method: "POST",
          body: JSON.stringify({
            fileUniqueId: source.fileUniqueId,
            ...metadata,
          }),
        });
      } else if (source.status === "UPDATE_FAILED") {
        await request(`/share/resources/${source.sourceId}`, {
          method: "PUT",
          body: JSON.stringify(metadata),
        });
      } else if (source.status === "REVOKE_FAILED") {
        await request(`/share/resources/${source.sourceId}`, {
          method: "DELETE",
        });
      }
      await mutate();
      toast({ variant: "success", title: "已重新发起同步" });
    } catch (failure) {
      toast({
        variant: "error",
        title: "重试失败",
        description:
          failure instanceof Error ? failure.message : "请稍后重试。",
      });
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">已发布来源</h2>
          <p className="text-sm text-muted-foreground">
            本地来源记录保留私有定位信息，此页面绝不会将其暴露。
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void mutate()}>
          <RotateCcw data-icon="inline-start" /> 刷新
        </Button>
      </div>
      {isLoading ? (
        <div className="flex min-h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">
          已发布来源暂时不可用。
        </div>
      ) : !data?.items.length ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          还没有资源。打开任意 Telegram 文件，选择“分享到
          telegram-seed”。
        </div>
      ) : (
        <div className="grid gap-3">
          {data.items.map((source) => (
            <article
              key={source.sourceId}
              className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-[1fr_auto] md:items-center"
            >
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-medium">{source.title}</h3>
                  <Badge variant="secondary">
                    {source.status.replaceAll("_", " ")}
                  </Badge>
                  <Badge variant="outline">
                    {source.accessScope.replaceAll("_", " ")}
                  </Badge>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {source.fileName} ·{" "}
                  {source.downloaded ? "已下载" : "仅远程"}
                </p>
                {source.lastErrorCode && (
                  <p className="mt-2 text-xs text-destructive">
                    {describeShareError(source.lastErrorCode)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {source.resourceId && (
                  <code className="max-w-28 truncate text-xs text-muted-foreground">
                    {source.resourceId.slice(0, 8)}
                  </code>
                )}
                {source.status.endsWith("_FAILED") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void retry(source)}
                  >
                    <RotateCcw data-icon="inline-start" /> 重试
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!source.resourceId}
                  aria-label={`复制“${source.title}”的平台链接`}
                  onClick={() => void copyPlatformLink(source)}
                >
                  <Copy data-icon="inline-start" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!source.resourceId || source.status === "REVOKED"}
                  aria-label={`编辑 ${source.title}`}
                  onClick={() => setEditing(source)}
                >
                  <Pencil data-icon="inline-start" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={source.status === "REVOKED"}
                  aria-label={`撤销 ${source.title}`}
                  onClick={() => void revoke(source)}
                >
                  <Trash2 data-icon="inline-start" />
                </Button>
              </div>
            </article>
          ))}
          {totalPages > 1 && (
            <div className="flex flex-col gap-2 pt-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                显示第 {firstItem}-{lastItem} 条，共 {total} 条
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <ChevronLeft data-icon="inline-start" />
                  上一页
                </Button>
                <span className="min-w-16 text-center">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                >
                  下一页
                  <ChevronRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      <EditPublishedResourceDialog
        source={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSaved={async () => {
          setEditing(null);
          await mutate();
        }}
      />
    </section>
  );
}

export function seedResourceDetailsUrl(
  platformUrl: string,
  resourceId: string,
): string {
  return new URL(
    `/resources/${encodeURIComponent(resourceId)}`,
    platformUrl,
  ).toString();
}

export function EditPublishedResourceDialog({
  source,
  onOpenChange,
  onSaved,
}: {
  source: PublishedSource | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [scope, setScope] = useState<AccessScope>("OWNER_ONLY");
  const [publicMessageUrl, setPublicMessageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const initializedSourceId = useRef<string | null>(null);

  useEffect(() => {
    if (!source) {
      initializedSourceId.current = null;
      return;
    }
    if (initializedSourceId.current === source.sourceId) return;
    initializedSourceId.current = source.sourceId;
    setTitle(source.title);
    setDescription(source.description ?? "");
    setTags(source.tags.join(", "));
    setCategory(source.category ?? "");
    setScope(source.accessScope);
    setPublicMessageUrl(source.publicMessageUrl ?? "");
  }, [source]);

  async function save() {
    if (!source) return;
    setSubmitting(true);
    try {
      await request(`/share/resources/${source.sourceId}`, {
        method: "PUT",
        body: JSON.stringify({
          title,
          description: description || null,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          category: category || null,
          accessScope: scope,
          publicMessageUrl: scope === "PUBLIC" ? publicMessageUrl : null,
        }),
      });
      toast({ variant: "success", title: "资源元数据已更新" });
      await onSaved();
    } catch (failure) {
      toast({
        variant: "error",
        title: "更新失败",
        description:
          failure instanceof Error ? failure.message : "请稍后重试。",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={source !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑索引元数据</DialogTitle>
          <DialogDescription>
            安全的元数据会同步到 telegram-seed。Telegram
            账户、聊天、消息和本地路径始终保留在本节点。
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">标题</span>
            <Input
              value={title}
              maxLength={255}
              required
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">描述</span>
            <Textarea
              value={description}
              maxLength={4096}
              rows={4}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">标签</span>
              <Input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">分类</span>
              <Input
                value={category}
                maxLength={64}
                onChange={(event) => setCategory(event.target.value)}
              />
            </label>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">来源访问</span>
            <SourceAccessSelect value={scope} onValueChange={setScope} />
          </div>
          {scope === "PUBLIC" && (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                公开的 Telegram 消息 URL
              </span>
              <Input
                type="url"
                value={publicMessageUrl}
                required
                placeholder="https://t.me/channel/42"
                onChange={(event) => setPublicMessageUrl(event.target.value)}
              />
            </label>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={submitting || title.trim().length === 0}
            >
              {submitting && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              保存更改
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
