import React from "react";
import useSWR from "swr";
import { Github, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import TGDuck16HeyOut from "@/components/animations/tg-duck16_hey_out.json";
import dynamic from "next/dynamic";

interface VersionData {
  version: string;
}

interface DockerHubTagsData {
  results: Array<{ name: string; last_updated: string }>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

function VersionBadge({
  label,
  value,
  error,
  isLoading,
}: {
  label: string;
  value?: string;
  error?: Error;
  isLoading: boolean;
}) {
  return (
    <div className="rounded-md border bg-background/80 p-3 shadow-sm backdrop-blur">
      <p className="text-xs font-medium tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-2">
        {error ? (
          <Badge variant="destructive">获取失败</Badge>
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="size-4 animate-spin" />
            加载中
          </div>
        ) : (
          <Badge variant="secondary" className="font-mono">
            {value}
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function About() {
  const { data: apiData, error: apiError } = useSWR<VersionData, Error>(
    "/version",
  );
  const { data: dockerData, error: dockerError } = useSWR<
    DockerHubTagsData,
    Error
  >(
    "https://hub.docker.com/v2/repositories/rboyy/telegram-files/tags/?page_size=10&ordering=last_updated",
    fetcher,
  );

  const projectInfo = {
    repository: "https://github.com/rboyy/telegram-files",
    author: "rboyy",
  };

  const currentVersion = apiData?.version;
  // Docker Hub also carries `latest` and branch tags, so only numeric release tags are candidates.
  const latestTag = dockerData?.results?.find((r) => /^\d+(\.\d+)*$/.test(r.name));

  return (
    <div className="flex min-h-full items-center justify-center p-1 md:p-6">
      <Card className="relative w-full max-w-3xl overflow-hidden border-0 bg-[radial-gradient(circle_at_12%_18%,_hsl(var(--telegram-flow-1)/0.34),_transparent_32%),radial-gradient(circle_at_88%_8%,_hsl(var(--chart-4)/0.34),_transparent_30%),linear-gradient(135deg,_hsl(var(--background)),_hsl(var(--muted))_52%,_hsl(var(--telegram-flow-2)/0.18))] shadow-xl">
        <CardHeader className="relative gap-4 p-6 pb-3 md:p-8 md:pb-4">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <Badge variant="secondary" className="mb-3">
                自托管 Telegram 文件管理器
              </Badge>
              <CardTitle className="text-2xl tracking-normal md:text-3xl">
                Telegram Files
              </CardTitle>
              <CardDescription className="mt-2 max-w-xl text-base">
                一个自托管的 Telegram 文件下载器，支持连续、稳定和无人值守的下载。
              </CardDescription>
            </div>
            <div className="relative mx-auto size-28 shrink-0 md:mx-0">
              <div className="absolute inset-2 rounded-full bg-background/70 blur-sm" />
              <Lottie
                className="relative size-28"
                animationData={TGDuck16HeyOut}
                loop={true}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative flex flex-col gap-4 p-6 pt-2 md:p-8 md:pt-2">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border bg-background/80 p-3 shadow-sm backdrop-blur">
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                作者
              </p>
              <p className="mt-2 font-medium">{projectInfo.author}</p>
            </div>
            <VersionBadge
              label="当前版本"
              value={currentVersion}
              error={apiError}
              isLoading={!apiError && !apiData}
            />
            <VersionBadge
              label="Docker Hub 最新标签"
              value={latestTag?.name}
              error={dockerError}
              isLoading={!dockerError && !dockerData}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              基于 Jarvis2f 原版优化修改
            </p>
            <Button asChild variant="outline">
              <Link
                href={projectInfo.repository}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github />
                GitHub
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
