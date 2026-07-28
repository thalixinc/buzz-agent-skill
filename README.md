# Buzz Agent Skill

Installs and updates the Buzz CLI skill for Codex and Claude Code.

The package manages skill files only. The native `buzz` CLI remains owned by
Buzz Desktop or a source installation, so updating Buzz also updates the CLI.

## Install

```bash
npx buzz-agent-skill install
```

This installs the skill into:

- `~/.codex/skills/buzz`
- `~/.claude/skills/buzz`

## Update

```bash
npx buzz-agent-skill@latest update
```

## Check

```bash
npx buzz-agent-skill check
```

The check reports skill versions, CLI availability, and whether Buzz
authentication variables are set. It never prints secret values.

## CLI installation

Buzz Desktop includes the native CLI. On macOS, the installer maintains:

```text
~/.local/bin/buzz -> /Applications/Buzz.app/Contents/MacOS/buzz
```

For source builds:

```bash
cargo build --release -p buzz-cli
```

