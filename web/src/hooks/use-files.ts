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
import { useDebounce, useDebouncedCallback } from "use-debounce";

const DEFAULT_FILTERS: FileFilter = {
  search: "",
  type: "media",
  downloadStatus: undefined,
  transferStatus: undefined,
  offline: false,
  seedOnly: false,
  tags: [],
};

type FileResponse = {
  files: TelegramFile[];
  count: number;
  nextFromMessageId: number;
  nextSeedOffset?: number;
  hasMore?: boolean;
};

type FileStatusUpdate = {
  fileId: number;
  downloadStatus: DownloadStatus;
  localPath?: string;
  completionDate?: number;
  downloadedSize: number;
  transferStatus?: TransferStatus;
  thumbnailFile?: Thumbnail;
  torrentStatus?: string;
  sharedByMe?: boolean;
  shareStatus?: TelegramFile["shareStatus"];
  sharedSourceId?: string;
  sharedResourceId?: string;
  shareTitle?: string;
  shareDescription?: string | null;
  shareTags?: string[];
  shareCategory?: string | null;
  shareAccessScope?: TelegramFile["shareAccessScope"];
  sharePublicMessageUrl?: string | null;
  shareErrorCode?: string;
  tags?: string;
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
        search: filters.search,
      }),
      ...(filters.type && { type: filters.type }),
      ...(filters.downloadStatus && { downloadStatus: filters.downloadStatus }),
      ...(filters.transferStatus && { transferStatus: filters.transferStatus }),
      ...(filters.offline && { offline: "true" }),
      ...(noAccountSpecified && filters.seedOnly && { seedOnly: "true" }),
      ...(filters.tags.length > 0 && {
        tags: filters.tags.join(","),
      }),
      ...(messageThreadId && { messageThreadId: messageThreadId.toString() }),
      ...(link && { link: encodeURIComponent(link) }),
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

    if (noAccountSpecified && filters.seedOnly) {
      params.set(
        "seedOffset",
        (previousPageData.nextSeedOffset ?? 0).toString(),
      );
    } else {
      params.set(
        "fromMessageId",
        previousPageData.nextFromMessageId.toString(),
      );
    }
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

  // Read by updateField's callbacks only; kept in a ref so that writing a status update does not
  // force every consumer of this hook to re-render.
  const pagesRef = useRef(pages);
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  const [debounceLoading] = useDebounce(isLoading || isValidating, 500, {
    leading: true,
    maxWait: 1000,
  });

  // A thumbnail finished downloading in the background; refetch so the list picks up the
  // crisp thumbnailFile. Debounced to coalesce the bursts that happen while browsing.
  const debouncedThumbnailRefetch = useDebouncedCallback(() => {
    void mutate();
  }, 1500);

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
      torrentStatus?: string;
      removed?: boolean;
      type?: string;
      sharedByMe?: boolean;
      shareStatus?: TelegramFile["shareStatus"];
      sharedSourceId?: string;
      sharedResourceId?: string;
      shareTitle?: string;
      shareDescription?: string | null;
      shareTags?: string[];
      shareCategory?: string | null;
      shareAccessScope?: TelegramFile["shareAccessScope"];
      sharePublicMessageUrl?: string | null;
      shareErrorCode?: string;
    };

    if (data.type === "thumbnail") {
      debouncedThumbnailRefetch();
      return;
    }

    const previous = latestFilesStatusRef.current[data.uniqueId];
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
            data.downloadStatus ?? previous?.downloadStatus,
          localPath: data.localPath ?? previous?.localPath,
          completionDate: data.completionDate ?? previous?.completionDate,
          downloadedSize: data.downloadedSize ?? previous?.downloadedSize,
          transferStatus: data.transferStatus ?? previous?.transferStatus,
          thumbnailFile: data.thumbnailFile ?? previous?.thumbnailFile,
          torrentStatus: data.torrentStatus ?? previous?.torrentStatus,
          sharedByMe: data.sharedByMe ?? previous?.sharedByMe,
          shareStatus: data.shareStatus ?? previous?.shareStatus,
          sharedSourceId: data.sharedSourceId ?? previous?.sharedSourceId,
          sharedResourceId:
            data.sharedResourceId ?? previous?.sharedResourceId,
          shareTitle: data.shareTitle ?? previous?.shareTitle,
          shareDescription:
            data.shareDescription ?? previous?.shareDescription,
          shareTags: data.shareTags ?? previous?.shareTags,
          shareCategory: data.shareCategory ?? previous?.shareCategory,
          shareAccessScope:
            data.shareAccessScope ?? previous?.shareAccessScope,
          sharePublicMessageUrl:
            data.sharePublicMessageUrl ?? previous?.sharePublicMessageUrl,
          shareErrorCode: data.shareErrorCode ?? previous?.shareErrorCode,
        },
      };
    }

    // Prevent unbounded growth - keep only the latest 500 entries
    const keys = Object.keys(latestFilesStatusRef.current);
    if (keys.length > 500) {
      const toRemove = keys.slice(0, keys.length - 500);
      for (const key of toRemove) {
        delete latestFilesStatusRef.current[key];
      }
    }
    setUpdateCounter((prev) => prev + 1);
  }, [debouncedThumbnailRefetch, lastJsonMessage]);

  useEffect(() => {
    if (noAccountSpecified && !filters.offline) {
      setFilters((prev) => ({
        ...prev,
        offline: true,
      }));
    }
  }, [filters.offline, noAccountSpecified, setFilters]);

  // Status updates live in a ref and are merged into the fetched rows here. `updateCounter` is the
  // signal that a new update arrived, so the memo recomputes without copying the whole map into
  // state on every download-progress event.
  /* eslint-disable react-hooks/refs */
  const files = useMemo(() => {
    if (!pages) return [];
    const files: TelegramFile[] = [];
    pages.forEach((page) => {
      page.files.forEach((file) => {
        const statusUpdate = latestFilesStatusRef.current[file.uniqueId];
        if (file.originalDeleted && statusUpdate?.removed) {
          return;
        }
        const merged = {
          ...file,
          id: statusUpdate?.fileId ?? file.id,
          tags: statusUpdate?.tags ?? file.tags,
          downloadStatus: statusUpdate?.downloadStatus ?? file.downloadStatus,
          localPath: statusUpdate?.localPath ?? file.localPath,
          completionDate: statusUpdate?.completionDate ?? file.completionDate,
          downloadedSize: statusUpdate?.downloadedSize ?? file.downloadedSize,
          transferStatus: statusUpdate?.transferStatus ?? file.transferStatus,
          thumbnailFile: statusUpdate?.thumbnailFile ?? file.thumbnailFile,
          torrentStatus: statusUpdate?.torrentStatus ?? file.torrentStatus,
          sharedByMe: statusUpdate?.sharedByMe ?? file.sharedByMe,
          shareStatus: statusUpdate?.shareStatus ?? file.shareStatus,
          sharedSourceId: statusUpdate?.sharedSourceId ?? file.sharedSourceId,
          sharedResourceId:
            statusUpdate?.sharedResourceId ?? file.sharedResourceId,
          shareTitle: statusUpdate?.shareTitle ?? file.shareTitle,
          shareDescription:
            statusUpdate?.shareDescription ?? file.shareDescription,
          shareTags: statusUpdate?.shareTags ?? file.shareTags,
          shareCategory: statusUpdate?.shareCategory ?? file.shareCategory,
          shareAccessScope:
            statusUpdate?.shareAccessScope ?? file.shareAccessScope,
          sharePublicMessageUrl:
            statusUpdate?.sharePublicMessageUrl ?? file.sharePublicMessageUrl,
          shareErrorCode:
            statusUpdate?.shareErrorCode ?? file.shareErrorCode,
        };
        // Live WebSocket updates can change a row's status after it was fetched. When a status
        // filter is active, drop rows that no longer match so the filtered view stays consistent
        // (otherwise e.g. a "downloading" filter keeps showing files that just completed).
        if (
          filters.downloadStatus &&
          merged.downloadStatus !== filters.downloadStatus
        ) {
          return;
        }
        if (
          filters.transferStatus &&
          merged.transferStatus !== filters.transferStatus
        ) {
          return;
        }
        files.push(merged);
      });
    });
    files.forEach((file, index) => {
      file.prev = files[index - 1];
      file.next = files[index + 1];
    });
    return files;
  }, [pages, updateCounter, filters.downloadStatus, filters.transferStatus]);
  /* eslint-enable react-hooks/refs */

  const hasMore = useMemo(() => {
    if (!pages || pages.length === 0) return true;

    const fetchedCount = pages.reduce((acc, d) => acc + d.files.length, 0);
    const lastPage = pages[pages.length - 1];
    let hasMore = false;
    if (lastPage) {
      if (lastPage.hasMore !== undefined) return lastPage.hasMore;
      const count = lastPage.count;
      hasMore = count > fetchedCount && lastPage.nextFromMessageId !== 0;
    }
    return hasMore;
  }, [pages]);

  const totalCount = useMemo(() => {
    if (!pages || pages.length === 0) return undefined;
    for (let index = pages.length - 1; index >= 0; index -= 1) {
      const count = pages[index]?.count;
      if (count !== undefined) {
        return count;
      }
    }
    return undefined;
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
    const existing = latestFilesStatusRef.current[uniqueId];
    const currentFile = pagesRef.current
      ?.flatMap((p) => p.files)
      .find((f) => f.uniqueId === uniqueId);
    latestFilesStatusRef.current = {
      ...latestFilesStatusRef.current,
      [uniqueId]: {
        fileId: patch.id ?? existing?.fileId ?? currentFile?.id ?? 0,
        downloadStatus:
          patch.downloadStatus ??
          existing?.downloadStatus ??
          currentFile?.downloadStatus ??
          "completed",
        localPath:
          patch.localPath ?? existing?.localPath ?? currentFile?.localPath,
        completionDate:
          patch.completionDate ??
          existing?.completionDate ??
          currentFile?.completionDate,
        downloadedSize:
          patch.downloadedSize ??
          existing?.downloadedSize ??
          currentFile?.downloadedSize ??
          0,
        transferStatus:
          patch.transferStatus ??
          existing?.transferStatus ??
          currentFile?.transferStatus,
        thumbnailFile:
          patch.thumbnailFile ??
          existing?.thumbnailFile ??
          currentFile?.thumbnailFile,
        torrentStatus:
          patch.torrentStatus ??
          existing?.torrentStatus ??
          currentFile?.torrentStatus,
        sharedByMe:
          patch.sharedByMe ?? existing?.sharedByMe ?? currentFile?.sharedByMe,
        shareStatus:
          patch.shareStatus ??
          existing?.shareStatus ??
          currentFile?.shareStatus,
        sharedSourceId:
          patch.sharedSourceId ??
          existing?.sharedSourceId ??
          currentFile?.sharedSourceId,
        sharedResourceId:
          patch.sharedResourceId ??
          existing?.sharedResourceId ??
          currentFile?.sharedResourceId,
        shareTitle:
          patch.shareTitle ?? existing?.shareTitle ?? currentFile?.shareTitle,
        shareDescription:
          patch.shareDescription ??
          existing?.shareDescription ??
          currentFile?.shareDescription,
        shareTags:
          patch.shareTags ?? existing?.shareTags ?? currentFile?.shareTags,
        shareCategory:
          patch.shareCategory ??
          existing?.shareCategory ??
          currentFile?.shareCategory,
        shareAccessScope:
          patch.shareAccessScope ??
          existing?.shareAccessScope ??
          currentFile?.shareAccessScope,
        sharePublicMessageUrl:
          patch.sharePublicMessageUrl ??
          existing?.sharePublicMessageUrl ??
          currentFile?.sharePublicMessageUrl,
        shareErrorCode:
          patch.shareErrorCode ??
          existing?.shareErrorCode ??
          currentFile?.shareErrorCode,
        tags: patch.tags ?? existing?.tags ?? currentFile?.tags,
      },
    };
    setUpdateCounter((prev) => prev + 1);
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
    loadedCount: files.length,
    totalCount,
    mutate,
  };
}
