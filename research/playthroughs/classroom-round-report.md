# Classroom role playthrough — 7 September 2026

This was a **programmatic playthrough through RoomStore**, not a browser or usability test. An isolated temporary room directory was used; the running classroom server, browser saves and shared implementation were untouched. The accompanying `classroom-round.ts` can be run with the project's tsx executable. Each run creates fresh server-randomized weather, so totals vary. `classroom-round-results.json` records this run without credentials.

## Decisions and result

Played purchase, production and transport for four weekly turns, plus all five companies and the instructor. Purchase inspected its role-visible lot schedule and bid the published asking price when the lot cost less than a quarter of cash. Production and transport used the server's available draft action. All three roles marked ready before the instructor advanced. No future realization or seed was accessed; role views mask these.

The month ended at week 5 with CAD 1,487,223.44 cash. The five companies accepted a valid EPM proposal unanimously. A volume allocation assigned company 3 savings of −77.19 exercise kSEK and was correctly prevented from becoming an agreement until renegotiated. This matches the game's stated individual-rationality gate; the negative allocation itself remains an educational comparison.

## Checks exercised successfully

- Advancing before the three operational roles were ready was rejected.
- A production attempt to submit bids and a company attempt to advance were rejected.
- A stale revision was rejected without committing its action.
- Purchase bids were hidden from transport; crew queues were hidden from transport; truck queues were hidden from production.
- Historical plan bids were hidden from a company role.
- Future actual weather was masked with the published forecast and the seed was masked to zero.
- Recreating RoomStore from disk after every turn retained the transport role's entire visible state.
- Replacing a company credential invalidated its previous credential.
- All five authenticated company roles recorded their own acceptance and the proposal became agreed.

No functional defects were encountered in these exercised paths. This is a bounded, sequential role simulation: it does not establish browser usability, simultaneous-client behavior, network reconnection, all privacy channels, or a full twelve-week outcome. The generated report contains recorded weekly cargo and messages for independent review.
