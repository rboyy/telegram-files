import { type TelegramFile } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import React from "react";
import { cn } from "@/lib/utils";
import { TooltipWrapper } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Download,
  FolderSync,
  Pause,
  XCircle,
} from "lucide-react";
import useIsMobile from "@/hooks/use-is-mobile";

export const DOWNLOAD_STATUS = {
  idle: {
    icon: Clock,
    className: "bg-gray-100 text-gray-600",
    text: "空闲",
  },
  downloading: {
    icon: Download,
    className: "bg-blue-100 text-blue-600",
    text: "下载中",
  },
  paused: {
    icon: Pause,
    className: "bg-yellow-100 text-yellow-600",
    text: "已暂停",
  },
  completed: {
    icon: CheckCircle2,
    className: "bg-green-100 text-green-600",
    text: "已完成",
  },
  error: {
    icon: XCircle,
    className: "bg-red-100 text-red-600",
    text: "错误",
  },
};

export const TRANSFER_STATUS = {
  idle: {
    icon: Clock,
    className: "bg-gray-100 text-gray-600",
    text: "空闲",
  },
  transferring: {
    icon: FolderSync,
    className: "bg-blue-100 text-blue-600",
    text: "转移中",
  },
  completed: {
    icon: CheckCircle2,
    className: "bg-green-100 text-green-600",
    text: "已转移",
  },
  error: {
    icon: XCircle,
    className: "bg-red-100 text-red-600",
    text: "转移错误",
  },
};

export default function FileStatus({
  file,
  className,
}: {
  file: TelegramFile;
  className?: string;
}) {
  const badgeVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { type: "spring", stiffness: 300 },
    },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
  };
  const isMobile = useIsMobile();

  return (
    <div
      className={cn("flex items-center justify-center space-x-2", className)}
    >
      <AnimatePresence>
        {file.transferStatus === "idle" && (
          <motion.div
            key="download-status"
            variants={badgeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <TooltipWrapper content="下载状态">
              <Badge
                className={cn(
                  "h-6 text-xs hover:bg-gray-200",
                  DOWNLOAD_STATUS[file.downloadStatus].className,
                  isMobile && "shadow-none",
                )}
              >
                {DOWNLOAD_STATUS[file.downloadStatus].text}
              </Badge>
            </TooltipWrapper>
          </motion.div>
        )}
        {file.downloadStatus === "completed" &&
          file.transferStatus &&
          file.transferStatus !== "idle" && (
            <motion.div
              key="transfer-status"
              variants={badgeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <TooltipWrapper content="转移状态">
                <Badge
                  className={cn(
                    "h-6 text-xs hover:bg-gray-200",
                    TRANSFER_STATUS[file.transferStatus].className,
                  )}
                >
                  {TRANSFER_STATUS[file.transferStatus].text}
                </Badge>
              </TooltipWrapper>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
