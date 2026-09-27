# CA OT recruiting data

- `ca-ot-roster.json` — generated roster for `/app` (board-active Current OTs with NPPES public contact).
- `raw/` — cached California DCA Occupational Therapy public licensee file (optional; rebuild script can re-download).

Rebuild:

```bash
npm run build:ca-ot
```

Pipeline: DCA/CBOT public file (source of truth) → filter Occupational Therapist + Current → enrich via NPPES Registry API (CA ZIP sweeps) → keep rows with phone and/or email. License number is primary key; NPI secondary.
