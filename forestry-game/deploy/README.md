# Classroom deployment and recovery

Both Docker images and localhost container integration have been verified. This configuration has not been published or exercised against a public hostname. Classroom credentials authenticate possession of a role, not a person's identity.

Set `FOREST_ADMIN_TOKEN` to a long random value in the service environment. Creating a room requires it as a bearer header. The UI accepts it without storing it. For an explicitly local-only development server, `FOREST_ALLOW_LOCAL_CREATE=1 npm run server` enables creation without that credential; do not use that override in a network deployment. Existing room invitations continue working without an administrator token.

For HTTPS, set `FOREST_DOMAIN` to a hostname you control and `FOREST_ADMIN_TOKEN`, then run `docker compose -f deploy/compose.yaml up --build -d` from the app directory. DNS must point to the server and ports 80/443 must reach Caddy. Caddy obtains certificates; the classroom API remains inside the Compose network. Do not expose port 3001. Docker builds and real HTTPS issuance require deployment-machine verification. No automatic public deployment is performed.

Invitations use `#room=…&credential=…` fragments, not query strings. Browser fragments are not sent in HTTP requests; the Classroom screen consumes and removes them, then retains the credential in sessionStorage for reconnection. The app opens the Classroom screen automatically when following an invitation. Copy invitations only to intended participants. Tokens are bearer secrets; a recipient can share them. Reissuing an invitation invalidates the previous role token.

Creation provides a separate instructor recovery credential once. Save it offline. Recover from the join screen using the room ID and recovery credential. Recovery rotates both instructor and recovery credentials, invalidating the old ones. If both are lost, there is no unauthenticated bypass; use an authorized backup and its corresponding credentials.

Before backup or restore, stop the classroom service to obtain a consistent multi-room snapshot. Run `npx tsx scripts/room-backup.ts backup .forest-rooms /secure/new-backup-directory`. The script validates games, creates private files and refuses existing destinations. To restore, use `restore /secure/backup-directory /secure/new-room-directory`, set FOREST_ROOM_DIR to the new directory, and restart. For Docker, perform the equivalent operation on the rooms volume from a stopped service with this script available. Keep backups encrypted at rest in your normal backup system; backups contain private economics and hashed role/recovery credentials. Never place them in the web root. The operator should rehearse restore before teaching a class.

The separate information experiment generates five private cost pairs on the server. The bundled four-/five-company handouts remain public teaching fixtures; they are never claimed secret. Students see only their own generated economics and company-consented disclosures. Instructor controls private → sharing → debrief. Debrief releases estimates, not unshared economics; explicit consent cannot be undone after recipients have seen data. The experiment's arbitrary cost units do not alter the campaign ledger or public coalition allocation.

During sharing the instructor may propose an allocation of the generated savings. Server validation requires efficiency (the exact total), nonnegative company savings and nonnegative allocated costs. Each company accepts or rejects using its own role token; unanimous acceptance realizes the offer's exercise savings, while rejection retains the independent baseline. Offered shares reveal their sum intentionally but never disclose unshared standalone/pooled cost pairs. History retains rejected and superseded offers. This experiment has no generated subgroup cost table, so individual benefit and efficiency are checked; coalition-core stability is not claimed for it.

## Reproduce the local container check

```sh
docker build --target web -t forest-commons-web:local-check .
docker build --target classroom -t forest-commons-classroom:local-check .
node scripts/container-smoke.mjs
```

The check publishes a random port on 127.0.0.1 only, uses an ephemeral administrator credential and disposable room volume, replaces the backend container to verify persistence, and removes its test containers, network and volume afterward. It tests HTTP proxying locally; it does not test public certificate issuance. Build from the app directory.

## Read-only deployment readiness check

Before directing learners to an already deployed site:

```sh
node scripts/deployment-check.mjs https://your-forest-hostname.example
```

This verifies trusted HTTPS, frontend content, API health, response headers and same-origin HTTP-to-HTTPS redirection. It does not create rooms, print credentials or replace the persistence/restore exercise above. For development only, `node scripts/deployment-check.mjs --local http://127.0.0.1:5173` verifies the frontend and API without claiming public TLS verification. The local check passed in the BC preparation continuation.

Public deployment is pending a user-supplied hosting destination and domain. No domain ownership, DNS changes, public service or certificate issuance has been assumed.

## Standalone GitHub Pages or other static hosting

The private repository is [ahzs645/forest-commons](https://github.com/ahzs645/forest-commons). Its root `.github/workflows/pages.yml` builds from the `forestry-game/` subdirectory, caches that application's lockfile and uploads only `forestry-game/dist`. Keep `.forest-rooms`, credentials, local backups and `node_modules` out of the repository and deployment artifact.

GitHub Pages uses **GitHub Actions** as its source and deploys on pushes to `main` or manual dispatch. The configured site inherits the account domain at `https://projects.ahmadjalil.com/forest-commons/`. Repository visibility is private; the Pages site is public. The workflow obtains the actual repository base path from `configure-pages`. The optional repository variable `VITE_CLASSROOM_API_URL` should only be set when a separately deployed classroom backend is available; leaving it unset supports standalone play.

To reproduce the repository-subpath build locally before publishing:

```sh
VITE_STANDALONE=1 VITE_BASE_PATH=/forest-commons/ npm run build
VITE_BASE_PATH=/forest-commons/ npm run preview -- --port 5222 --strictPort
```

Then run the standalone checker against `http://127.0.0.1:5222/forest-commons/` in another terminal. This example path is a local fixture, not a selected public repository.

The standalone checker accepts a repository subpath and checks the production HTML plus its referenced JavaScript and CSS. It does not require a classroom API or Caddy-specific headers:

```sh
node scripts/deployment-check.mjs --standalone https://YOUR-ACCOUNT.github.io/YOUR-REPOSITORY/
node scripts/deployment-check.mjs --local --standalone http://127.0.0.1:5173/YOUR-REPOSITORY/
node --test scripts/deployment-check-selftest.mjs
```

Use a production build served with the intended base path. A missing trailing slash is normalized. Assets must resolve beneath that path, return HTTP 200 and the appropriate content type, and contain data; an HTML fallback is rejected. The check covers assets referenced directly in the HTML, not every dynamic import, worker, map tile or gameplay interaction. Validate those in the browser as well. Public mode verifies HTTPS through the normal certificate checks; local mode makes no public TLS claim. This check does not publish the site. Standalone hosting does not provide live classroom synchronization; that needs the separate backend deployment described above.
