import { useCallback, useState } from "react";
import { toast } from "@/hooks/use-toast";
import type { TelegramFile } from "@/lib/types";

type FileSwitchProps = {
  file: TelegramFile;
  onFileChange: (file: TelegramFile) => void;
  hasMore: boolean;
  handleLoadMore: () => Promise<void>;
};

export default function useFileSwitch({
  file,
  onFileChange,
  hasMore,
  handleLoadMore,
}: FileSwitchProps) {
  const [direction, setDirection] = useState(0);

  const handleNavigation = useCallback(
    (newDirection: number) => {
      const newFile = newDirection > 0 ? file?.next : file?.prev;
      if (newFile) {
        setDirection(newDirection);
        onFileChange(newFile);
      } else if (newDirection > 0) {
        if (hasMore) {
          void handleLoadMore();
        } else {
          toast({
            variant: "info",
            description: "没有更多可加载的文件",
          });
        }
      }
    },
    [file?.next, file?.prev, onFileChange, hasMore, handleLoadMore],
  );

  return {
    direction,
    handleNavigation,
  };
}
