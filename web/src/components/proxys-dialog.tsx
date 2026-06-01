import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EarthLock } from "lucide-react";
import Proxys, { type ProxysProps } from "@/components/proxys";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import { TooltipWrapper } from "@/components/ui/tooltip";

type ProxysDialogProps = {
  className?: string;
} & ProxysProps;

export default function ProxysDialog({
  className,
  telegramId,
  ...proxyProps
}: ProxysDialogProps) {
  const { data, isLoading } = useSWR<{
    success: boolean;
  }>(telegramId ? `/telegram/${telegramId}/test-network` : undefined);

  const triggerTooltipContent = useMemo(() => {
    if (!telegramId) {
      return "您可以为 Telegram 连接添加代理。";
    }
    return (
      <>
        {isLoading && "测试网络中..."}
        {!isLoading && data?.success && "成功连接到 Telegram"}
        {!isLoading && !data?.success && "连接到 Telegram 失败"}
      </>
    );
  }, [data, isLoading, telegramId]);

  const triggerClassName = telegramId
    ? cn(
        isLoading &&
          "animate-pulse border-4 border-blue-400 text-blue-400 dark:border-blue-500 dark:text-blue-500",
        !isLoading &&
          data?.success &&
          "border-4 border-green-400 text-green-400 dark:border-green-500 dark:text-green-500",
        !isLoading &&
          !data?.success &&
          "border-4 border-red-400 text-red-400 dark:border-red-500 dark:text-red-500",
      )
    : "";

  return (
    <Dialog>
      <TooltipWrapper content={triggerTooltipContent}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full bg-primary px-2 text-accent hover:bg-primary/90 hover:text-accent",
              triggerClassName,
              className,
            )}
          >
            <EarthLock className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      </TooltipWrapper>
      <DialogContent
        className="md:max-w-2/3 h-full w-full max-w-full md:h-3/4 md:w-2/3"
        aria-describedby={undefined}
      >
        <VisuallyHidden>
          <DialogTitle>Proxys</DialogTitle>
        </VisuallyHidden>
        <div className="mt-3">
          <Proxys telegramId={telegramId} {...proxyProps} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
