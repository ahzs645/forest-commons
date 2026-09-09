# Forest Commons

Educational forestry operations game built with Vite, React, MapLibre GL and deck.gl, with Québec and British Columbia scenarios.

## Run locally

```sh
cd forestry-game
npm ci
npm run dev
```

See [game documentation](forestry-game/README.md) for mechanics and classroom setup, and [remaining work](research/remaining-work-handoff.md) for current limitations and acceptance work.

## Repository layout

- `forestry-game/`: application, server, tests and deployment configuration.
- `research/`: source analyses, regional evidence and acceptance records.
- Root reference documents: supplied educational and research materials; original rights remain with their owners.

Local classroom records, credentials, dependencies, build output and temporary files are ignored.

## GitHub Pages

[Pages workflow](.github/workflows/pages.yml) tests and builds the standalone game from `forestry-game/` on pushes to `main` or manual dispatch. Only `forestry-game/dist` is published; repository documents and classroom data are not part of the Pages artifact. GitHub Pages must use **GitHub Actions** as its source, and the account must support Pages for a private repository.

The source repository is private. Pages site visibility is managed separately by GitHub. Live classroom synchronization requires a separately hosted backend; see [deployment instructions](forestry-game/deploy/README.md).

## First deployment verification

Live standalone game: https://projects.ahmadjalil.com/forest-commons/

[Initial Pages run](https://github.com/ahzs645/forest-commons/actions/runs/34319934401) passed: 432 tests, 2 optional skips, deployment-check self-tests, server typecheck, production build and deployment. Public HTTPS and referenced assets passed the standalone checker. Browser inspection loaded the interactive map and completed the worker-based purchasing study (two futures per policy, four policies, no failed trials). This is a deployment smoke check, not completion of all gameplay acceptance. Live classroom hosting remains separate.
