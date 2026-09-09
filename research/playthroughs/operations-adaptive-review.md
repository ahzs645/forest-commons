# Adaptive service playthrough

Programmatic playthrough of the actual simulation API; no browser actions or visual checks. Reproduce from forestry-game with `./node_modules/.bin/tsx ../research/playthroughs/operations-adaptive.ts`.

## Outcome

Completed all 12 weeks: 56,009 m³ delivered; 63,053 harvested; CAD3,373,839 closing cash (CAD2,723,839 profit); 8/29 commitments met (27.6%); 6,280 m³ expired (9.96%). Delivery/profit objectives passed; service/freshness failed.

## Decisions and coverage

Bought private Q18 for CAD70,650; bid on Q21/Q22/Q23 using asking price and published appraisal only; waited out road washout and mill stoppage; repaired truck T3 with its stated one-week delay. Drafted weekly and compared reversed truck queues by forecast deliveries toward commitments; none improved that score. Set new monthly commitments from the four-week forecast rehearsal. Saved and loaded before and after all twelve steps and asserted exact serialized equality. No future actual weather or seed was read by policy code. No exceptions, invalid plans or save discrepancies occurred.

## Findings

- The default draft optimizes price per trip-time and remaining *market demand*, not remaining commitments. A player who sets forecast-based commitments then repeatedly drafts can still over-deliver them and lose service credit. This is a policy mismatch, not evidence of a broken simulator. A service-aware draft mode and visible commitment-band stop points would improve learnability.
- The rolling forecast repeats the current orders; it does not redraft on later weeks. Setting commitments from that forecast then adapting weekly is a materially different policy. This distinction deserves explicit nearby guidance.
- Service requires delivery within ±10%, so oversupply fails just as shortfall does, although only shortfall creates a penalty. Monthly undershoot/overshoot counts: [{"week":4,"under":0,"over":6,"hits":4,"checks":10},{"week":8,"under":2,"over":7,"hits":1,"checks":10},{"week":12,"under":1,"over":5,"hits":3,"checks":9}]. A visualization distinguishing under/within/over target would make the result much clearer than aggregate hits.
- Week 7 produced 33 operational messages, coinciding with truck outage and poor access. Group repeated messages by crew/truck and reason to make response decisions easier.
- Procurement upside can look attractive while trucks and product demand remain the constraints. Despite strong cash and volume this run expired almost 10% of harvest. An inventory-age/expiry timeline would help distinguish useful stock from stranded stock.

No confirmed new engine defect was found in this playthrough. This does not validate browser usability, classrooms, negotiation, partner dispatch or multi-year stewardship.
