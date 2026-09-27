# CA board recruiting data

- `ca-ot-roster.json` — contactable active California Occupational Therapists
- `ca-ota-roster.json` — contactable active California Occupational Therapy Assistants
- `ca-pt-roster.json` — contactable active California Physical Therapists
- `ca-pta-roster.json` — contactable active California Physical Therapist Assistants
- `raw/` — cached California DCA public licensee files

Rebuild:

```bash
npm run build:ca-ot
npm run build:ca-ota
npm run build:ca-pt
npm run build:ca-pta
# or: npm run build:ca-board -- ot|ota|pt|pta
```

Pipeline: DCA board public file (source of truth) → filter profession + Current → enrich via NPPES Registry API (CA ZIP sweeps + name pass) → keep rows with phone and/or email. License number is primary key; NPI secondary.
