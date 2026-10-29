import {
  Bell,
  Copy,
  DownloadCloud,
  EyeOff,
  FolderOpen,
  Gauge,
  LogOut,
  Moon,
  Shield,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import React, { type FormEvent, useState } from "react";
import { useSettings } from "@/hooks/use-settings";
import { useTelegramAccount } from "@/hooks/use-telegram-account";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import TimeRangeSelector from "@/components/ui/time-range-selector";
import { Switch } from "@/components/ui/switch";
import { type SettingKey } from "@/lib/types";
import { Slider } from "@/components/ui/slider";
import { TagsInput } from "@/components/ui/tags-input";
import { split } from "lodash";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useAdminSession } from "@/hooks/use-admin-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SettingsSectionProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-4 pt-0">
        {children}
      </CardContent>
    </Card>
  );
}

interface SettingRowProps {
  label: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

function SettingRow({
  label,
  description,
  children,
  onClick,
}: SettingRowProps) {
  return (
    <div
      className="flex flex-col gap-3 rounded-md border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      onClick={onClick}
    >
      <div className="min-w-0">
        <Label className={onClick ? "cursor-pointer" : undefined}>
          {label}
        </Label>
        {description && (
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsForm() {
  const { settings, setSetting, updateSettings } = useSettings();
  const { account } = useTelegramAccount();
  const { session, logout } = useAdminSession();
  const [, copyToClipboard] = useCopyToClipboard();
  const [loggingOut, setLoggingOut] = useState(false);

  const avgSpeedIntervalOptions = [
    { value: "60", label: "1 分钟" },
    { value: "300", label: "5 分钟" },
    { value: "600", label: "10 分钟" },
    { value: "900", label: "15 分钟" },
    { value: "1800", label: "30 分钟" },
  ];

  const tdlibIdleTimeoutOptions = [
    { value: "1", label: "1 分钟" },
    { value: "5", label: "5 分钟" },
    { value: "10", label: "10 分钟" },
    { value: "30", label: "30 分钟" },
    { value: "60", label: "1 小时" },
    { value: "0", label: "从不" },
  ];

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    await updateSettings();
  };

  const handleSwitchChange = (
    key: SettingKey,
    event?: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (event && event.target instanceof HTMLInputElement) return;
    event?.stopPropagation();
    void setSetting(key, String(!(settings?.[key] === "true")));
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="flex h-full flex-col overflow-hidden"
    >
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
        <div className="flex items-start gap-3 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Bell className="mt-0.5 size-4 shrink-0" />
          <p>这些设置将应用于所有 Telegram 账户。</p>
        </div>

        <SettingsSection
          icon={FolderOpen}
          title="存储"
          description="当前账户的存储位置"
        >
          <div className="flex flex-col gap-2 rounded-md border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <Label>您的根目录路径</Label>
              <Badge variant="secondary">只读</Badge>
            </div>
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                {account?.rootPath || "未选择账户"}
              </p>
              <Button
                variant="ghost"
                size="icon"
                aria-label="复制根目录路径"
                disabled={!account?.rootPath}
                onClick={(e) => {
                  e.preventDefault();
                  void copyToClipboard(account?.rootPath ?? "");
                }}
              >
                <Copy />
              </Button>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Moon}
          title="TDLib 休眠"
          description="关闭空闲的 Telegram 客户端，停止后台磁盘活动"
        >
          <div className="grid gap-4 rounded-md border bg-card p-4 shadow-sm md:grid-cols-[1fr_220px] md:items-center">
            <div>
              <Label htmlFor="tdlib-idle-timeout">空闲多久后休眠</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                打开账户时 TDLib 会自动重启。启用了自动下载或自动预加载的账户不会休眠。
              </p>
            </div>
            <Select
              value={String(settings?.tdlibIdleTimeoutMinutes ?? "0")}
              onValueChange={(value) =>
                void setSetting("tdlibIdleTimeoutMinutes", value)
              }
            >
              <SelectTrigger id="tdlib-idle-timeout">
                <SelectValue placeholder="选择空闲超时" />
              </SelectTrigger>
              <SelectContent>
                {tdlibIdleTimeoutOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Gauge}
          title="显示"
          description="单位与表格显示偏好"
        >
          <SettingRow
            label="速度单位"
            description="选择应用中传输速度的显示方式。"
          >
            <RadioGroup
              value={settings?.speedUnits || "bits"}
              onValueChange={(v) => void setSetting("speedUnits", v)}
              className="group inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground"
              data-state={settings?.speedUnits || "bits"}
            >
              <label className="inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-data-[state=bits]:bg-background group-data-[state=bits]:text-foreground group-data-[state=bits]:shadow">
                bits
                <RadioGroupItem
                  id="enspeedUnits-bits"
                  value="bits"
                  className="sr-only"
                />
              </label>
              <label className="inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-data-[state=bytes]:bg-background group-data-[state=bytes]:text-foreground group-data-[state=bytes]:shadow">
                bytes
                <RadioGroupItem
                  id="speedUnits-bytes"
                  value="bytes"
                  className="sr-only"
                />
              </label>
            </RadioGroup>
          </SettingRow>

          <SettingRow
            label="仅显示唯一文件"
            description={
              <>
                在表格中仅显示唯一文件。启用后，文档数量可能不够精确。
              </>
            }
            onClick={(event) => handleSwitchChange("uniqueOnly", event)}
          >
            <Switch
              id="unique-only"
              checked={settings?.uniqueOnly === "true"}
              onCheckedChange={() => handleSwitchChange("uniqueOnly")}
            />
          </SettingRow>
        </SettingsSection>

        <SettingsSection
          icon={EyeOff}
          title="隐私"
          description="控制敏感文件内容在列表中的显示方式"
        >
          <SettingRow
            label="始终隐藏"
            description="始终隐藏表格中的内容和额外信息。"
            onClick={(event) => handleSwitchChange("alwaysHide", event)}
          >
            <Switch
              id="always-hide"
              checked={settings?.alwaysHide === "true"}
              onCheckedChange={() => handleSwitchChange("alwaysHide")}
            />
          </SettingRow>

          {settings?.alwaysHide === "false" && (
            <SettingRow
              label="显示敏感内容"
              description="禁用时，敏感内容依然存在，但会被遮罩隐藏。"
              onClick={(event) =>
                handleSwitchChange("showSensitiveContent", event)
              }
            >
              <Switch
                id="show-sensitive-content"
                checked={settings?.showSensitiveContent === "true"}
                onCheckedChange={() =>
                  handleSwitchChange("showSensitiveContent")
                }
              />
            </SettingRow>
          )}
        </SettingsSection>

        <SettingsSection
          icon={DownloadCloud}
          title="自动下载"
          description="自动下载的限制与时间设置"
        >
          <SettingRow
            label="自动加载缩略图"
            description="浏览文件时下载轻量级的预览缩略图。"
            onClick={(event) => handleSwitchChange("thumbnailAutoLoad", event)}
          >
            <Switch
              id="thumbnail-auto-load"
              checked={settings?.thumbnailAutoLoad === "true"}
              onCheckedChange={() => handleSwitchChange("thumbnailAutoLoad")}
            />
          </SettingRow>

          <div className="rounded-md border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="limit">每个账户的限制</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  每个账户并发自动下载的最大数量。包括你手动发起的下载。
                </p>
              </div>
              <span className="text-muted-foreground">
                {settings?.autoDownloadLimit ?? 5} / 50
              </span>
            </div>
            <Slider
              value={[Number(settings?.autoDownloadLimit ?? 5)]}
              onValueChange={(v) => {
                void setSetting("autoDownloadLimit", String(v[0]));
              }}
              min={1}
              max={50}
              step={1}
              className="mt-4 w-full"
            />
          </div>

          <div className="grid gap-4 rounded-md border bg-card p-4 shadow-sm md:grid-cols-[1fr_220px] md:items-center">
            <div>
              <Label htmlFor="avg-speed-interval">平均速度计算间隔</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                更长的间隔会让速度曲线更平滑，但可能消耗更多内存。
              </p>
            </div>
            <Select
              value={String(settings?.avgSpeedInterval)}
              onValueChange={(v) => void setSetting("avgSpeedInterval", v)}
            >
              <SelectTrigger id="avg-speed-interval">
                <SelectValue placeholder="选择平均速度间隔" />
              </SelectTrigger>
              <SelectContent>
                {avgSpeedIntervalOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3 rounded-md border bg-card p-4 shadow-sm">
            <Label htmlFor="time-limited">时间限制</Label>
            <TimeRangeSelector
              startRequired={true}
              endRequired={true}
              includeSeconds={false}
              timeRange={
                settings?.autoDownloadTimeLimited
                  ? JSON.parse(settings.autoDownloadTimeLimited)
                  : { startTime: "00:00", endTime: "00:00" }
              }
              onTimeRangeChange={(
                startTime: string | null,
                endTime: string | null,
              ) => {
                void setSetting(
                  "autoDownloadTimeLimited",
                  JSON.stringify({
                    startTime: startTime ?? "00:00",
                    endTime: endTime ?? "00:00",
                  }),
                );
              }}
              className="max-w-md"
            />
            <p className="text-sm text-muted-foreground">
              下载的时间范围。如果不想设置时间范围，可将开始和结束时间都设置为
              00:00。
            </p>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Tags}
          title="标签"
          description="整理文件时可复用的标签"
        >
          <div className="rounded-md border bg-card p-4 shadow-sm">
            <TagsInput
              maxTags={20}
              value={
                (settings?.tags?.length ?? 0) > 0
                  ? split(settings?.tags, ",")
                  : []
              }
              onChange={(tags) => void setSetting("tags", tags.join(","))}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Shield}
          title="管理员会话"
          description="在此设备上结束当前管理员会话"
        >
          <div className="flex items-center justify-between gap-4 rounded-md border bg-card p-4 shadow-sm">
            <div className="flex min-w-0 flex-col gap-1">
              <Label>已登录账户</Label>
              <p className="truncate text-xs text-muted-foreground">
                当前登录：{session?.username ?? "管理员"}
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              disabled={loggingOut}
              onClick={() => void handleLogout()}
            >
              <LogOut data-icon="inline-start" />
              {loggingOut ? "正在退出..." : "退出登录"}
            </Button>
          </div>
        </SettingsSection>
      </div>
      <DialogFooter className="mt-3 gap-2 border-t bg-background pt-3">
        <DialogClose asChild>
          <Button className="w-full md:w-auto" variant="outline" type="button">
            取消
          </Button>
        </DialogClose>
        <Button className="w-full md:w-auto" type="submit">
          保存设置
        </Button>
      </DialogFooter>
    </form>
  );
}
