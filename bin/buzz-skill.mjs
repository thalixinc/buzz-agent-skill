#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceSkill = join(packageRoot, "skill", "buzz");
const markerName = ".buzz-skill-package.json";
const targets = [
  { agent: "codex", path: join(homedir(), ".codex", "skills", "buzz") },
  { agent: "claude", path: join(homedir(), ".claude", "skills", "buzz") },
];

function packageVersion() {
  return JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"))
    .version;
}

function marker(target) {
  const path = join(target, markerName);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function installTarget({ agent, path }, force) {
  const existingMarker = marker(path);
  if (existsSync(path) && !existingMarker && !force) {
    throw new Error(
      `${agent}: ${path} exists but is not managed by buzz-agent-skill; rerun with --force to replace it`,
    );
  }

  mkdirSync(dirname(path), { recursive: true });
  const staging = `${path}.staging-${process.pid}`;
  const backup = `${path}.backup-${process.pid}`;
  rmSync(staging, { recursive: true, force: true });
  cpSync(sourceSkill, staging, { recursive: true });
  writeFileSync(
    join(staging, markerName),
    `${JSON.stringify(
      {
        package: "buzz-agent-skill",
        version: packageVersion(),
        installed_at: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );

  if (existsSync(path)) renameSync(path, backup);
  try {
    renameSync(staging, path);
    rmSync(backup, { recursive: true, force: true });
  } catch (error) {
    rmSync(path, { recursive: true, force: true });
    if (existsSync(backup)) renameSync(backup, path);
    throw error;
  }

  return { agent, path, version: packageVersion() };
}

function findBuzz() {
  try {
    return execFileSync(
      platform() === "win32" ? "where" : "which",
      ["buzz"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    )
      .trim()
      .split(/\r?\n/)[0];
  } catch {
    return null;
  }
}

function ensureMacCliLink() {
  if (platform() !== "darwin") return null;
  const bundled = "/Applications/Buzz.app/Contents/MacOS/buzz";
  if (!existsSync(bundled)) return null;

  const link = join(homedir(), ".local", "bin", "buzz");
  mkdirSync(dirname(link), { recursive: true });
  if (existsSync(link) || lstatExists(link)) {
    if (lstatSync(link).isSymbolicLink() && readlinkSync(link) === bundled) {
      return link;
    }
    if (!lstatSync(link).isSymbolicLink()) return null;
    rmSync(link);
  }
  symlinkSync(bundled, link);
  return link;
}

function lstatExists(path) {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

function cliStatus() {
  const linked = ensureMacCliLink();
  const binary = findBuzz() ?? linked;
  if (!binary) {
    return {
      ok: false,
      message:
        "Buzz CLI not found. Install Buzz Desktop or build `cargo build --release -p buzz-cli`.",
    };
  }
  try {
    const help = execFileSync(binary, ["--help"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: help.includes("Buzz CLI"), path: binary };
  } catch (error) {
    return {
      ok: false,
      path: binary,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function status() {
  return {
    package_version: packageVersion(),
    cli: cliStatus(),
    skills: targets.map(({ agent, path }) => ({
      agent,
      path,
      installed: existsSync(join(path, "SKILL.md")),
      managed: Boolean(marker(path)),
      version: marker(path)?.version ?? null,
    })),
  };
}

function formatStatus(result) {
  const lines = [
    `Buzz Agent Skill v${result.package_version}`,
    "",
    `${result.cli.ok ? "✓" : "✗"} Buzz CLI${
      result.cli.path ? `  ${result.cli.path}` : ""
    }`,
  ];

  if (!result.cli.ok && result.cli.message) {
    lines.push(`  ${result.cli.message}`);
  }

  lines.push("", "Agent skills");
  for (const skill of result.skills) {
    const ok = skill.installed && skill.managed;
    const details = [
      skill.installed ? "installed" : "not installed",
      skill.managed ? "managed" : "not managed",
      skill.version ? `v${skill.version}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    lines.push(
      `${ok ? "✓" : "✗"} ${skill.agent.padEnd(7)} ${details}`,
      `  ${skill.path}`,
    );
  }

  const healthy =
    result.cli.ok &&
    result.skills.every((skill) => skill.installed && skill.managed);
  lines.push("", healthy ? "Everything looks good." : "Some items need attention.");
  return lines.join("\n");
}

const [command = "check", ...args] = process.argv.slice(2);
const force = args.includes("--force");
const json = args.includes("--json");

try {
  if (command === "install" || command === "update") {
    const installed = targets.map((target) => installTarget(target, force));
    const result = { installed, cli: cliStatus() };
    console.log(JSON.stringify(result, null, 2));
    if (!result.cli.ok) process.exitCode = 1;
  } else if (command === "check") {
    const result = status();
    console.log(json ? JSON.stringify(result, null, 2) : formatStatus(result));
    if (
      !result.cli.ok ||
      result.skills.some((skill) => !skill.installed || !skill.managed)
    ) {
      process.exitCode = 1;
    }
  } else {
    console.error(
      "Usage: buzz-skill <install|update|check> [--force] [--json]",
    );
    process.exitCode = 1;
  }
} catch (error) {
  console.error(
    JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
}
