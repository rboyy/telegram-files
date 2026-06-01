import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import useSWRMutation from "swr/mutation";
import { POST } from "@/lib/api";
import { useDebounce } from "use-debounce";
import { useToast } from "@/hooks/use-toast";
import { AutomationButton } from "@/components/automation-button";
import { useTelegramChat } from "@/hooks/use-telegram-chat";
import { useTelegramAccount } from "@/hooks/use-telegram-account";
import { Label } from "@/components/ui/label";
import { type Auto } from "@/lib/types";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import AutomationForm from "@/components/automation-form";

const DEFAULT_AUTO: Auto = {
  preload: {
    enabled: false,
  },
  download: {
    enabled: false,
    rule: {
      query: "",
      fileTypes: [],
      downloadHistory: true,
      downloadCommentFiles: false,
      filterExpr: "",
    },
  },
  transfer: {
    enabled: false,
    rule: {
      transferHistory: true,
      destination: "",
      transferPolicy: "GROUP_BY_CHAT",
      duplicationPolicy: "OVERWRITE",
      extra: {},
    },
  },
};

export default function AutomationDialog() {
  const { accountId } = useTelegramAccount();
  const { isLoading, chat, reload } = useTelegramChat();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [auto, setAuto] = useState<Auto>(DEFAULT_AUTO);
  const { trigger: triggerAuto, isMutating: isAutoMutating } = useSWRMutation(
    !accountId || !chat
      ? undefined
      : `/${accountId}/file/update-auto-settings?telegramId=${accountId}&chatId=${chat?.id}`,
    (
      key,
      {
        arg,
      }: {
        arg: Auto;
      },
    ) => {
      return POST(key, arg);
    },
    {
      onSuccess: () => {
        toast({
          variant: "success",
          title: "自动设置已更新！",
        });
        void reload();
        setEditMode(false);
        setTimeout(() => {
          setOpen(false);
        }, 1000);
      },
    },
  );

  const [debounceIsAutoMutating] = useDebounce(isAutoMutating, 500, {
    leading: true,
  });

  useEffect(() => {
    if (chat?.auto) {
      setAuto(chat.auto);
    } else {
      setAuto(DEFAULT_AUTO);
    }
  }, [chat]);

  if (isLoading) {
    return (
      <div className="h-8 w-32 animate-pulse bg-gray-200 dark:bg-gray-700"></div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        asChild
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        {chat && <AutomationButton auto={chat.auto} />}
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        onPointerDownOutside={() => setOpen(false)}
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full overflow-auto md:h-auto md:max-h-[85%] md:min-w-[400px]"
      >
        <DialogHeader>
          <DialogTitle>
            更新 {chat?.name ?? "未知对话"} 的自动设置
          </DialogTitle>
        </DialogHeader>
        <DialogDescription></DialogDescription>
        {!editMode && chat?.auto ? (
          <div className="space-y-4">
            <div className="space-y-4 rounded-md border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-gray-900 dark:text-gray-300">
                  自动预加载
                </Label>
                <Badge
                  variant="outline"
                  className={cn(
                    "border-none bg-green-500 px-2 py-0.5 text-xs text-white dark:bg-green-800 dark:text-green-200",
                    chat.auto.preload.enabled
                      ? "bg-green-500 dark:bg-green-800 dark:text-green-200"
                      : "bg-gray-500 dark:bg-gray-800 dark:text-gray-300",
                  )}
                >
                  {chat.auto.preload.enabled ? "已启用" : "已禁用"}
                </Badge>
              </div>
              {(chat.auto.state & (1 << 1)) != 0 && (
                <p className="text-xs text-muted-foreground">
                  所有历史文件已预加载。
                </p>
              )}
            </div>
            <div className="space-y-4 rounded-md border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-gray-900 dark:text-gray-300">
                  自动下载
                </Label>
                <Badge
                  variant="outline"
                  className={cn(
                    "border-none px-2 py-0.5 text-xs text-white",
                    chat.auto.download.enabled
                      ? "bg-green-500 dark:bg-green-800 dark:text-green-200"
                      : "bg-gray-500 dark:bg-gray-800 dark:text-gray-300",
                  )}
                >
                  {chat.auto.download.enabled ? "已启用" : "已禁用"}
                </Badge>
              </div>
              {auto.download.enabled && (
                <>
                  {(chat.auto.state & (1 << 2)) != 0 && (
                    <p className="text-xs text-muted-foreground">
                      所有历史文件已开始下载。
                    </p>
                  )}
                  <div className="space-y-3">
                    {/* Query Keyword Section */}
                    <div className="rounded-lg bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                      <div className="flex flex-col space-y-1">
                        <span className="text-xs font-medium text-gray-500">
                          查询关键词
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-300">
                          {chat.auto.download.rule.query || "未指定关键词"}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                      <div className="flex flex-col space-y-1">
                        <span className="text-xs font-medium text-gray-500">
                          过滤表达式
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-300">
                          {chat.auto.download.rule.filterExpr ||
                            "未指定过滤表达式"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                      <span className="text-xs font-medium text-gray-500">
                        文件类型
                      </span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {chat.auto.download.rule.fileTypes.length > 0 ? (
                          chat.auto.download.rule.fileTypes.map((type) => (
                            <Badge
                              key={type}
                              variant="secondary"
                              className="flex items-center gap-1 border-gray-200 bg-white px-3 py-1 capitalize text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            >
                              {type}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-300">
                            未选择文件类型
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                      <span className="text-xs font-medium text-gray-500">
                        下载历史文件
                      </span>
                      <Badge
                        className={cn(
                          "border-none px-2 py-0.5 text-xs text-white",
                          !chat.auto.download.rule.downloadHistory &&
                            "bg-gray-500 dark:bg-gray-800 dark:text-gray-300",
                        )}
                      >
                        {chat.auto.download.rule.downloadHistory
                          ? "已启用"
                          : "已禁用"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                      <span className="text-xs font-medium text-gray-500">
                        下载评论文件
                      </span>
                      <Badge
                        className={cn(
                          "border-none px-2 py-0.5 text-xs text-white",
                          !chat.auto.download.rule.downloadCommentFiles &&
                            "bg-gray-500 dark:bg-gray-800 dark:text-gray-300",
                        )}
                      >
                        {chat.auto.download.rule.downloadCommentFiles
                          ? "已启用"
                          : "已禁用"}
                      </Badge>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4 rounded-md border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-gray-900 dark:text-gray-300">
                  自动转移
                </Label>
                <Badge
                  variant="outline"
                  className={cn(
                    "border-none px-2 py-0.5 text-xs text-white",
                    chat.auto.transfer.enabled
                      ? "bg-green-500 dark:bg-green-800 dark:text-green-200"
                      : "bg-gray-500 dark:bg-gray-800 dark:text-gray-300",
                  )}
                >
                  {chat.auto.transfer.enabled ? "已启用" : "已禁用"}
                </Badge>
              </div>
              {chat.auto.transfer.enabled && (
                <>
                  {(chat.auto.state & (1 << 4)) != 0 && (
                    <p className="text-xs text-muted-foreground">
                      所有历史下载文件已转移。
                    </p>
                  )}
                  <div className="space-y-3">
                    <div className="rounded-lg bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                      <div className="flex flex-col space-y-1">
                        <span className="text-xs font-medium text-gray-500">
                          目标文件夹
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-300">
                          {chat.auto.transfer.rule.destination}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-3 rounded-lg bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-300">
                          转移策略
                        </span>
                        <Badge variant="outline" className="font-normal">
                          {chat.auto.transfer.rule.transferPolicy}
                        </Badge>
                      </div>
                      {chat.auto.transfer.rule.transferPolicy ===
                        "GROUP_BY_AI" && (
                        <div className="mt-2 w-full whitespace-pre-line rounded-md bg-gray-100 p-2 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                          {chat.auto.transfer.rule.extra.promptTemplate}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                      <span className="text-xs text-gray-500 dark:text-gray-300">
                        重复文件处理策略
                      </span>
                      <Badge variant="outline" className="font-normal">
                        {chat.auto.transfer.rule.duplicationPolicy}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                      <span className="text-xs text-gray-500 dark:text-gray-300">
                        转移历史文件
                      </span>
                      <Badge
                        className={cn(
                          "border-none px-2 py-0.5 text-xs text-white",
                          !chat.auto.transfer.rule.transferHistory &&
                            "bg-gray-500 dark:bg-gray-800 dark:text-gray-300",
                        )}
                      >
                        {chat.auto.transfer.rule.transferHistory
                          ? "已启用"
                          : "已禁用"}
                      </Badge>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <AutomationForm auto={auto} onChange={setAuto} />
        )}
        <DialogFooter className="gap-2">
          {!editMode && chat?.auto ? (
            <Button variant="outline" onClick={() => setEditMode(true)}>
              编辑
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={debounceIsAutoMutating}
              >
                取消
              </Button>
              <Button
                onClick={() => {
                  const folderPathRegex =
                    /^[\/\\]?(?:[^<>:"|?*\/\\]+[\/\\]?)*$/;
                  if (
                    auto?.transfer.enabled &&
                    (auto?.transfer.rule.destination.length === 0 ||
                      !folderPathRegex.test(auto?.transfer.rule.destination))
                  ) {
                    toast({
                      variant: "warning",
                      title: "目标文件夹路径无效",
                      description: "请输入有效的目标文件夹路径",
                    });
                    return;
                  }
                  void triggerAuto(auto);
                }}
                disabled={debounceIsAutoMutating}
              >
                {debounceIsAutoMutating ? "正在提交..." : "提交"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
