#!/usr/bin/env node
/**
 * Orchestrate CA board roster refresh.
 *
 * 1) Run scripts/dca_freshness.py to detect new DCA Box drops
 * 2) Rebuild only professions whose source file changed (or all with --force)
 * 3) Write a machine-readable summary for GitHub Actions
 *
 * Usage:
 *   node scripts/refresh-ca-rosters.mjs
 *   node scripts/refresh-ca-rosters.mjs --force
 *   node scripts/refresh-ca-rosters.mjs --professions ot,pt
 *   node scripts/refresh-ca-rosters.mjs --check-only
 */
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const RAW_DIR = path.join(ROOT, "data", "raw");
const SUMMARY_PATH = path.join(RAW_DIR, "refresh-summary.json");
const FRESHNESS_REPORT = path.join(RAW_DIR, "dca-freshness-report.json");

function parseArgs(argv) {
  const args = {
    force: argv.includes("--force"),
    checkOnly: argv.includes("--check-only"),
    useCache: argv.includes("--use-cache"),
    professions: null,
  };
  const idx = argv.indexOf("--professions");
  if (idx >= 0 && argv[idx + 1]) {
    args.professions = argv[idx + 1]
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  return args;
}

function run(cmd, cmdArgs, { cwd = ROOT } = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n$ ${cmd} ${cmdArgs.join(" ")}`);
    const child = spawn(cmd, cmdArgs, {
      cwd,
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

function runCapture(cmd, cmdArgs, { cwd = ROOT } = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const child = spawn(cmd, cmdArgs, {
      cwd,
      stdio: ["ignore", "pipe", "inherit"],
      env: process.env,
    });
    child.stdout.on("data", (d) => chunks.push(d));
    child.on("error", reject);
    child.on("close", (code) => {
      const stdout = Buffer.concat(chunks).toString("utf8");
      if (code === 0 || code === 2) resolve({ code, stdout });
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

async function checkFreshness() {
  const { stdout } = await runCapture("python3", [
    path.join("scripts", "dca_freshness.py"),
    "--write-report",
    path.relative(ROOT, FRESHNESS_REPORT),
  ]);
  return JSON.parse(stdout);
}

async function readRosterStats(profession) {
  try {
    const raw = await readFile(
      path.join(ROOT, "data", `ca-${profession}-roster.json`),
      "utf8"
    );
    const data = JSON.parse(raw);
    return {
      profession,
      generatedAt: data.generatedAt || null,
      boardActive: data.stats?.boardActive ?? null,
      matchedWithContact: data.stats?.matchedWithContact ?? null,
      unmatchedActiveBoard: data.stats?.unmatchedActiveBoard ?? null,
    };
  } catch {
    return { profession, generatedAt: null, missing: true };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(RAW_DIR, { recursive: true });

  console.log("Checking DCA Box sources for new drops…");
  const freshness = await checkFreshness();
  console.log(
    freshness.needsRefresh
      ? `Stale sources detected → rebuild: ${freshness.professionsToRebuild.join(", ")}`
      : "All tracked DCA sources match the committed manifest."
  );

  let professions = args.professions;
  if (!professions) {
    if (args.force) {
      professions = ["ot", "ota", "pt", "pta"];
    } else {
      professions = freshness.professionsToRebuild;
    }
  }

  const summary = {
    startedAt: new Date().toISOString(),
    force: args.force,
    checkOnly: args.checkOnly,
    needsRefresh: freshness.needsRefresh || args.force,
    freshness,
    professionsRequested: professions,
    rebuilt: [],
    skipped: false,
    finishedAt: null,
    before: {},
    after: {},
  };

  if (args.checkOnly) {
    summary.skipped = true;
    summary.finishedAt = new Date().toISOString();
    await writeFile(SUMMARY_PATH, JSON.stringify(summary, null, 2) + "\n");
    console.log(`Check-only complete. Summary → ${SUMMARY_PATH}`);
    process.exit(freshness.needsRefresh ? 2 : 0);
  }

  if (!professions.length) {
    summary.skipped = true;
    summary.finishedAt = new Date().toISOString();
    await writeFile(SUMMARY_PATH, JSON.stringify(summary, null, 2) + "\n");
    console.log("Nothing to rebuild — data is current.");
    process.exit(0);
  }

  for (const key of professions) {
    summary.before[key] = await readRosterStats(key);
  }

  for (const key of professions) {
    const buildArgs = [
      path.join("scripts", "build-ca-board-roster.mjs"),
      key,
      "--force-download",
    ];
    if (args.useCache) buildArgs.push("--use-cache");
    await run("node", buildArgs);
    summary.rebuilt.push(key);
    summary.after[key] = await readRosterStats(key);
  }

  summary.finishedAt = new Date().toISOString();
  await writeFile(SUMMARY_PATH, JSON.stringify(summary, null, 2) + "\n");
  console.log(`\nRefresh complete. Rebuilt: ${summary.rebuilt.join(", ")}`);
  console.log(`Summary → ${SUMMARY_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
