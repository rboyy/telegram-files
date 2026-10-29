import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  type Auto,
  type AutoDownloadRule,
  type AutoTransferRule,
  DuplicationPolicies,
  type DuplicationPolicy,
  type FileType,
  TransferPolices,
  type TransferPolicy,
} from "@/lib/types";
import React, { useId, useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ChevronsUpDown,
  Download,
  ExternalLink,
  FolderSync,
  PackageSearch,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useMutationObserver } from "@/hooks/use-mutation-observer";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

interface AutomationFormProps {
  auto: Auto;
  onChange: (auto: Auto) => void;
}

function AutomationToggleSection({
  id,
  title,
  description,
  checked,
  icon,
  onCheckedChange,
  children,
}: React.PropsWithChildren<{
  id: string;
  title: string;
  description: string;
  checked: boolean;
  icon: React.ReactNode;
  onCheckedChange: (checked: boolean) => void;
}>) {
  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="min-w-0">
            <Label htmlFor={id} className="font-semibold">
              {title}
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      </div>
      {children && <div className="mt-4 flex flex-col gap-4">{children}</div>}
    </section>
  );
}

function HintPanel({ children }: React.PropsWithChildren) {
  return (
    <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function HintLine({ children }: React.PropsWithChildren) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
      <div className="leading-6">{children}</div>
    </div>
  );
}

export default function AutomationForm({
  auto,
  onChange,
}: AutomationFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <AutomationToggleSection
        id="enable-preload"
        title="启用预加载"
        description="提前索引对话中的文件，以便离线搜索。"
        checked={auto.preload.enabled}
        icon={<PackageSearch />}
        onCheckedChange={(checked) => {
          onChange({
            ...auto,
            preload: {
              ...auto.preload,
              enabled: checked,
            },
          });
        }}
      >
        {auto.preload.enabled && (
          <HintPanel>
            <HintLine>所有文件将被加载到索引中，但不会被下载。</HintLine>
          </HintPanel>
        )}
      </AutomationToggleSection>
      <AutomationToggleSection
        id="enable-auto-download"
        title="启用自动下载"
        description="自动下载符合所配置规则的文件。"
        checked={auto.download.enabled}
        icon={<Download />}
        onCheckedChange={(checked) => {
          onChange({
            ...auto,
            download: {
              ...auto.download,
              enabled: checked,
            },
          });
        }}
      >
        {auto.download.enabled && (
          <>
            <HintPanel>
              <HintLine>匹配的文件将被自动下载。</HintLine>
              <HintLine>
                如果启用下载历史记录，历史消息中的文件将被优先下载，然后自动下载新消息中的文件。
              </HintLine>
              <HintLine>
                下载顺序：
                <Badge variant="secondary" className="ml-1 font-normal">
                  {"照片 -> 视频 -> 音频 -> 文件"}
                </Badge>
              </HintLine>
            </HintPanel>
            <DownloadRule
              value={auto.download.rule}
              onChange={(value) => {
                onChange({
                  ...auto,
                  download: {
                    ...auto.download,
                    rule: value,
                  },
                });
              }}
            />
          </>
        )}
      </AutomationToggleSection>
      <AutomationToggleSection
        id="enable-transfer"
        title="启用转移"
        description="自动将下载的文件移动到目标文件夹。"
        checked={auto.transfer.enabled}
        icon={<FolderSync />}
        onCheckedChange={(checked) => {
          onChange({
            ...auto,
            transfer: {
              ...auto.transfer,
              enabled: checked,
            },
          });
        }}
      >
        {auto.transfer.enabled && (
          <>
            <HintPanel>
              <HintLine>下载的文件将被转移到指定位置。</HintLine>
            </HintPanel>
            <TransferRule
              value={auto.transfer.rule}
              onChange={(value) => {
                onChange({
                  ...auto,
                  transfer: {
                    ...auto.transfer,
                    rule: value,
                  },
                });
              }}
            />
          </>
        )}
      </AutomationToggleSection>
    </div>
  );
}

interface DownloadRuleProps {
  value: AutoDownloadRule;
  onChange: (value: AutoDownloadRule) => void;
}

function DownloadRule({ value, onChange }: DownloadRuleProps) {
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      query: e.target.value,
    });
  };

  const handleFilterExprChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    onChange({
      ...value,
      filterExpr: e.target.value,
    });
  };

  const handleFileTypeSelect = (type: string) => {
    if (value.fileTypes.includes(type as Exclude<FileType, "media">)) {
      return;
    }

    onChange({
      ...value,
      fileTypes: [...value.fileTypes, type as Exclude<FileType, "media">],
    });
  };

  const removeFileType = (typeToRemove: string) => {
    onChange({
      ...value,
      fileTypes: value.fileTypes.filter((type) => type !== typeToRemove),
    });
  };

  return (
    <Accordion type="single" collapsible className="rounded-lg border bg-card">
      <AccordionItem value="advanced" className="border-none px-4">
        <AccordionTrigger className="hover:no-underline">
          高级
        </AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-4 rounded-md border bg-muted/20 p-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="query-keyword">查询关键词</Label>
              <Input
                id="query-keyword"
                type="text"
                className="w-full"
                placeholder="输入关键词来过滤文件"
                value={value.query}
                onChange={handleQueryChange}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="filter-expr">
                过滤表达式
                <Link
                  href="https://github.com/jarvis2f/telegram-files/blob/main/misc/filter-expression-guide.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  了解更多
                  <ExternalLink className="size-3" />
                </Link>
              </Label>
              <Textarea
                id="filter-expr"
                className="min-h-24 w-full"
                placeholder="输入过滤表达式（例如：str:contains(content.text.text, 'Hello') and id > 1000）"
                value={value.filterExpr}
                onChange={handleFilterExprChange}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="fileTypes">过滤文件类型</Label>
              <Select onValueChange={handleFileTypeSelect}>
                <SelectTrigger id="fileTypes">
                  <SelectValue placeholder="选择文件类型" />
                </SelectTrigger>
                <SelectContent>
                  {["photo", "video", "audio", "file"].map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex min-h-8 flex-wrap gap-2">
                {value.fileTypes.length > 0 ? (
                  value.fileTypes.map((type) => (
                    <Badge
                      key={type}
                      className="flex items-center gap-1 px-2 py-1 capitalize"
                      variant="secondary"
                    >
                      {type}
                      <button
                        type="button"
                        aria-label={`移除 ${type}`}
                        className="rounded-sm text-muted-foreground transition hover:text-foreground"
                        onClick={() => removeFileType(type)}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    未选择文件类型
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-md border bg-background p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="download-history">下载历史文件</Label>
                <Switch
                  id="download-history"
                  checked={value.downloadHistory}
                  onCheckedChange={(checked) =>
                    onChange({
                      ...value,
                      downloadHistory: checked,
                    })
                  }
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                如果启用，所有历史文件将被下载。否则，仅下载新文件。
              </p>
            </div>
            <div className="rounded-md border bg-background p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="download-comment-files">下载评论文件</Label>
                <Switch
                  id="download-comment-files"
                  checked={value.downloadCommentFiles}
                  onCheckedChange={(checked) =>
                    onChange({
                      ...value,
                      downloadCommentFiles: checked,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

interface TransferRuleProps {
  value: AutoTransferRule;
  onChange: (value: AutoTransferRule) => void;
}

function TransferRule({ value, onChange }: TransferRuleProps) {
  const captionNameId = useId();
  const handleTransferRuleChange = (changes: Partial<AutoTransferRule>) => {
    onChange({
      ...value,
      ...changes,
    });
  };

  return (
    <Accordion type="single" collapsible className="rounded-lg border bg-card">
      <AccordionItem value="advanced" className="border-none px-4">
        <AccordionTrigger className="hover:no-underline">
          高级
        </AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-4 rounded-md border bg-muted/20 p-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="destination">自动转移的目标文件夹</Label>
              <Input
                id="destination"
                type="text"
                className="w-full"
                placeholder="输入目标文件夹"
                value={value.destination}
                onChange={(e) => {
                  handleTransferRuleChange({ destination: e.target.value });
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="transfer-policy">转移策略</Label>
              <PolicySelect
                policyType="transfer"
                value={value.transferPolicy}
                onChange={(policy) =>
                  handleTransferRuleChange({
                    transferPolicy: policy as TransferPolicy,
                  })
                }
              />
            </div>

            {value.transferPolicy === "GROUP_BY_AI" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="prompt-template">AI分类提示模板</Label>
                <Textarea
                  id="prompt-template"
                  className="min-h-28 w-full"
                  rows={4}
                  placeholder="输入提示模板来指导AI分类"
                  value={value.extra.promptTemplate || ""}
                  onChange={(e) =>
                    handleTransferRuleChange({
                      extra: {
                        ...value.extra,
                        promptTemplate: e.target.value,
                      },
                    })
                  }
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="duplication-policy">重复文件策略</Label>
              <PolicySelect
                policyType="duplication"
                value={value.duplicationPolicy}
                onChange={(policy) =>
                  handleTransferRuleChange({
                    duplicationPolicy: policy as DuplicationPolicy,
                  })
                }
              />
            </div>

            <div className="rounded-md border bg-background p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="transfer-history">转移历史文件</Label>
                <Switch
                  id="transfer-history"
                  checked={value.transferHistory}
                  onCheckedChange={(checked) =>
                    handleTransferRuleChange({ transferHistory: checked })
                  }
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                将已下载的文件转移到指定位置。
              </p>
            </div>

            <div className="rounded-md border bg-background p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor={captionNameId}>将消息说明加入文件名</Label>
                <Switch
                  id={captionNameId}
                  checked={value.useCaptionName ?? false}
                  onCheckedChange={(checked) =>
                    handleTransferRuleChange({ useCaptionName: checked })
                  }
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                转移文件时将消息说明（caption）追加到文件名后（例如
                name_caption.jpg）。若消息没有说明，则保留原文件名。
              </p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

const PolicyLegends: Record<
  TransferPolicy | DuplicationPolicy,
  {
    title: string;
    description: string | React.ReactNode;
  }
> = {
  DIRECT: {
    title: "直接",
    description: "直接将文件转移到目标文件夹。",
  },
  GROUP_BY_CHAT: {
    title: "按对话分组",
    description: (
      <div className="flex flex-col gap-2">
        <p className="text-sm">基于对话名称将文件转移到文件夹。</p>
        <p className="text-xs text-muted-foreground">示例：</p>
        <p className="inline-block rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
          {"/${目标文件夹}/${Telegram Id}/${对话名称}/${文件}"}
        </p>
      </div>
    ),
  },
  GROUP_BY_TYPE: {
    title: "按类型分组",
    description: (
      <div className="flex flex-col gap-2">
        <p className="text-sm">
          基于文件类型将文件转移到文件夹。
          <br />
          所有账户文件将被转移到同一个文件夹。
        </p>
        <p className="text-xs text-muted-foreground">示例：</p>
        <p className="inline-block rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
          {"/${目标文件夹}/${文件类型}/${文件}"}
        </p>
      </div>
    ),
  },
  GROUP_BY_AI: {
    title: "按AI分组",
    description: (
      <div className="flex flex-col gap-2">
        <p className="text-sm">使用AI分类文件，并基于文件内容将它们转移到不同的文件夹。</p>
        <p className="text-sm">你可以编写提示来指导AI分类文件。例如：</p>
        <p className="inline-block rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
          将以下文件分类为：工作、个人、重要、其他。
          <br />
          文件名：{"{file_name}"}
          <br />
          仅回复分类名称。
        </p>
        <p className="text-sm">
          你可以在提示中使用{"{FileRecord Field}"}来给AI提供更多上下文。
        </p>
      </div>
    ),
  },
  OVERWRITE: {
    title: "覆盖",
    description: "如果目标文件夹存在相同名称的文件，移动并覆盖该文件。",
  },
  SKIP: {
    title: "跳过",
    description: "如果目标文件夹存在相同名称的文件，跳过该文件，不执行任何操作。",
  },
  RENAME: {
    title: "重命名",
    description:
      "该策略将重命名文件，在文件名后添加序列号，然后将文件移动到目标文件夹",
  },
  HASH: {
    title: "哈希",
    description:
      "计算文件的哈希值（md5）并与现有文件比较，如果哈希值相同，则删除原文件并将本地路径设置为现有文件，否则移动该文件",
  },
};

interface PolicySelectProps {
  policyType: "transfer" | "duplication";
  value?: string;
  onChange: (value: string) => void;
}

function PolicySelect({ policyType, value, onChange }: PolicySelectProps) {
  const [open, setOpen] = useState(false);
  const polices =
    policyType === "transfer" ? TransferPolices : DuplicationPolicies;
  const [peekedPolicy, setPeekedPolicy] = useState<string>(value ?? polices[0]);

  const peekPolicyLegend = useMemo(() => {
    return PolicyLegends[peekedPolicy as TransferPolicy | DuplicationPolicy];
  }, [peekedPolicy]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="选择策略"
          className="w-full justify-between"
        >
          {value ?? "选择策略..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-0" modal={true}>
        <HoverCard>
          <HoverCardContent
            side="top"
            align="start"
            forceMount
            className="min-h-[150px] w-auto min-w-64 max-w-[380px] border bg-popover"
          >
            <div className="flex flex-col gap-2">
              <h4 className="font-medium leading-none">
                {peekPolicyLegend?.title}
              </h4>
              {typeof peekPolicyLegend?.description === "string" ? (
                <p className="text-sm text-muted-foreground">
                  {peekPolicyLegend?.description ?? ""}
                </p>
              ) : (
                peekPolicyLegend?.description
              )}
            </div>
          </HoverCardContent>
          <Command>
            <CommandList className="h-[var(--cmdk-list-height)] max-h-[400px]">
              <HoverCardTrigger />
              <CommandGroup>
                {polices.map((policy) => (
                  <PolicyItem
                    key={policy}
                    policy={policy ?? ""}
                    isSelected={value === policy}
                    onPeek={setPeekedPolicy}
                    onSelect={() => {
                      onChange(policy);
                      setOpen(false);
                    }}
                  />
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </HoverCard>
      </PopoverContent>
    </Popover>
  );
}

interface PolicyItemProps {
  policy: string;
  isSelected: boolean;
  onSelect: () => void;
  onPeek: (policy: string) => void;
}

function PolicyItem({ policy, isSelected, onSelect, onPeek }: PolicyItemProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  useMutationObserver(ref, (mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "aria-selected" &&
        ref.current?.getAttribute("aria-selected") === "true"
      ) {
        onPeek(policy);
      }
    });
  });

  return (
    <CommandItem
      key={policy}
      onSelect={onSelect}
      ref={ref}
      className="data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
    >
      {policy}
      <Check
        className={cn("ml-auto", isSelected ? "opacity-100" : "opacity-0")}
      />
    </CommandItem>
  );
}
