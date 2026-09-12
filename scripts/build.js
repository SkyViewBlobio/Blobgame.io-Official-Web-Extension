import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createRemoteFileConfig } from '../src/remote/RemoteFileConfig.js';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildChannel = readBuildChannel(process.argv.slice(2));
const outputFile = resolve(rootDir, 'dist/blobio-extension.bundle.js');
const outputTempFile = resolve(rootDir, 'dist', `.blobio-extension.bundle.${process.pid}.${Date.now()}.tmp.js`);
const loaderTemplateFile = resolve(rootDir, 'loader/blobio-loader.template.js');
const loaderFile = resolve(
  rootDir,
  buildChannel === 'beta' ? 'loader/blobio-loader.beta.user.js' : 'loader/blobio-loader.user.js',
);

const runtimeSpecs = [
  {
    startMarker: '  /* VIRUS_RUNTIME_START */',
    endMarker: '  /* VIRUS_RUNTIME_END */',
    file: resolve(rootDir, 'src/virus/pageVirusMotherCellBootstrap.js'),
    exportName: 'pageVirusMotherCellBootstrap',
  },
  {
    startMarker: '  /* VIRUS_PELLET_COLOR_RUNTIME_START */',
    endMarker: '  /* VIRUS_PELLET_COLOR_RUNTIME_END */',
    file: resolve(rootDir, 'src/cellColors/pageVirusPelletColorsBootstrap.js'),
    exportName: 'pageVirusPelletColorsBootstrap',
  },
  {
    startMarker: '  /* JELLY_SHADER_RUNTIME_START */',
    endMarker: '  /* JELLY_SHADER_RUNTIME_END */',
    file: resolve(rootDir, 'src/jelly/pageJellyShaderBootstrap.js'),
    exportName: 'pageJellyShaderBootstrap',
  },
  {
    startMarker: '  /* HUD_INFO_RUNTIME_START */',
    endMarker: '  /* HUD_INFO_RUNTIME_END */',
    file: resolve(rootDir, 'src/hud/pageHudInfoBootstrap.js'),
    exportName: 'pageHudInfoBootstrap',
  },
  {
    startMarker: '  /* EMOTE_SKIN_RUNTIME_START */',
    endMarker: '  /* EMOTE_SKIN_RUNTIME_END */',
    file: resolve(rootDir, 'src/emotes/pageEmoteSkinBootstrap.js'),
    exportName: 'pageEmoteSkinBootstrap',
  },
  {
    startMarker: '  /* CELL_MASS_RUNTIME_START */',
    endMarker: '  /* CELL_MASS_RUNTIME_END */',
    file: resolve(rootDir, 'src/cellMass/pageCellMassBootstrap.js'),
    exportName: 'pageCellMassBootstrap',
  },
  {
    startMarker: '  /* CELL_RING_RUNTIME_START */',
    endMarker: '  /* CELL_RING_RUNTIME_END */',
    file: resolve(rootDir, 'src/cellRing/pageCellRingBootstrap.js'),
    exportName: 'pageCellRingBootstrap',
  },
  {
    startMarker: '  /* RENDER_PERFORMANCE_RUNTIME_START */',
    endMarker: '  /* RENDER_PERFORMANCE_RUNTIME_END */',
    file: resolve(rootDir, 'src/performance/pageRenderPerformanceBootstrap.js'),
    exportName: 'pageRenderPerformanceBootstrap',
  },
  {
    startMarker: '  /* FPS_SAVER_RUNTIME_START */',
    endMarker: '  /* FPS_SAVER_RUNTIME_END */',
    file: resolve(rootDir, 'src/fpsSaver/pageFpsSaverBootstrap.js'),
    exportName: 'pageFpsSaverBootstrap',
  },
];

const assetSpecs = [
  {
    startMarker: '  /* VIRUS_ASSETS_START */',
    endMarker: '  /* VIRUS_ASSETS_END */',
    constName: 'VIRUS_MOTHER_CELL_ASSET_URLS',
    files: {
      halo: resolve(rootDir, 'assets/virus_glow_1 _mask.png'),
      rotate: resolve(rootDir, 'assets/viurs_glow_2_random_rotate_mask.png'),
      ring: resolve(rootDir, 'assets/virus_glow_3 _mask.png'),
    },
  },
  {
    startMarker: '  /* EMOTE_SKIN_ASSETS_START */',
    endMarker: '  /* EMOTE_SKIN_ASSETS_END */',
    constName: 'EMOTE_SKIN_ASSET_URLS',
    files: {
      cool: resolve(rootDir, 'assets/emote_cool.png'),
      hi: resolve(rootDir, 'assets/emote_hi.png'),
      nice: resolve(rootDir, 'assets/emote_nice.png'),
      pop: resolve(rootDir, 'assets/emote_pop.png'),
      thx: resolve(rootDir, 'assets/emote_thx.png'),
      why: resolve(rootDir, 'assets/emote_why.png'),
      yo: resolve(rootDir, 'assets/emote_yo.png'),
    },
  },
];

await mkdir(dirname(outputFile), { recursive: true });

try {
  await build({
    entryPoints: [resolve(rootDir, 'src/main.js')],
    outfile: outputTempFile,
    bundle: true,
    format: 'iife',
    target: 'es2020',
    loader: {
      '.png': 'dataurl',
    },
  });

  const bundleWithoutGeneratedMarkers = (await readFile(outputTempFile, 'utf8'))
    .replace(/^\s*\/\/ (?:assets|data|dist|loader|node_modules|src)\/[^\r\n]*(?:\r?\n|$)/gm, '');
  await writeFile(outputTempFile, bundleWithoutGeneratedMarkers);
  await rename(outputTempFile, outputFile);
} catch (error) {
  await rm(outputTempFile, { force: true });
  throw error;
}

function replaceBetweenMarkers(source, startMarker, endMarker, body, label) {
  const startIndex = source.indexOf(startMarker);
  const endIndex = source.indexOf(endMarker);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`${label} markers are missing from the loader template.`);
  }

  return `${source.slice(0, startIndex)}${startMarker}\n${body}\n${endMarker}${source.slice(endIndex + endMarker.length)}`;
}

function embedRuntime(loader, { startMarker, endMarker, source, exportName }) {
  const exportPattern = new RegExp(`export\\s+function\\s+${exportName}`);
  if (!exportPattern.test(source)) {
    throw new Error(`${exportName} export was not found.`);
  }

  const embedded = source
    .replace(/\r\n/g, '\n')
    .replace(exportPattern, `function ${exportName}`)
    .replace(/\n?export\s*\{[\s\S]*?\};/g, '')
    .trim()
    .split('\n')
    .map((line) => (line.length > 0 ? `  ${line}` : ''))
    .join('\n');

  return replaceBetweenMarkers(loader, startMarker, endMarker, embedded, `${exportName} runtime`);
}

const toDataUrl = (buffer) => `data:image/png;base64,${buffer.toString('base64')}`;

function embedAssetMap(loader, { startMarker, endMarker, constName, entries }) {
  const lines = entries
    .map(([key, buffer]) => `    ${key}: '${toDataUrl(buffer)}',`)
    .join('\n');
  const body = `  const ${constName} = {\n${lines}\n  };`;

  return replaceBetweenMarkers(loader, startMarker, endMarker, body, constName);
}

function readBuildChannel(args) {
  let channel = process.env.BLOBIO_BUILD_CHANNEL || 'public';

  for (const arg of args) {
    if (arg === '--beta') {
      channel = 'beta';
    } else if (arg === '--public') {
      channel = 'public';
    } else if (arg.startsWith('--channel=')) {
      channel = arg.slice('--channel='.length);
    }
  }

  if (!['public', 'beta'].includes(channel)) {
    throw new Error(`Unknown build channel "${channel}". Use public or beta.`);
  }

  return channel;
}

function readUserscriptVersion(source) {
  const match = source.match(/^\/\/ @version\s+([^\r\n]+)/m);
  if (!match) {
    throw new Error('Userscript @version was not found in the loader template.');
  }

  return match[1].trim();
}

function replaceUserscriptHeader(source, header) {
  const match = source.match(/^\/\/ ==UserScript==[\s\S]*?^\/\/ ==\/UserScript==/m);
  if (!match) {
    throw new Error('Userscript metadata block was not found in the loader template.');
  }

  return `${header}${source.slice(match.index + match[0].length)}`;
}

function buildUserscriptHeader(channel, version) {
  const isBeta = channel === 'beta';
  const lines = [
    '// ==UserScript==',
    `// @name         ${isBeta ? 'Blobio Web Script Loader BETA' : 'Blobio Web Script Loader'}`,
    '// @namespace    https://github.com/SkyViewBlobio/Blobgame.io-Official-Web-Extension-',
    `// @version      ${version}`,
    '// @author       SkyView',
    `// @description  ${isBeta ? 'Loads the private Blobio beta extension bundle from GitHub.' : 'Loads the Blobio extension bundle from GitHub.'}`,
    '// @match        *://blobgame.io/*',
    '// @match        *://www.blobgame.io/*',
    '// @match        *://custom.client.blobgame.io/*',
    '// @match        https://www.google.com/recaptcha/api2/anchor*',
    '// @match        https://www.google.com/recaptcha/enterprise/anchor*',
    '// @match        https://www.recaptcha.net/recaptcha/api2/anchor*',
    '// @match        https://www.recaptcha.net/recaptcha/enterprise/anchor*',
    '// @run-at       document-start',
    '// @sandbox      raw',
    '// @grant        unsafeWindow',
    '// @grant        GM_xmlhttpRequest',
    '// @grant        GM_getValue',
    '// @grant        GM_setValue',
    '// @grant        GM_deleteValue',
    '// @grant        GM_addValueChangeListener',
    '// @grant        GM_addStyle',
    '// @grant        GM_addElement',
    '// @grant        GM_removeValueChangeListener',
  ];

  if (isBeta) {
    lines.push(
      '// @grant        GM_registerMenuCommand',
      '// @connect      api.github.com',
    );
  } else {
    lines.push(
      '// @connect      cdn.jsdelivr.net',
      '// @connect      raw.githubusercontent.com',
      '// @downloadURL  https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Official-Web-Extension-/main/loader/blobio-loader.user.js',
      '// @updateURL    https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Official-Web-Extension-/main/loader/blobio-loader.user.js',
    );
  }

  lines.push('// ==/UserScript==');
  return lines.join('\n');
}

function formatRemoteFileConfig(config) {
  const q = JSON.stringify;
  const bundleUrls = config.bundleUrls.map((url) => `      ${q(url)},`).join('\n');

  return [
    '  const REMOTE_FILE_CONFIG = {',
    `    channel: ${q(config.channel)},`,
    '    repo: {',
    `      owner: ${q(config.repo.owner)},`,
    `      name: ${q(config.repo.name)},`,
    `      ref: ${q(config.repo.ref)},`,
    '    },',
    `    githubTokenKey: ${q(config.githubTokenKey)},`,
    '    bundleUrls: [',
    bundleUrls,
    '    ],',
    '    roles: {',
    `      vip: ${q(config.roles.vip)},`,
    `      admins: ${q(config.roles.admins)},`,
    `      clans: ${q(config.roles.clans)},`,
    '    },',
    '  };',
  ].join('\n');
}

function applyChannelConfig(loader, channel, version) {
  const config = createRemoteFileConfig(channel, version);
  const withHeader = replaceUserscriptHeader(loader, buildUserscriptHeader(channel, version));

  return replaceBetweenMarkers(
    withHeader,
    '  /* REMOTE_FILE_CONFIG_START */',
    '  /* REMOTE_FILE_CONFIG_END */',
    formatRemoteFileConfig(config),
    'remote file config',
  );
}

let nextLoader = await readFile(loaderTemplateFile, 'utf8');
const loaderVersion = readUserscriptVersion(nextLoader);

for (const spec of runtimeSpecs) {
  const source = await readFile(spec.file, 'utf8');
  nextLoader = embedRuntime(nextLoader, { ...spec, source });
}

for (const spec of assetSpecs) {
  const entries = await Promise.all(
    Object.entries(spec.files).map(async ([key, file]) => [key, await readFile(file)]),
  );
  nextLoader = embedAssetMap(nextLoader, { ...spec, entries });
}

nextLoader = applyChannelConfig(nextLoader, buildChannel, loaderVersion);

await writeFile(loaderFile, nextLoader);
console.log(`[build] wrote ${buildChannel} loader to ${loaderFile}`);
