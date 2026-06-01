import {
  AlertTriangle,
  ArrowRight,
  Check,
  Download,
  HardDrive,
  Loader2,
  LoaderPinwheel,
  MessageSquare,
  UserPlus,
} from "lucide-react";
import { AccountList } from "./account-list";
import { type TelegramAccount } from "@/lib/types";
import TelegramIcon from "@/components/telegram-icon";
import { AccountDialog } from "@/components/account-dialog";
import React from "react";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/ui/border-beam";
import useSWR from "swr";
import prettyBytes from "pretty-bytes";
import { Card, CardContent } from "./ui/card";
import { useRouter } from "next/navigation";
import useIsMobile from "@/hooks/use-is-mobile";

interface EmptyStateProps {
  isLoadingAccount?: boolean;
  hasAccounts: boolean;
  accounts?: TelegramAccount[];
  message?: string;
  onSelectAccount?: (accountId: string) => void;
}

export function EmptyState({
  isLoadingAccount,
  hasAccounts,
  accounts = [],
  message,
  onSelectAccount,
}: EmptyStateProps) {
  const isMobile = useIsMobile();
  if (message) {
    return (
      <div className="flex flex-col items-center">
        <MessageSquare className="mb-4 h-16 w-16 text-muted-foreground" />
        <h2 className="mb-2 text-2xl font-semibold">{message}</h2>
        <p className="text-muted-foreground">
          从上方的下拉菜单中选择一个聊天，查看和管理其文件。
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-8 flex flex-col items-center text-center">
        {hasAccounts ? (
          <>
            <TelegramIcon className="mb-4 h-16 w-16 text-muted-foreground" />
            {!isMobile && (
              <>
                <h2 className="mb-2 text-2xl font-semibold">
                  选择一个账户
                </h2>
                <p className="mb-4 max-w-md text-muted-foreground">
                  选择一个 Telegram 账户来查看和管理您的文件。您可以使用下方按钮添加更多账户。
                </p>
              </>
            )}
          </>
        ) : (
          <>
            <TelegramIcon className="mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="mb-2 text-2xl font-semibold">未找到账户</h2>
            <p className="mb-4 max-w-md text-muted-foreground">
              添加一个 Telegram 账户以开始管理您的文件。您可以添加多个账户并在它们之间切换。
            </p>
          </>
        )}
        <div className="flex items-center justify-center space-x-4">
          <AccountDialog isAdd={true}>
            <div className="relative rounded-md">
              <BorderBeam size={60} duration={12} delay={9} />
              <Button variant="outline">
                <UserPlus className="mr-2 h-4 w-4" />
                添加账户
              </Button>
            </div>
          </AccountDialog>
        </div>
      </div>

      <AllFiles />

      {isLoadingAccount && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoaderPinwheel
            className="h-8 w-8 animate-spin"
            style={{ strokeWidth: "0.8px" }}
          />
        </div>
      )}

      {hasAccounts && accounts.length > 0 && onSelectAccount && (
        <AccountList accounts={accounts} onSelectAccount={onSelectAccount} />
      )}
    </div>
  );
}

interface FileCount {
  downloading: number;
  completed: number;
  downloadedSize: number;
}

function AllFiles() {
  const router = useRouter();
  const { data, error, isLoading } = useSWR<FileCount, Error>(`/files/count`);
  const isMobile = useIsMobile();

  if (error) {
    return (
      <Card className="mx-auto mb-8 max-w-5xl">
        <CardContent className="flex items-center justify-center p-6 text-red-500">
          <AlertTriangle className="mr-2" />
          加载文件计数失败
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card className="mx-auto mb-8 max-w-5xl">
        <CardContent className="flex items-center justify-center p-6 text-gray-500">
          <Loader2 className="mr-2 animate-spin" />
          正在加载文件计数...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="mx-auto mb-8 max-w-5xl"
      onClick={() => isMobile && router.push("/files")}
    >
      <CardContent className="flex items-center justify-between p-3">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center justify-center gap-3 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
            <Check className="text-green-500" />
            <span className="hidden text-sm font-medium md:inline-block">
              已下载
            </span>
            <span className="text-sm font-medium">{data.completed}</span>
          </div>
          <div className="flex items-center justify-center gap-3 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
            <Download className="text-blue-500" />
            <span className="hidden text-sm font-medium md:inline-block">
              下载中
            </span>
            <span className="text-sm font-medium">{data.downloading}</span>
          </div>
          <div className="flex items-center justify-center gap-3 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
            <HardDrive className="text-purple-500" />
            <span className="hidden text-sm font-medium md:inline-block">
              大小
            </span>
            <span className="text-sm font-medium">
              {prettyBytes(data.downloadedSize)}
            </span>
          </div>
        </div>
        {!isMobile && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/files")}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
