# Buzz CLI installation

## Check first

```bash
command -v buzz
buzz --help
```

## Packaged Buzz Desktop

Buzz Desktop includes the native CLI.

On macOS:

```bash
mkdir -p "$HOME/.local/bin"
ln -sfn /Applications/Buzz.app/Contents/MacOS/buzz "$HOME/.local/bin/buzz"
```

Ensure `$HOME/.local/bin` is on `PATH`.

Do not copy the binary out of the application bundle. The symlink lets a Buzz Desktop update update the CLI too.

## Source checkout

From the Buzz repository:

```bash
cargo build --release -p buzz-cli
```

The binary is `target/release/buzz`. Alternatively:

```bash
cargo install --path crates/buzz-cli
```

## Authentication

Relay commands require:

- `BUZZ_RELAY_URL`
- `BUZZ_PRIVATE_KEY`
- optionally `BUZZ_AUTH_TAG`

Managed agents receive these from the Buzz harness. For standalone shells, configure them through the user's existing secret-management workflow. Never echo the values or place them in repository files.

The local `buzz pack` commands do not require relay authentication.

