const SHARE_ERROR_MESSAGES: Record<string, string> = {
  PLATFORM_ACCESS_BLOCKED:
    "平台位于交互式访问网关之后。请允许机器访问 /api/v1，或配置服务令牌策略。",
  PLATFORM_HTTP_401: "平台拒绝了此节点的凭据。请重新绑定节点后重试。",
  PLATFORM_HTTP_403: "平台拒绝授予此节点发布该来源的权限。",
  PLATFORM_HTTP_404:
    "已配置的平台未提供 M2 资源端点。请部署当前版本的 telegram-seed。",
  NODE_REVOKED: "平台节点已被撤销。请重新绑定此节点后再重试。",
  VALIDATION_FAILED: "平台拒绝了资源元数据。",
  INTERNAL_RETRYABLE: "无法连接到平台，或平台返回了意外响应。",
};

export function describeShareError(code: string | null): string {
  if (!code) return "平台同步失败，且未返回稳定的错误码。";
  return SHARE_ERROR_MESSAGES[code] ?? `平台同步失败（${code}）。`;
}
