# Classroom rooms

For local development, run `FOREST_ALLOW_LOCAL_CREATE=1 npm run server` in one terminal and `npm run dev` in another. Vite proxies `/api` to the room server on port 3001. Open **Classroom**, create an instructor room from the current region, and issue credentials for purchase, production, transport and each company. Give each participant the room ID and their own credential. Reissuing a credential revokes its predecessor. The room is separate from the standalone campaign.

Participants join from the same app URL on their own device or browser tab. The default processes bind to localhost. For a trusted classroom LAN, bind Vite to the instructor computer's LAN interface (`npm run dev -- --host 0.0.0.0`); the browser API still travels through Vite to the loopback room service. Internet hosting is not configured. An internet deployment needs HTTPS, a controlled room-creation policy and an operational backup/retention policy.

The server authenticates role credentials, validates every mutation, saves atomically, rejects stale revisions, owns weather realizations and auction seed, and advances the whole room only after all three operating roles are ready. Four-second refreshes support reconnects. Only procurement and instructor snapshots include open sealed bids. Each company credential can respond only for that company. The instructor audit records the role, action and revision. Credentials authenticate possession of an assigned role, not a person's identity.

Room files default to `.forest-rooms/` (mode 0600, directory 0700); override with `FOREST_ROOM_DIR`. Stop the server before restoring files from backup. Run one room-server process per data directory; the file store is not a distributed database. The server uses hashed role credentials and does not store their plaintext. Keep the instructor credential: there is no email recovery service. Server creation uses fresh private weather realizations (65% chance of each published forecast, otherwise one of four conditions) and a private seed; these are teaching scenarios, not probabilistic climate forecasts.

`npm test` covers role isolation, stale-write rejection, private snapshots, replacement credentials, restart/reconnect, the step barrier and company acceptance. `npx tsc -p tsconfig.server.json` checks server code. The app's standalone export/import remains available separately; room state is saved by the server.


Future crew schedules are edited by production and submitted with its plan using the same revision check. Instructor and production can see them; other roles cannot. Detailed historical production intervals are likewise hidden from other roles. Future numerical weather observations and unplayed scenario realizations are not sent to clients.

For controlled room creation, HTTPS, fragment invitations, recovery and backups, see [deployment instructions](deploy/README.md).
