import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const defaultDevDistDir = ".next-dev";
let nextDistDir = process.env.NEXT_DIST_DIR?.trim() || defaultDevDistDir;

const lockPath = join(process.cwd(), nextDistDir, "dev", "lock");
if (existsSync(lockPath)) {
  const recoveryDir = `${defaultDevDistDir}-recovery-${Date.now()}`;
  console.warn(
    `[dev] Found existing lock at "${lockPath}". Using "${recoveryDir}" for this session.`
  );
  nextDistDir = recoveryDir;
}

const child = spawn("next", ["dev"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NEXT_DIST_DIR: nextDistDir },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("[dev] Failed to start Next.js dev server:", error.message);
  process.exit(1);
});
