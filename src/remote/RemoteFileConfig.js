export const BETA_GITHUB_TOKEN_KEY = 'blobio.beta.githubToken';

const PUBLIC_REPO = {
  owner: 'SkyViewBlobio',
  name: 'Blobgame.io-Official-Web-Extension',
  ref: 'main',
};

const BETA_REPO = {
  owner: 'SkyViewBlobio',
  name: 'Blobgame.io-Official-Web-Extension',
  ref: 'main',
};

function rawGitHubUrl(repo, path, version = '') {
  const cacheBuster = version ? `?v=${encodeURIComponent(version)}` : '';
  return `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/${repo.ref}/${path}${cacheBuster}`;
}

function jsDelivrUrl(repo, path, version = '') {
  const cacheBuster = version ? `?v=${encodeURIComponent(version)}` : '';
  return `https://cdn.jsdelivr.net/gh/${repo.owner}/${repo.name}@${repo.ref}/${path}${cacheBuster}`;
}

function contentsApiUrl(repo, path) {
  return `https://api.github.com/repos/${repo.owner}/${repo.name}/contents/${path}?ref=${repo.ref}`;
}

export function createRemoteFileConfig(channel = 'public', version = '') {
  if (channel === 'beta') {
    return {
      channel: 'beta',
      repo: { ...BETA_REPO },
      githubTokenKey: BETA_GITHUB_TOKEN_KEY,
      bundleUrls: [
        contentsApiUrl(BETA_REPO, 'dist/blobio-extension.bundle.js'),
      ],
      roles: {
        vip: contentsApiUrl(BETA_REPO, 'data/roles/vip.json'),
        admins: contentsApiUrl(BETA_REPO, 'data/roles/admins.json'),
        clans: contentsApiUrl(BETA_REPO, 'data/roles/clans.json'),
      },
    };
  }

  return {
    channel: 'public',
    repo: { ...PUBLIC_REPO },
    githubTokenKey: '',
    bundleUrls: [
      rawGitHubUrl(PUBLIC_REPO, 'dist/blobio-extension.bundle.js', version),
      jsDelivrUrl(PUBLIC_REPO, 'dist/blobio-extension.bundle.js', version),
    ],
    roles: {
      vip: rawGitHubUrl(PUBLIC_REPO, 'data/roles/vip.json'),
      admins: rawGitHubUrl(PUBLIC_REPO, 'data/roles/admins.json'),
      clans: rawGitHubUrl(PUBLIC_REPO, 'data/roles/clans.json'),
    },
  };
}

export function isGitHubContentsApiUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'api.github.com'
      && /^\/repos\/[^/]+\/[^/]+\/contents\/.+/.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function getRemoteRequestHeaders(remoteConfig, url, token = '', options = {}) {
  if (!isGitHubContentsApiUrl(url)) {
    return {};
  }

  const headers = {
    Accept: options.raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const trimmedToken = String(token || '').trim();

  if (remoteConfig?.githubTokenKey && trimmedToken) {
    headers.Authorization = `Bearer ${trimmedToken}`;
  }

  return headers;
}

function decodeBase64Utf8(value) {
  const clean = String(value || '').replace(/\s/g, '');

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(clean, 'base64').toString('utf8');
  }

  if (typeof atob !== 'function') {
    throw new Error('No base64 decoder is available.');
  }

  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  if (typeof TextDecoder === 'function') {
    return new TextDecoder('utf-8').decode(bytes);
  }

  let text = '';
  for (let index = 0; index < bytes.length; index += 1) {
    text += String.fromCharCode(bytes[index]);
  }
  return decodeURIComponent(escape(text));
}

export function decodeGitHubContentsApiText(value) {
  const text = String(value ?? '');
  const trimmed = text.trim();
  if (trimmed.charCodeAt(0) !== 123) {
    return text;
  }

  let data;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return text;
  }

  if (!data || typeof data !== 'object') {
    return text;
  }

  const isGitHubFileMetadata = data.type === 'file'
    && Object.prototype.hasOwnProperty.call(data, 'encoding')
    && Object.prototype.hasOwnProperty.call(data, 'content');
  if (String(data.encoding || '').toLowerCase() === 'base64' && typeof data.content === 'string') {
    return decodeBase64Utf8(data.content);
  }

  if (isGitHubFileMetadata) {
    throw new Error('GitHub Contents API response did not include base64 file content. Use the raw media type for large files.');
  }

  return text;
}
