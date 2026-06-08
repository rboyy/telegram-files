import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type DownloadStatus,
  type FileFilter,
  type TelegramFile,
  type Thumbnail,
  type TransferStatus,
} from "@/lib/types";
import useSWRInfinite from "swr/infinite";
import { useWebsocket } from "@/hooks/use-websocket";
import { WebSocketMessageType } from "@/lib/websocket-types";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useDebounce } from "use-debounce";

const DEFAULT_FILTERS: FileFilter = {
  search: "",
  type: "media",
  downloadStatus: undefined,
  transferStatus: undefined,
  offline: false,
  tags: [],
};

type FileResponse = {
  files: TelegramFile[];
  count: number;
  nextFromMessageId: number;
};

type FileStatusUpdate = {
  fileId: number;
  downloadStatus: DownloadStatus;
  localPath?: string;
  completionDate?: number;
  downloadedSize: number;
  transferStatus?: TransferStatus;
  thumbnailFile?: Thumbnail;
  removed?: boolean;
};

export function useFiles(
  accountId: string,
  chatId: string,
  messageThreadId?: number,
  link?: string,
) {
  const noAccountSpecified = accountId === "-1" && chatId === "-1";
  const url = noAccountSpecified
    ? "/files"
    : `/telegram/${accountId}/chat/${chatId}/files`;
  const { lastJsonMessage } = useWebsocket();
  const latestFilesStatusRef = useRef<Record<string, FileStatusUpdate>>({});
  const [updateCounter, setUpdateCounter] = useState(0);
  const [filters, setFilters, clearFilters] = useLocalStorage<FileFilter>(
    "telegramFileListFilter",
    { ...DEFAULT_FILTERS, offline: noAccountSpecified },
  );

  const getKey = useCallback((page: number, previousPageData: FileResponse | null) => {
    const params = new URLSearchParams({
      ...(filters.search && {
        search: window.encodeURIComponent(filters.search),
      }),
      ...(filters.type && { type: filters.type }),
      ...(filters.downloadStatus && { downloadStatus: filters.downloadStatus }),
      ...(filters.transferStatus && { transferStatus: filters.transferStatus }),
      ...(filters.offline && { offline: "true" }),
      ...(filters.tags.length > 0 && {
        tags: filters.tags.join(","),
      }),
      ...(messageThreadId && { messageThreadId: messageThreadId.toString() }),
      ...(link && { link: window.encodeURIComponent(link) }),
      ...(filters.dateType && { dateType: filters.dateType }),
      ...(filters.dateRange && { dateRange: filters.dateRange.join(",") }),
      ...(filters.sizeRange && { sizeRange: filters.sizeRange.join(",") }),
      ...(filters.sizeUnit && { sizeUnit: filters.sizeUnit }),
      ...(filters.sort && { sort: filters.sort }),
      ...(filters.order && { order: filters.order }),
    });

    if (page === 0) {
      return `${url}?${params.toString()}`;
    }

    if (!previousPageData) {
      return null;
    }

    params.set("fromMessageId", previousPageData.nextFromMessageId.toString());
    if (filters.offline && previousPageData.files.length > 0) {
      const lastFile =
        previousPageData.files[previousPageData.files.length - 1];
      if (filters.sort === "size") {
        params.set("fromSortField", lastFile!.size.toString());
      } else if (filters.sort === "completion_date") {
        params.set("fromSortField", lastFile!.completionDate.toString());
      } else if (filters.sort === "date") {
        params.set("fromSortField", lastFile!.date.toString());
      } else if (filters.sort === "reaction_count") {
        params.set("fromSortField", lastFile!.reactionCount.toString());
      }
    }
    return `${url}?${params.toString()}`;
  }, [filters, messageThreadId, link, url]);

  const {
    data: pages,
    isLoading,
    isValidating,
    size,
    setSize,
    error,
    mutate,
  } = useSWRInfinite<FileResponse, Error>(getKey, {
    revalidateFirstPage: false,
    keepPreviousData: true,
  });

  const [debounceLoading] = useDebounce(isLoading || isValidating, 500, {
    leading: true,
    maxWait: 1000,
  });

  useEffect(() => {
    if (lastJsonMessage?.type !== WebSocketMessageType.FILE_STATUS) {
      return;
    }
    const data = lastJsonMessage.data as {
      fileId: number;
      uniqueId: string;
      downloadStatus: DownloadStatus;
      localPath: string;
      completionDate: number;
      downloadedSize: number;
      transferStatus?: TransferStatus;
      thumbnailFile?: Thumbnail;
      removed?: boolean;
    };

    if (data.removed) {
      latestFilesStatusRef.current = {
        ...latestFilesStatusRef.current,
        [data.uniqueId]: {
          fileId: data.fileId,
          downloadStatus: "idle",
          localPath: undefined,
          completionDate: undefined,
          downloadedSize: 0,
          transferStatus: "idle",
          removed: true,
        },
      };
    } else {
      latestFilesStatusRef.current = {
        ...latestFilesStatusRef.current,
        [data.uniqueId]: {
          fileId: data.fileId,
          downloadStatus:
            data.downloadStatus ?? latestFilesStatusRef.current[data.uniqueId]?.downloadStatus,
          localPath: data.localPath ?? latestFilesStatusRef.current[data.uniqueId]?.localPath,
          completionDate:
            data.completionDate ?? latestFilesStatusRef.current[data.uniqueId]?.completionDate,
          downloadedSize:
            data.downloadedSize ?? latestFilesStatusRef.current[data.uniqueId]?.downloadedSize,
          transferStatus:
            data.transferStatus ?? latestFilesStatusRef.current[data.uniqueId]?.transferStatus,
          thumbnailFile: data.thumbnailFile ?? latestFilesStatusRef.current[data.uniqueId]?.thumbnailFile,
        },
      };
    }
    setUpdateCounter(prev => prev + 1);
  }, [lastJsonMessage]);

  useEffect(() => {
    if (noAccountSpecified && !filters.offline) {
      setFilters((prev) => ({
        ...prev,
        offline: true,
      }));
    }
  }, [filters.offline, noAccountSpecified, setFilters]);

  const files = useMemo(() => {
    if (!pages) return [];
    const files: TelegramFile[] = [];
    pages.forEach((page) => {
      page.files.forEach((file) => {
        const statusUpdate = latestFilesStatusRef.current[file.uniqueId];
        if (file.originalDeleted && statusUpdate?.removed) {
          return;
        }
        files.push({
          ...file,
          id: statusUpdate?.fileId ?? file.id,
          downloadStatus: statusUpdate?.downloadStatus ?? file.downloadStatus,
          localPath: statusUpdate?.localPath ?? file.localPath,
          completionDate: statusUpdate?.completionDate ?? file.completionDate,
          downloadedSize: statusUpdate?.downloadedSize ?? file.downloadedSize,
          transferStatus: statusUpdate?.transferStatus ?? file.transferStatus,
          thumbnailFile: statusUpdate?.thumbnailFile ?? file.thumbnailFile,
        });
      });
    });
    files.forEach((file, index) => {
      file.prev = files[index - 1];
      file.next = files[index + 1];
    });
    return files;
  }, [pages, updateCounter]);

  const hasMore = useMemo(() => {
    if (!pages || pages.length === 0) return true;

    const fetchedCount = pages.reduce((acc, d) => acc + d.files.length, 0);
    const lastPage = pages[pages.length - 1];
    let hasMore = false;
    if (lastPage) {
      const count = lastPage.count;
      hasMore = count > fetchedCount && lastPage.nextFromMessageId !== 0;
    }
    return hasMore;
  }, [pages]);

  const handleLoadMore = useCallback(async () => {
    if (isLoading || isValidating || !hasMore || error) return;
    await setSize(size + 1);
  }, [isLoading, isValidating, hasMore, error, size, setSize]);

  const handleFilterChange = useCallback(async (newFilters: FileFilter) => {
    if (
      Object.keys(newFilters).every(
        (key) =>
          newFilters[key as keyof FileFilter] ===
          filters[key as keyof FileFilter],
      )
    ) {
      return;
    }
    setFilters(newFilters);
    await setSize(1);
  }, [filters, setFilters, setSize]);

  const updateField = useCallback(async (
    uniqueId: string,
    patch: Partial<TelegramFile>,
  ) => {
    await mutate((pages) => {
      if (!pages) return [];

      return pages.map((page) => {
        const newFiles = page.files.map((file) =>
          file.uniqueId === uniqueId ? { ...file, ...patch } : file,
        );
        return {
          ...page,
          files: newFiles,
        };
      });
    }, false);
  }, [mutate]);

  return {
    size,
    files,
    filters,
    isLoading: debounceLoading,
    updateField,
    handleFilterChange,
    clearFilters,
    handleLoadMore,
    hasMore,
    mutate,
  };
}
