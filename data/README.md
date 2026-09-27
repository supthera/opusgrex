# CA board recruiting data

- `ca-ot-roster.json` — contactable active California Occupational Therapists
- `ca-ota-roster.json` — contactable active California Occupational Therapy Assistants
- `ca-pt-roster.json` — contactable active California Physical Therapists
- `ca-pta-roster.json` — contactable active California Physical Therapist Assistants
- `raw/` — cached California DCA public licensee files + source fingerprint manifest

## Manual rebuild

```bash
npm run build:ca-ot
npm run build:ca-ota
npm run build:ca-pt
npm run build:ca-pta
# or: npm run build:ca-board -- ot|ota|pt|pta
# force re-download from DCA Box (ignore local cache):
# node scripts/build-ca-board-roster.mjs ot --force-download
```

Pipeline: DCA board public file (source of truth) → filter profession + Current → enrich via NPPES Registry API (CA ZIP sweeps + name pass) → keep rows with phone and/or email. License number is primary key; NPI secondary.

## Keeping data fresh

DCA does not publish a webhook when licensee files change. Freshness is enforced by fingerprinting the Box “Data” file (`id`, `size`, `sha1`, `modified_at`) against `raw/dca-source-manifest.json`.

### Local check / refresh

```bash
# Cheap: compare live Box metadata to the committed manifest (JSON on stdout)
npm run check:ca-freshness

# Rebuild only professions whose DCA source file changed
npm run refresh:ca-board

# Rebuild all four regardless of freshness
npm run refresh:ca-board:force
```

Under the hood:

1. `scripts/dca_freshness.py` — Python checker (stdlib only) against `scripts/dca_sources.json`
2. `scripts/refresh-ca-rosters.mjs` — orchestration; calls the Node builders with `--force-download`
3. Successful downloads update `raw/dca-source-manifest.json`

### GitHub Action

Workflow: `.github/workflows/refresh-ca-rosters.yml`

| Trigger | Behavior |
| --- | --- |
| Cron (weekdays 15:00 UTC) | Check Box fingerprints; rebuild + open PR only when a source changed |
| `workflow_dispatch` | Same, with optional `force=true`, profession list, or `use_cache` |

When a rebuild runs, the action opens a PR on `chore/refresh-ca-rosters` with updated roster JSON, raw DCA files, and the new manifest. Review the Actions summary stats, spot-check `/app`, then merge.

NPPES contact enrichment can take a long time (hours); the job timeout is 6 hours. Harvest caches under `raw/nppes-*-harvest.json` are gitignored and regenerated in CI.
