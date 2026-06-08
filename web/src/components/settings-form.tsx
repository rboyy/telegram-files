import { Bell, Copy } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import React, { type FormEvent } from "react";
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

export default function SettingsForm() {
  const { settings, setSetting, updateSettings } = useSettings();
  const { account } = useTelegramAccount();
  const [, copyToClipboard] = useCopyToClipboard();

  const avgSpeedIntervalOptions = [
    { value: "60", label: "1 分钟" },
    { value: "300", label: "5 分钟" },
    { value: "600", label: "10 分钟" },
    { value: "900", label: "15 分钟" },
    { value: "1800", label: "30 分钟" },
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

  return (
    <form
      onSubmit={handleSave}
      className="flex h-full flex-col overflow-hidden"
    >
      <div className="no-scrollbar flex flex-col space-y-4 overflow-y-scroll">
        <p className="rounded-md bg-gray-50 p-2 text-sm text-muted-foreground dark:bg-gray-700">
          <Bell className="mr-2 inline-block h-4 w-4" />
          这些设置将应用于所有账户。
        </p>
        <div className="w-full rounded-md border p-4 shadow">
          <p className="mb-1 text-xs text-muted-foreground">您的根目录路径</p>
          <div className="flex items-center justify-between space-x-1">
            <p className="rounded-md bg-gray-50 p-2 text-xs text-muted-foreground dark:bg-gray-700">
              {account?.rootPath}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                void copyToClipboard(account?.rootPath ?? "");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex w-full cursor-pointer flex-col space-y-4 rounded-md border p-4 shadow">
          <div className="flex items-center justify-between">
            <Label>速度单位</Label>
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
          </div>
        </div>
        <div
          className="flex w-full cursor-pointer flex-col space-y-4 rounded-md border p-4 shadow"
          onClick={(event) => handleSwitchChange("uniqueOnly", event)}
        >
          <div className="flex items-center justify-between">
            <Label>仅显示唯一文件</Label>
            <Switch
              id="unique-only"
              checked={settings?.uniqueOnly === "true"}
              onCheckedChange={() => handleSwitchChange("uniqueOnly")}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            在表格中仅显示唯一文件。如果禁用，将显示所有文件。{" "}
            <br />
            <strong>警告：</strong>如果启用，表单上的文档数量将不准确。
          </p>
        </div>
        <div className="flex w-full flex-col space-y-4 rounded-md border p-4 shadow">
          <div
            className="flex cursor-pointer flex-col space-y-4"
            onClick={(event) => handleSwitchChange("alwaysHide", event)}
          >
            <div className="flex items-center justify-between">
              <Label>始终隐藏</Label>
              <Switch
                id="always-hide"
                checked={settings?.alwaysHide === "true"}
                onCheckedChange={() => handleSwitchChange("alwaysHide")}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              始终隐藏表格中的内容和额外信息。
            </p>
          </div>
          {settings?.alwaysHide === "false" && (
            <div
              className="flex cursor-pointer flex-col space-y-4"
              onClick={(event) =>
                handleSwitchChange("showSensitiveContent", event)
              }
            >
              <div className="flex items-center justify-between">
                <Label>显示敏感内容</Label>
                <Switch
                  id="show-sensitive-content"
                  checked={settings?.showSensitiveContent === "true"}
                  onCheckedChange={() =>
                    handleSwitchChange("showSensitiveContent")
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                在表格中显示敏感内容，如果禁用，将使用遮罩隐藏敏感内容。
              </p>
            </div>
          )}
        </div>
        <div className="flex w-full flex-col space-y-4 rounded-md border p-4 shadow">
          <Label>自动下载设置</Label>
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="limit">每个账户的限制</Label>
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
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              每个账户最多下载的文件数量。 <br />
              这对于限制并发下载数量很有用。包括你手动下载的数量。
            </p>
          </div>
          <div className="flex flex-col space-y-4">
            <Label htmlFor="avg-speed-interval">平均速度计算间隔</Label>
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
            <p className="text-xs text-muted-foreground">
              计算平均下载速度的间隔时间。 <br />
              更长的间隔可能会消耗更多内存。
            </p>
          </div>
          <div className="flex flex-col space-y-4">
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
            <p className="text-xs text-muted-foreground">
              下载的时间范围。开始和结束时间是必填的。{" "}
              <br />
              如果你不想设置时间范围，可以将开始和结束时间都设置为 00:00。
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col space-y-4 rounded-md border p-4 shadow">
          <Label>标签设置</Label>
          <div className="flex flex-col space-y-4">
            <TagsInput
              maxTags={20}
              value={
                (settings?.tags?.length ?? 0 > 0)
                  ? split(settings?.tags, ",")
                  : []
              }
              onChange={(tags) => void setSetting("tags", tags.join(","))}
            />
          </div>
        </div>
      </div>
      <DialogFooter className="mt-2 flex-1 gap-2">
        <DialogClose asChild>
          <Button className="w-full md:w-auto" variant="outline" type="button">
            取消
          </Button>
        </DialogClose>
        <Button className="w-full md:w-auto" type="submit">
          提交
        </Button>
      </DialogFooter>
    </form>
  );
}
