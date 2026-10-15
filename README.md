# Stonktrooper

A free personal arcade project with fictional market charts and browser-generated audio. No account, backend, API key or in-game purchases are required.

## Development

Use Node.js 22 and npm.

```sh
npm ci
npm run dev
```

## Validation

```sh
npm run lint
npm test
npm run build
npm run preview
```

`npm run clean` removes generated output on Windows and Linux.

## GitHub Pages deployment

1. Push the project to the `main` branch of your GitHub repository.
2. In Settings > Pages, choose **GitHub Actions** as the deployment source.
3. The workflow checks types, runs tests, builds and deploys the `dist` artifact.
4. Check Actions for deployment status and Settings > Pages for the published address.

The workflow obtains the base path from Pages configuration. Repository sites and root/custom-domain sites are supported. If your default branch is not `main`, update `.github/workflows/pages.yml`.

Test a repository path locally in PowerShell:

```powershell
$env:PAGES_BASE_PATH='/Stonks/'
npm run build
npm run preview
Remove-Item Env:PAGES_BASE_PATH
```

Open the preview under `/Stonks/`. Publish the build artifact, not the source directory. Do not commit `node_modules`, `dist`, logs or local environment files. The application has no client-side routes requiring a SPA fallback.

## Project structure

```text
.github/workflows/  Validation and Pages deployment
public/images/     Logo, menu and favicon assets
scripts/           Cross-platform test runner
src/               UI, renderers, game rules and permanent regression tests
index.html         Vite entry point
vite.config.ts     Build and base-path configuration
```

Regression tests remain alongside their modules and are not part of the deployed application bundle.

## Privacy and support

Theme and sound preferences are stored locally. There is no analytics or score-upload service in the current game. Share DD generates a PNG locally and shares only at the player's request. Fonts load from Google Fonts; GitHub Pages has its own hosting privacy practices. The footer explains these services and offers preference removal.

The header information button opens About, which includes contacts and a coffee button opening https://ko-fi.com/eon in a new tab for optional support. No open-source license is granted unless the owner adds a separate LICENSE file.
