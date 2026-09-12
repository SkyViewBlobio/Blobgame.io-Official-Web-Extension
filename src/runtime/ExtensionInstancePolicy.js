export function normalizeBuildChannel(value) {
  return value === 'beta' ? 'beta' : 'public';
}

export function getRuntimeRemoteFileConfig(windowRef = globalThis) {
  const directConfig = windowRef?.__blobioRemoteFileConfig;
  if (directConfig) {
    return directConfig;
  }

  const bridgedConfig = windowRef?.unsafeWindow?.__blobioRemoteFileConfig;
  if (bridgedConfig) {
    return bridgedConfig;
  }

  const globalConfig = globalThis.__blobioRemoteFileConfig;
  if (globalConfig) {
    return globalConfig;
  }

  try {
    return typeof unsafeWindow !== 'undefined' ? unsafeWindow.__blobioRemoteFileConfig : null;
  } catch {
    return null;
  }
}

export function getRuntimeBuildChannel(windowRef = globalThis) {
  return normalizeBuildChannel(getRuntimeRemoteFileConfig(windowRef)?.channel);
}

export function shouldKeepExistingExtension(existing, version, incomingChannel = 'public') {
  if (!existing || existing.version !== version) {
    return false;
  }

  const existingChannel = normalizeBuildChannel(existing.buildChannel);
  const nextChannel = normalizeBuildChannel(incomingChannel);

  if (existingChannel === nextChannel) {
    return true;
  }

  return existingChannel === 'beta' && nextChannel === 'public';
}
