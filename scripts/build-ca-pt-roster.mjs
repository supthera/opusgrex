#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";

const script = path.resolve(import.meta.dirname, "build-ca-board-roster.mjs");
const child = spawn(process.execPath, [script, "pt"], {
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 1));
