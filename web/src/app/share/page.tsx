import Link from "next/link";
import { ArrowLeft, Network } from "lucide-react";

import { PlatformBinding } from "@/components/platform-binding";
import ThemeToggleButton from "@/components/theme-toggle-button";
import { Button } from "@/components/ui/button";
import { PublishedResources } from "@/components/published-resources";
import { SharePublicationRules } from "@/components/share-publication-rules";

export default function SharePage() {
  return (
    <main className="container mx-auto flex flex-col gap-8 px-4 py-6">
      <header className="flex items-center justify-between gap-4">
        <Button asChild variant="ghost">
          <Link href="/">
            <ArrowLeft data-icon="inline-start" />
            返回文件列表
          </Link>
        </Button>
        <ThemeToggleButton />
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Network aria-hidden="true" />
          Telegram Seed 控制平面
        </div>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          平台节点绑定
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          为此安装创建独立身份，用于心跳和后续的分享任务。
        </p>
      </section>

      <PlatformBinding />
      <SharePublicationRules />
      <PublishedResources />
    </main>
  );
}
