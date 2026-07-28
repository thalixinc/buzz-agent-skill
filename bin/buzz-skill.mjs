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
const skillHome = process.env.BUZZ_SKILL_HOME || homedir();
const targets = [
  { agent: "codex", path: join(skillHome, ".codex", "skills", "buzz") },
  { agent: "claude", path: join(skillHome, ".claude", "skills", "buzz") },
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

function uninstallTarget({ agent, path }, force) {
  if (!existsSync(path)) {
    return { agent, path, removed: false, reason: "not installed" };
  }
  if (!marker(path) && !force) {
    throw new Error(
      `${agent}: ${path} is not managed by buzz-agent-skill; rerun with --force to remove it`,
    );
  }

  rmSync(path, { recursive: true, force: true });
  return { agent, path, removed: true };
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

  const link = join(skillHome, ".local", "bin", "buzz");
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

function formatChange(result) {
  const verbs = {
    install: "Installed",
    update: "Updated",
    uninstall: "Uninstalled",
  };
  const lines = [
    `${verbs[result.action]} Buzz Agent Skill v${result.package_version}`,
    "",
  ];

  for (const skill of result.skills) {
    const changed =
      result.action === "uninstall" ? skill.removed : Boolean(skill.version);
    const detail = changed
      ? result.action === "uninstall"
        ? "removed"
        : `v${skill.version}`
      : skill.reason;
    lines.push(
      `${changed ? "✓" : "–"} ${skill.agent.padEnd(7)} ${detail}`,
      `  ${skill.path}`,
    );
  }

  if (result.cli) {
    lines.push(
      "",
      `${result.cli.ok ? "✓" : "✗"} Buzz CLI${
        result.cli.path ? `  ${result.cli.path}` : ""
      }`,
    );
    if (!result.cli.ok && result.cli.message) {
      lines.push(`  ${result.cli.message}`);
    }
  }

  lines.push("", "Done.");
  return lines.join("\n");
}

function usage() {
  return [
    "Buzz Agent Skill",
    "",
    "Usage:",
    "  buzz-skill install [--force] [--json]",
    "  buzz-skill update [--force] [--json]",
    "  buzz-skill uninstall [--force] [--json]",
    "  buzz-skill check [--json]",
    "",
    "Options:",
    "  --force  Replace or remove skill folders not managed by this package",
    "  --json   Print machine-readable JSON",
    "  --help   Show this help",
  ].join("\n");
}

const [command = "check", ...args] = process.argv.slice(2);
const force = args.includes("--force");
const json = args.includes("--json");

try {
  if (command === "install" || command === "update") {
    const result = {
      action: command,
      package_version: packageVersion(),
      skills: targets.map((target) => installTarget(target, force)),
      cli: cliStatus(),
    };
    console.log(json ? JSON.stringify(result, null, 2) : formatChange(result));
    if (!result.cli.ok) process.exitCode = 1;
  } else if (command === "uninstall") {
    const result = {
      action: command,
      package_version: packageVersion(),
      skills: targets.map((target) => uninstallTarget(target, force)),
    };
    console.log(json ? JSON.stringify(result, null, 2) : formatChange(result));
  } else if (command === "check") {
    const result = status();
    console.log(json ? JSON.stringify(result, null, 2) : formatStatus(result));
    if (
      !result.cli.ok ||
      result.skills.some((skill) => !skill.installed || !skill.managed)
    ) {
      process.exitCode = 1;
    }
  } else if (command === "help" || command === "--help" || command === "-h") {
    console.log(usage());
  } else {
    console.error(usage());
    process.exitCode = 1;
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    json
      ? JSON.stringify({ ok: false, command, error: message }, null, 2)
      : `✗ ${command} failed\n\n${message}`,
  );
  process.exitCode = 1;
}
