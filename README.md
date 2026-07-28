# Buzz Agent Skill

Installs and updates the Buzz CLI skill for Codex and Claude Code.

The package manages skill files only. The native `buzz` CLI remains owned by
Buzz Desktop or a source installation, so updating Buzz also updates the CLI.

## Install

```bash
npx buzz-agent-skill@latest install
```

This installs the skill into:

- `~/.codex/skills/buzz`
- `~/.claude/skills/buzz`

## Update

```bash
npx buzz-agent-skill@latest update
```

## Uninstall

```bash
npx buzz-agent-skill@latest uninstall
```

## Check

```bash
npx buzz-agent-skill@latest check
```

Commands print a concise, human-readable summary by default.

Add `--json` to any command for machine-readable output:

```bash
npx buzz-agent-skill@latest install --json
npx buzz-agent-skill@latest update --json
npx buzz-agent-skill@latest uninstall --json
npx buzz-agent-skill@latest check --json
```

## CLI installation

Buzz Desktop includes the native CLI. On macOS, the installer maintains:

```text
~/.local/bin/buzz -> /Applications/Buzz.app/Contents/MacOS/buzz
```

For source builds:

```bash
cargo build --release -p buzz-cli
```
