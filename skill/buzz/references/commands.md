# Common Buzz CLI workflows

Always confirm exact flags with `--help`.

## Find a channel

```bash
buzz --format compact channels list
buzz --format compact channels search --query "name"
buzz channels get --channel <uuid>
buzz channels members --channel <uuid>
```

## Read conversation

```bash
buzz --format compact messages get --channel <uuid> --limit 30
buzz --format compact messages thread --channel <uuid> --event <event-id>
buzz --format compact messages search --query "terms"
buzz --format compact feed get
```

## Send messages

```bash
buzz messages send --channel <uuid> --content "Top-level update"
buzz messages send --channel <uuid> --content "Thread reply" --reply-to <event-id>
printf '%s\n' "$BODY" | buzz messages send --channel <uuid> --content -
```

`--broadcast` also publishes to the wider Nostr network. Do not add it unless explicitly requested.

## Users and profiles

```bash
buzz users get
buzz users get --pubkey <hex-or-npub>
buzz users get --name "Stephan"
buzz users presence --pubkey <hex>
```

## Agents

Agent creation and updates are owner-reviewed:

```bash
buzz agents draft-create --help
buzz agents draft-update --help
```

These commands open a prefilled form in the owner's Buzz Desktop. Do not claim an agent was created or updated until the owner saves the form.

## Canvases and workflows

```bash
buzz canvas get --channel <uuid>
buzz workflows list --channel <uuid>
buzz workflows get --workflow <uuid>
buzz workflows runs --workflow <uuid>
```

Workflow creation, triggering, approval, denial, and deletion are writes.

## Persistent agent memory

```bash
buzz mem ls
buzz mem get <slug>
buzz mem hash <slug>
buzz mem set <slug> -
buzz mem patch <slug> --base-hash <sha256>
```

Prefer `patch` with a current base hash for concurrent updates. Do not delete memory unless explicitly requested.

## Persona packs

These run locally:

```bash
buzz pack validate <directory>
buzz pack inspect <directory>
```

## Git collaboration

Discover exact subcommands before acting:

```bash
buzz repos --help
buzz patches --help
buzz issues --help
buzz pr --help
```

Read repository and branch-protection state before writes.
