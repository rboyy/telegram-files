"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AccessScope = "PUBLIC" | "MEMBER_ACCESS" | "OWNER_ONLY";

const ACCESS_SCOPE_OPTIONS: ReadonlyArray<{
  value: AccessScope;
  label: string;
  description: string;
}> = [
  {
    value: "OWNER_ONLY",
    label: "仅所有者节点",
    description:
      "只有发布此来源的节点可以从 Telegram 获取该文件。适合私密聊天、群组和频道；其他节点不会收到消息定位信息。",
  },
  {
    value: "MEMBER_ACCESS",
    label: "持有独立证明的成员",
    description:
      "其他节点只有在独立证明自己能访问同一 Telegram 来源后，才能获取该文件。仅属于同一用户或只是登录状态并不足够。",
  },
  {
    value: "PUBLIC",
    label: "公开的 Telegram 消息",
    description:
      "符合条件的节点可以从你提供的公开 t.me 消息 URL 获取该文件。仅当无需加群或额外授权即可访问该消息时使用。",
  },
];

export function SourceAccessSelect({
  id,
  value,
  onValueChange,
}: {
  id?: string;
  value: AccessScope;
  onValueChange: (value: AccessScope) => void;
}) {
  const generatedId = useId();
  const triggerId = id ?? `source-access-${generatedId}`;
  const descriptionId = `${triggerId}-description`;
  const [highlightedScope, setHighlightedScope] = useState<AccessScope>(value);
  const selected = ACCESS_SCOPE_OPTIONS.find(
    (option) => option.value === value,
  )!;
  const highlighted =
    ACCESS_SCOPE_OPTIONS.find((option) => option.value === highlightedScope) ??
    selected;

  return (
    <div className="flex flex-col gap-2">
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) setHighlightedScope(value);
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            id={triggerId}
            type="button"
            variant="outline"
            className="w-full justify-between"
            aria-describedby={descriptionId}
          >
            {selected.label}
            <ChevronDown data-icon="inline-end" className="opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[min(42rem,calc(100vw-2rem))] p-2"
        >
          <div className="grid gap-2 md:grid-cols-[minmax(15rem,0.9fr)_minmax(16rem,1.1fr)]">
            <DropdownMenuRadioGroup
              value={value}
              onValueChange={(nextValue) =>
                onValueChange(nextValue as AccessScope)
              }
            >
              {ACCESS_SCOPE_OPTIONS.map((option) => (
                <DropdownMenuRadioItem
                  key={option.value}
                  value={option.value}
                  aria-label={`${option.label}。${option.description}`}
                  onFocus={() => setHighlightedScope(option.value)}
                  onPointerMove={() => setHighlightedScope(option.value)}
                >
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <div
              className="flex min-h-24 flex-col gap-1 rounded-md bg-muted p-3"
              aria-live="polite"
            >
              <p className="text-sm font-medium">{highlighted.label}</p>
              <p className="text-sm text-muted-foreground">
                {highlighted.description}
              </p>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <p
        id={descriptionId}
        className="text-sm text-muted-foreground"
        aria-live="polite"
      >
        {selected.description}
      </p>
    </div>
  );
}
