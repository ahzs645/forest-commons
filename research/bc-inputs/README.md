# Prince George BC input collection

Current successful snapshot: `prince-george-source-snapshot-2026-09-07-v2/`.
The earlier directory records the failed first request; v2 discovered the actual service geometry column (`GEOMETRY`) through DescribeFeatureType instead of assuming `SHAPE`.

## What is collected

The pilot authoring bounding box is west −123.0, south 53.95, east −122.9, north 54.02. This is a chosen sample northwest of Prince George, not a user-approved full region boundary. Features intersecting it are retained whole, so their geometry can extend beyond the box.

- [VRI 2025 Rank 1 inventory](https://catalogue.data.gov.bc.ca/dataset/2ebb35d8-c82f-4a17-9c96-612ac3532d55): 781 polygons, catalogue licence Open Government Licence – British Columbia.
- [Forest Tenure Road Segment Lines](https://catalogue.data.gov.bc.ca/dataset/9e5bfa62-2339-445e-bf67-81657180c682): 10 features, same catalogue licence.
- [DRA Master Partially-Attributed Roads](https://catalogue.data.gov.bc.ca/dataset/bb060417-b6e6-4548-b837-f9060d94743e) and [Major Timber Processing Facilities](https://catalogue.data.gov.bc.ca/dataset/67daf53d-e3bb-45ee-9121-8aa1193b7492): metadata only. Their current catalogue entries say Access Only; no geographic data from these records was bundled.

Each snapshot has full catalogue metadata, service schema, request URLs, collection time and SHA-256 file checksums. Both sample responses report their matching counts equal to returned feature counts. This indicates complete results for this bounding-box query at collection time, not complete BC coverage. `geometry-check.json` records unique IDs, finite longitude/latitude coordinates and actual geometry bounds. The geojsons have 41,246 inventory coordinates and 1,407 road coordinates.

Contains information licensed under the Open Government Licence – British Columbia. See the licence URLs retained in each catalogue record. No government endorsement is implied.

## Reproduce

From `forestry-game`:

```sh
python3 scripts/collect-bc-inputs.py ../research/bc-inputs/new-snapshot-directory
```

The collector refuses to overwrite snapshots, uses a bounded query, records failures, checks the exact catalogue licence before downloading data, and does not silently mark capped or unknown-total responses complete. Dataset resources must still advertise the expected layer. Province-wide download is deliberately not performed.

Service implementation references: [BC government bcdata API documentation](https://bcgov.github.io/bcdata/articles/service_documentation.html), [WFS getting started](https://bcgov.github.io/data-publication/pages/map_wms_wfs_getting_started.html).

## Conversion decisions still needed

| Source fields / data | Intended game use | Required conversion or review |
|---|---|---|
| Polygon geometry, POLYGON_AREA, FEATURE_AREA_SQM | Stand outline and hectares | Keep source IDs, decide whole-polygon versus clipped-area policy, handle multi-polygons; never multiply clipped geometry by a whole-polygon area without adjustment. |
| SPECIES_CD_1…6, SPECIES_PCT_1…6 | Species context | Species percentages are not merchantable assortment recovery. Author recovery/grade rules separately. |
| LIVE_STAND_VOLUME_125/175/225, LIVE_VOL_PER_HA_SPP… | Standing volume | Select the published utilization threshold, projection year and units. Do not treat a per-hectare value as whole-stand m³ or convert null to zero without an explicit policy. |
| PROJ_AGE_1/2 and mortality fields | Stand history and annual management | Preserve projection dates; select a locally appropriate yield model. A measured or projected age does not validate the current teaching growth coefficient. |
| Tenure-road lines, status, length | Road graph | Reconcile status and physical access; split/connect topology, check crossings, snap tolerances, and bridge/load restrictions. Tenure lines alone are not a complete travel network. |
| Inventory polygons | Candidate supply areas | Inventory does not establish ownership, harvest authorization, auction availability or protected status. Those must come from appropriate separate sources and teaching rules. |
| Mill records and market/fleet data | Destinations, demand and transport | Reuse conditions and operating status remain to be checked; prices, payloads, hours and demand need explicit evidence or labelled teaching assumptions. |

These files are evidence inputs, not an executable or professionally calibrated BC RegionDefinition. Québec campaign saves and coefficients remain unchanged. A playable BC teaching preset can use explicit illustrative assumptions, but must not be labelled an operationally reviewed regional model.
