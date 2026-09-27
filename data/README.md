# CA board recruiting data

- `ca-ot-roster.json` — contactable active California Occupational Therapists for `/app`
- `ca-pt-roster.json` — contactable active California Physical Therapists for `/app`
- `raw/` — cached California DCA public licensee files (OT + PT)

Rebuild:

```bash
npm run build:ca-ot
npm run build:ca-pt
# or: npm run build:ca-board -- ot|pt
```

Pipeline: DCA board public file (source of truth) → filter profession + Current → enrich via NPPES Registry API (CA ZIP sweeps + name pass) → keep rows with phone and/or email. License number is primary key; NPI secondary.

Assistants (OTA / PTA) are excluded.
