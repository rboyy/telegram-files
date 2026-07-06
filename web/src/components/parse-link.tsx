import { Button } from "@/components/ui/button";
import { WandSparkles } from "lucide-react";
import { TooltipWrapper } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import React, { useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import useIsMobile from "@/hooks/use-is-mobile";

interface ParseLinkButtonProps {
  accountId: string;
}

export default function ParseLinkButton({ accountId }: ParseLinkButtonProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function parseLink(text: string) {
    if (text) {
      // Check if the text is a valid Telegram link
      const telegramLinkRegex = /https?:\/\/t\.me\/([a-zA-Z0-9_]+)/;
      const match = telegramLinkRegex.exec(text);
      if (!match) {
        toast({
          title: "无效链接",
          description:
            "请复制有效的 Telegram 链接。示例：https://t.me/username",
          variant: "error",
        });
        return;
      }
      setOpen(false); // Close the drawer if it was open
      toast({
        title: "解析链接中...",
        description: `解析链接：${text}`,
        variant: "success",
      });
      // Redirect to the account page with the parsed link
      router.push(
        `/accounts?id=${accountId}&link=${window.encodeURIComponent(text)}`,
      );
    } else {
      toast({
        title: "剪贴板中未找到链接",
        description: "请复制一个 Telegram 链接进行解析。",
        variant: "info",
      });
    }
  }

  function handleParseLink() {
    if (!navigator.clipboard?.readText) {
      // If clipboard API is not supported, show manual input
      setOpen(true);
      return;
    }
    // Get the link from clipboard
    navigator.clipboard
      .readText()
      .then((text) => parseLink(text))
      .catch((err) => {
        console.info("Failed to read clipboard contents: ", err);
        setOpen(true); // Fallback to manual input if clipboard read fails
      });
  }

  return (
    <>
      {isMobile ? (
        <MobileParseLinkDrawer
          open={open}
          onOpenChange={setOpen}
          toggleParseLink={parseLink}
        />
      ) : (
        <ParseLinkDialog
          open={open}
          onOpenChange={setOpen}
          toggleParseLink={parseLink}
        />
      )}
      <TooltipWrapper content="你可以解析 Telegram 聊天中的链接直接获取文件。">
        <Button className="mt-4" onClick={handleParseLink}>
          <WandSparkles className="mr-2 h-4 w-4" />
          解析链接
        </Button>
      </TooltipWrapper>
    </>
  );
}

function ParseLinkDialog({
  open,
  onOpenChange,
  toggleParseLink,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toggleParseLink: (link: string) => void;
}) {
  const [link, setLink] = useState<string>("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full md:w-2/3">
        <DialogHeader>
          <DialogTitle>解析链接</DialogTitle>
          <DialogDescription>
            输入 Telegram 链接以解析文件。示例：{" "}
            <code>https://t.me/username</code>
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="输入 Telegram 链接"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="mb-4"
          autoFocus
        />

        <DialogFooter>
          <Button
            disabled={link.trim() === ""}
            onClick={() => {
              toggleParseLink(link);
            }}
          >
            提交
          </Button>
          <DialogClose asChild>
            <Button variant="outline">关闭</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MobileParseLinkDrawer({
  open,
  onOpenChange,
  toggleParseLink,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toggleParseLink: (link: string) => void;
}) {
  const [link, setLink] = useState<string>("");
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      disablePreventScroll={true}
      repositionInputs={false}
    >
      <DrawerContent className="w-full md:w-2/3" aria-describedby={undefined}>
        <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />

        <div className="p-4">
          <DrawerTitle className="mb-4">解析链接</DrawerTitle>
          <p className="mb-2 text-sm text-muted-foreground">
            输入 Telegram 链接以解析文件。示例：{" "}
            <code>https://t.me/username</code>
          </p>
          <Input
            placeholder="输入 Telegram 链接"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="mb-4"
            autoFocus
          />
        </div>

        <DrawerFooter>
          <Button
            disabled={link.trim() === ""}
            onClick={() => {
              toggleParseLink(link);
            }}
          >
            提交
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">关闭</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
