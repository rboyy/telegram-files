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
import Link from "next/link";
import TGDuck16HeyOut from "@/components/animations/tg-duck16_hey_out.json";
import dynamic from "next/dynamic";

interface VersionData {
  version: string;
}

interface GitHubReleaseData {
  tag_name: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });
export default function About() {
  const { data: apiData, error: apiError } = useSWR<VersionData, Error>(
    "/version",
  );
  const { data: githubData, error: githubError } = useSWR<
    GitHubReleaseData,
    Error
  >(
    "https://api.github.com/repos/jarvis2f/telegram-files/releases/latest",
    fetcher,
  );

  const projectInfo = {
    repository: "https://github.com/jarvis2f/telegram-files",
    author: "Jarvis2f",
  };

  const currentVersion = apiData?.version ?? "未知";
  const isNewVersionAvailable =
    githubData && githubData.tag_name !== currentVersion;

  return (
    <div className="flex justify-center md:h-full md:items-center">
      <Card className="w-full bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#7900ff] via-[#548cff] to-[#93ffd8] md:w-1/2">
        <CardHeader>
          <CardTitle className="text-white">关于本项目</CardTitle>
          <CardDescription className="text-white">
            一个自托管的 Telegram 文件下载器，支持连续、稳定和无人值守的下载。
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <Lottie
            className="absolute bottom-3 right-3 h-28 w-28"
            animationData={TGDuck16HeyOut}
            loop={true}
          />
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center">
              <p className="text-sm font-medium text-white">作者</p>
              <p>{projectInfo.author}</p>
            </div>

            <div className="flex flex-col items-center justify-center">
              <p className="mb-1 text-sm font-medium text-white">
                当前版本
              </p>
              {apiError ? (
                <p className="text-red-500">加载当前版本失败</p>
              ) : !apiData ? (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="animate-spin text-white" size={16} />
                  <span>加载中...</span>
                </div>
              ) : (
                <p className="rounded bg-gray-100 px-3 dark:bg-gray-800">
                  {currentVersion}
                </p>
              )}
            </div>

            <div className="flex flex-col items-center justify-center">
              <p className="mb-1 text-sm font-medium text-white">
                最新版本
              </p>
              {githubError ? (
                <p className="text-red-500">加载发布信息失败</p>
              ) : !githubData ? (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="animate-spin text-white" size={16} />
                  <span>加载中...</span>
                </div>
              ) : (
                <p className="rounded bg-gray-100 px-3 dark:bg-gray-800">
                  {githubData.tag_name}
                </p>
              )}
            </div>

            {isNewVersionAvailable && (
              <div className="border-l-4 border-gray-700 bg-white px-4 py-2">
                <p className="text-gray-800">
                  有新版本 ({githubData?.tag_name}) 可用！请立即更新。
                </p>
              </div>
            )}

            <div className="flex items-center justify-center space-x-2">
              <Link
                href={projectInfo.repository}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-6 w-6" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
