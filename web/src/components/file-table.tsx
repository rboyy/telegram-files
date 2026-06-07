"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { LoaderPinwheel, SquareChevronLeft, WandSparkles, Trash2 } from "lucide-react";
import { useFiles } from "@/hooks/use-files";
import {
  getRowHeightPX,
  TableRowHeightSwitch,
  useRowHeightLocalStorage,
} from "@/components/table-row-height-switch";
import TableColumnFilter, {
  type Column,
} from "@/components/table-column-filter";
import { cn } from "@/lib/utils";
import FileNotFount from "@/components/file-not-found";
import FileRow from "@/components/file-row";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type TelegramFile } from "@/lib/types";
import FileViewer from "@/components/file-viewer";
import FileFilters from "./file-filters";
import { Badge } from "@/components/ui/badge";
import FileBatchControl from "@/components/file-batch-control";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { POST } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const COLUMNS: Column[] = [
  {
    id: "content",
    label: "内容",
    isVisible: true,
    className: "text-center",
  },
  { id: "type", label: "类型", isVisible: true, className: "w-16 text-center" },
  {
    id: "size",
    label: "大小",
    isVisible: true,
    className: "w-20 text-center",
  },
  {
    id: "status",
    label: "状态",
    isVisible: true,
    className: "w-32 text-center",
  },
  {
    id: "tags",
    label: "标签",
    isVisible: true,
    className: "w-32",
  },
  {
    id: "extra",
    label: "附加信息",
    isVisible: true,
    className: "flex-1 max-w-44 overflow-hidden lg:max-w-none",
  },
  {
    id: "actions",
    label: "操作",
    isVisible: true,
    className: "text-center w-40 min-w-40",
  },
];

interface FileTableProps {
  accountId: string;
  chatId: string;
  messageThreadId?: number;
  link?: string;
}

export function FileTable({
  accountId,
  chatId,
  messageThreadId,
  link,
}: FileTableProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const tableParentRef = useRef(null);
  const [columns, setColumns] = useState<Column[]>(COLUMNS);
  const [rowHeight, setRowHeight] = useRowHeightLocalStorage(
    "telegramFileList",
    "m",
  );
  const useFilesProps = useFiles(accountId, chatId, messageThreadId, link);
  const {
    filters,
    updateField,
    handleFilterChange,
    clearFilters,
    isLoading,
    size,
    files,
    handleLoadMore,
    mutate,
  } = useFilesProps;
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const handleDeleteAllCompleted = async () => {
    setIsDeletingAll(true);
    try {
      const result = await POST("/files/remove-all-completed");
      // 刷新文件列表
      await mutate();
      setDeleteAllDialogOpen(false);
      
      // 显示成功反馈
      if (result && result.removed > 0) {
        toast({
          title: "删除成功",
          description: `已删除 ${result.removed} 个已下载文件${
            result.filesFromDisk ? `，清理了 ${result.filesFromDisk} 个磁盘文件` : ""
          }`,
          variant: "default",
        });
      } else if (result && result.removed === 0 && result.total === 0) {
        toast({
          title: "没有可删除的文件",
          description: "当前没有已下载完成的文件需要删除",
          variant: "default",
        });
      } else {
        toast({
          title: "删除完成",
          description: "部分文件可能未删除，请查看日志了解详情",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Failed to delete all completed files:", error);
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "删除文件时发生未知错误",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAll(false);
    }
  };
  const [currentViewFile, setCurrentViewFile] = useState<
    TelegramFile | undefined
  >();
  const [viewerOpen, setViewerOpen] = useState(false);
  const rowVirtual = useVirtualizer({
    count: files.length,
    getScrollElement: () => tableParentRef.current,
    estimateSize: (index) => {
      const file = files[index]!;
      const height = getRowHeightPX(rowHeight);

      if (
        file.downloadStatus === "idle" ||
        file.downloadStatus === "completed" ||
        file.size === 0
      ) {
        return height;
      }
      return height + 8;
    },
    paddingStart: 1,
    paddingEnd: 1,
  });

  useEffect(() => {
    rowVirtual.measure();
  }, [rowHeight, rowVirtual]);

  useEffect(() => {
    const [lastItem] = [...rowVirtual.getVirtualItems()].reverse();
    if (!lastItem) {
      return;
    }

    if (lastItem.index >= files.length - 1) {
      void handleLoadMore();
    }
    //eslint-disable-next-line
  }, [files.length, handleLoadMore, rowVirtual.getVirtualItems()]);

  useEffect(() => {
    if (files.length === 0 || !currentViewFile) {
      return;
    }
    const index = files.findIndex((f) => f.id === currentViewFile.id);
    if (index === -1) {
      setCurrentViewFile(undefined);
      return;
    }
    const file = files[index]!;
    if (currentViewFile.next === undefined && file.next !== undefined) {
      setCurrentViewFile(file);
    }
  }, [currentViewFile, files]);

  const dynamicClass = useMemo(() => {
    switch (rowHeight) {
      case "s":
        return {
          content: "h-6 w-6",
          contentCell: "w-16",
        };
      case "m":
        return {
          content: "h-20 w-20",
          contentCell: "w-24",
        };
      case "l":
        return {
          content: "h-60 w-60",
          contentCell: "w-64",
        };
    }
  }, [rowHeight]);

  const handleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map((file) => file.id)));
    }
  };

  const handleSelectFile = (fileId: number) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  return (
    <>
      <div className="mb-6 flex flex-col flex-wrap justify-between gap-2 md:flex-row">
        <div className="flex items-center gap-3">
          {messageThreadId && (
            <Button
              variant="link"
              onClick={() => {
                window.history.back();
              }}
            >
              <SquareChevronLeft className="h-4 w-4" />
              返回
            </Button>
          )}
          {link ? (
            <Badge variant="outline" className="flex h-full bg-accent">
              <WandSparkles className="mr-2 h-4 w-4" />
              {link}
            </Badge>
          ) : (
            <>
              <Badge variant="outline" className="flex h-full bg-accent">
                {filters.type.charAt(0).toUpperCase() + filters.type.slice(1)}
              </Badge>
              <FileFilters
                telegramId={accountId}
                chatId={chatId}
                filters={filters}
                onFiltersChange={handleFilterChange}
                clearFilters={clearFilters}
              />
            </>
          )}
        </div>
        <div className="hidden gap-4 md:flex">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteAllDialogOpen(true)}
            disabled={isDeletingAll}
          >
            {isDeletingAll ? (
              <LoaderPinwheel className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            删除所有已下载
          </Button>
          <TableColumnFilter
            columns={columns}
            onColumnConfigChange={setColumns}
          />
          <TableRowHeightSwitch
            rowHeight={rowHeight}
            setRowHeightAction={setRowHeight}
          />
        </div>
      </div>
      {currentViewFile && (
        <FileViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          file={currentViewFile}
          onFileChange={setCurrentViewFile}
          {...useFilesProps}
        />
      )}
      <div className="h-[calc(100vh-13rem)] space-y-4 overflow-hidden">
        <FileBatchControl
          files={files}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
          updateField={updateField}
        />

        <div
          className="no-scrollbar relative h-full overflow-auto rounded-md border"
          ref={tableParentRef}
        >
          <div className="sticky top-0 z-20 flex h-10 items-center border-b bg-background/90 text-sm text-muted-foreground backdrop-blur-sm">
            <div className="w-[30px] text-center">
              <Checkbox
                checked={selectedFiles.size === files.length}
                onCheckedChange={handleSelectAll}
              />
            </div>
            {columns.map((col) =>
              col.isVisible ? (
                <div
                  key={col.id}
                  suppressHydrationWarning
                  className={cn(
                    col.className ?? "",
                    col.id === "content" ? dynamicClass.contentCell : "",
                  )}
                >
                  {col.label}
                </div>
              ) : null,
            )}
          </div>
          {size === 1 && isLoading && (
            <div className="sticky left-1/2 top-0 z-10 flex h-full w-full items-center justify-center bg-accent">
              <LoaderPinwheel
                className="h-8 w-8 animate-spin"
                style={{ strokeWidth: "0.8px" }}
              />
            </div>
          )}
          <div className="h-full">
            <div
              className={cn("relative w-full")}
              style={{ height: `${rowVirtual.getTotalSize()}px` }}
            >
              {files.length !== 0 &&
                rowVirtual.getVirtualItems().map((virtualRow) => {
                  const file = files[virtualRow.index]!;
                  return (
                    <FileRow
                      index={virtualRow.index}
                      className={cn(
                        "absolute left-0 top-0 flex w-full items-center",
                      )}
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      ref={rowVirtual.measureElement}
                      file={file}
                      updateField={updateField}
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={() => handleSelectFile(file.id)}
                      onFileClick={() => {
                        setCurrentViewFile(file);
                        setViewerOpen(true);
                      }}
                      properties={{
                        rowHeight: rowHeight,
                        dynamicClass,
                        columns,
                      }}
                      key={`${file.messageId}-${file.uniqueId}-${virtualRow.index}`}
                    />
                  );
                })}
            </div>
            {!isLoading && files.length === 0 && <FileNotFount />}
          </div>
        </div>
      </div>

      <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl font-bold">确认删除所有已下载文件</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              此操作将删除所有下载状态为“已完成”的文件。删除后不可恢复！
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4 rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center justify-center gap-2 text-center">
              <Trash2 className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  将删除 <span className="font-bold text-foreground">
                    {files.filter(f => f.downloadStatus === "completed").length}
                  </span> 个文件
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" className="flex-1">取消</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteAllCompleted}
              disabled={isDeletingAll}
              className="flex-1"
            >
              {isDeletingAll ? (
                <>
                  <LoaderPinwheel className="mr-2 h-4 w-4 animate-spin" />
                  删除中...
                </>
              ) : (
                "确认删除"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
