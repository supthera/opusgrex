# CA board recruiting data

- `ca-ot-roster.json` — contactable active California Occupational Therapists
- `ca-ota-roster.json` — contactable active California Occupational Therapy Assistants
- `ca-pt-roster.json` — contactable active California Physical Therapists
- `ca-pta-roster.json` — contactable active California Physical Therapist Assistants
- `ca-rn-roster.json` — contactable California RNs from NPPES, including state license numbers
- `ca-lvn-roster.json` — contactable California LVNs from NPPES, including state license numbers
- `raw/` — cached California DCA public licensee files

Rebuild:

```bash
npm run build:ca-ot
npm run build:ca-ota
npm run build:ca-pt
npm run build:ca-pta
# or: npm run build:ca-board -- ot|ota|pt|pta
npm run build:ca-nursing
```

`build:ca-nursing` rewrites `data/ca-rn-roster.json` and `data/ca-lvn-roster.json` from the stored California NPPES shard. License numbers already in those files are kept when the shard row has none. The monthly NPPES workflow rebuilds and commits both files after CMS posts the downloadable file.

Texas and Florida use the same recruiting screens, filled from NPPES practice listings for OT, OTA, PT, PTA, LVN, and RN:

```bash
npm run build:tx-rosters
npm run build:fl-rosters
```

The monthly workflow rebuilds `data/tx-*-roster.json` and `data/fl-*-roster.json` when those state shards change.

Pipeline: DCA board public file (source of truth) → filter profession + Current → enrich via NPPES Registry API (CA ZIP sweeps + name pass) → keep rows with phone and/or email. License number is primary key; NPI secondary.
