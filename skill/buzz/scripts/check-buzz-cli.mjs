#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readlinkSync } from "node:fs";
import { homedir, platform } from "node:os";
import { delimiter, join } from "node:path";

function findOnPath(name) {
  const extensions = platform() === "win32" ? ["", ".exe", ".cmd"] : [""];
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    if (!directory) continue;
    for (const extension of extensions) {
      const candidate = join(directory, `${name}${extension}`);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

const pathBinary = findOnPath("buzz");
const macBundledBinary = "/Applications/Buzz.app/Contents/MacOS/buzz";
const bundledBinary =
  platform() === "darwin" && existsSync(macBundledBinary)
    ? macBundledBinary
    : null;

const binary = pathBinary ?? bundledBinary;
if (!binary) {
  console.error(
    JSON.stringify({
      ok: false,
      error: "buzz_cli_missing",
      message:
        "Install Buzz Desktop or build buzz-cli from the Buzz source repository.",
    }),
  );
  process.exit(1);
}

let help;
try {
  help = execFileSync(binary, ["--help"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (error) {
  console.error(
    JSON.stringify({
      ok: false,
      error: "buzz_cli_unusable",
      path: binary,
      message: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
}

const localLink = join(homedir(), ".local", "bin", "buzz");
let linkTarget = null;
if (existsSync(localLink) && lstatSync(localLink).isSymbolicLink()) {
  linkTarget = readlinkSync(localLink);
}

console.log(
  JSON.stringify(
    {
      ok: help.includes("Buzz CLI"),
      path: binary,
      local_link: existsSync(localLink) ? localLink : null,
      local_link_target: linkTarget,
      configuration: {
        relay_url: process.env.BUZZ_RELAY_URL ? "set" : "unset",
        private_key: process.env.BUZZ_PRIVATE_KEY ? "set" : "unset",
        auth_tag: process.env.BUZZ_AUTH_TAG ? "set" : "unset",
      },
    },
    null,
    2,
  ),
);

