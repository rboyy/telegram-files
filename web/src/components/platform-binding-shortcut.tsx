"use client";

import { BadgeCheck, LoaderCircle, Network, Unplug } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TooltipWrapper } from "@/components/ui/tooltip";
import { usePlatformBindingStatus } from "@/hooks/use-platform-binding-status";
import { useShareEnabled } from "@/hooks/use-share-enabled";

export function PlatformBindingShortcut() {
  const shareEnabled = useShareEnabled();
  const { data, error, isLoading, isBound, isPending } =
    usePlatformBindingStatus();

  if (!shareEnabled) {
    const disabledLabel = "分享功能已禁用";
    return (
      <TooltipWrapper content={disabledLabel}>
        <span className="inline-flex cursor-not-allowed">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled
            aria-label={disabledLabel}
            className="pointer-events-none opacity-50"
          >
            <Unplug data-icon="inline-start" />
          </Button>
        </span>
      </TooltipWrapper>
    );
  }

  let label = "平台节点未绑定";
  let icon = <Unplug data-icon="inline-start" />;

  if (isLoading) {
    label = "正在检查平台节点绑定状态";
    icon = <LoaderCircle data-icon="inline-start" className="animate-spin" />;
  } else if (error || !data) {
    label = "无法获取平台节点绑定状态";
    icon = <Network data-icon="inline-start" />;
  } else if (isBound) {
    label = data.nodeName
      ? `平台节点已绑定：${data.nodeName}`
      : "平台节点已绑定";
    icon = <BadgeCheck data-icon="inline-start" />;
  } else if (isPending) {
    label = "平台节点授权等待批准";
    icon = <LoaderCircle data-icon="inline-start" className="animate-spin" />;
  }

  return (
    <TooltipWrapper content={label}>
      <Button asChild type="button" variant="ghost" size="icon">
        <Link href="/share" aria-label={label}>
          {icon}
        </Link>
      </Button>
    </TooltipWrapper>
  );
}
