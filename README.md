# Blobgame.io Extension

**Author: SkyView**

The official Blobgame.io client-side browser extension for [Blobgame.io](https://blobgame.io/) and its [custom game client](http://custom.client.blobgame.io/).

**Official repository:** [SkyViewBlobio/Blobgame.io-Official-Web-Extension-](https://github.com/SkyViewBlobio/Blobgame.io-Official-Web-Extension-)

## Features

- Customizable cell glow, transparency, and border controls.
- Clan tags and mass labels, including Dynamic positioning around player names.
- HUD customization, chat tools, emotes, hotkeys, and animation timing controls.
- Rendering options to reduce the workload from pellets and other objects.

## Open source

The extension source is open source under the [MIT License](LICENSE). You may use, study, modify, copy, and distribute it, including modified versions, free of charge. Keep the copyright and license notice with redistributed copies.

Please label modified builds clearly so users can distinguish them from SkyView's official release. Blobgame.io and third-party names, trademarks, and materials belong to their respective owners.

## Official builds and account safety

This repository contains the official extension maintained by SkyView. Builds from other users or repositories may contain different behavior or code that has not been reviewed here. Using a modified build may put your Blobgame.io account at risk of restrictions, bans, or deletion, and malicious modifications could expose private data.

Use this repository as the official baseline for customization. No extension can guarantee immunity from account penalties; game and server operators control their rules and enforcement.

## Install this release

1. Install Tampermonkey in your browser.
2. Open the [public release installer](https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Official-Web-Extension-/main/loader/blobio-loader.user.js) and confirm installation in Tampermonkey. If it opens as plain text, copy the contents into a new Tampermonkey script and save it.
3. Disable any older Blobio extension loader to avoid running multiple versions together.
4. Open Blobgame.io and reload the page.

**No GitHub token is required.** The public loader fetches the extension bundle and role data from this repository's `main` branch. It checks for updates when loaded. Reinstall the loader when a release changes its embedded game hooks, then reload the game.

The release watermark reads **Blob Extension v0.2.85-Release**.

## Support and community

- [Extension troubleshooting Discord](https://discord.gg/c9JeDmdCZr)
- [Official Blobio Discord](https://discord.gg/9U8ArszUZW)

When reporting an issue, include the extension version, browser, affected setting, and steps to reproduce it.

## Build from source

Use Node.js 20 or newer:

```bash
npm ci
npm run build:public
```

The generated public userscript is `loader/blobio-loader.user.js`; the extension bundle is `dist/blobio-extension.bundle.js`. Source modules are in `src/`, with bundled artwork in `assets/` and role data in `data/roles/`.

## Private forks

The optional `loader/blobio-loader.beta.user.js` is for developers who want an authenticated loader for their own private fork. It is not needed to install the official public release.

Before building a private fork, set `BETA_REPO` in `src/remote/RemoteFileConfig.js` to your own repository and branch, update the userscript metadata in `scripts/build.js`, and run `npm run build:beta`. Configure a fine-grained GitHub token with read-only Contents access through the loader's Tampermonkey menu. Never commit tokens to your repository.
