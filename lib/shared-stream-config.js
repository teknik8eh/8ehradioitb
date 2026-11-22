export function mergeSharedStreamUrls(localConfig, sourceConfig) {
  if (!sourceConfig?.defaultUrl) {
    throw new Error("Production stream URLs are not configured");
  }

  return {
    ...localConfig,
    baseUrls: Array.isArray(sourceConfig.baseUrls) && sourceConfig.baseUrls.length
      ? sourceConfig.baseUrls
      : [sourceConfig.defaultUrl],
    defaultUrl: sourceConfig.defaultUrl,
    fallbackUrl: sourceConfig.fallbackUrl || sourceConfig.defaultUrl,
    sharedBroadcastUrls: true,
  };
}
