# Ship Signal

Discord presence for coding agents. The member list shows your product. The card shows the latest changed file, the tool's logo, and elapsed time. Task and agent status live in the artwork hover text.

## Install the beta

Node.js 22+ and Discord desktop are required. This package is not published to npm yet.

```sh
npm install -g ./ship-signal-0.3.1-beta.1.tgz
cd your-project
ship-signal codex --project "My product"
ship-signal claude --project "My product" --task "Building checkout"
ship-signal gemini
ship-signal opencode
ship-signal aider
ship-signal goose
ship-signal copilot
ship-signal cursor-agent
```

Ship's shared Discord Application ID is built in. No account token, bot token, OAuth consent, or developer portal setup is needed. Enable activity sharing in Discord. Each coding tool must already be installed; Ship Signal doesn't install or authenticate the tools.

Use any executable, including an absolute path. Arguments after `--` go directly to the child without shell interpolation:

```sh
ship-signal my-agent --project "Storefront" -- --model example
```

Known tools get branded artwork. Unknown tools use Ship's generic mark; an explicit JSON profile can supply any public HTTPS image or uploaded Discord asset key. The CLI doesn't intercept plain `codex` or `claude` commands: launch them through `ship-signal`.

## Follow your Codex chats automatically

```sh
ship-signal desktop start \
  --sessions-dir "$HOME/.codex/sessions" \
  --state-dir "$HOME/.local/state/ship-signal"
ship-signal desktop status --state-dir "$HOME/.local/state/ship-signal"
ship-signal desktop stop --state-dir "$HOME/.local/state/ship-signal"
```

This opt-in mode follows the most recently prompted Codex chat, not the visually selected tab. It reads only the session's working-directory metadata and lifecycle event tags for presence decisions. Prompt/reply bodies are never forwarded or used as task labels. Background updates and subagent logs cannot take over the selected chat. It switches the file watcher to that chat's project directory and resets the file label on switching.

Project names default to the working folder's basename. Optional `--project-map /absolute/path/names.json` maps absolute project folders to public product names:

```json
{ "/path/to/storefront": "My Store" }
```

`--project NAME` pins one public name for all selected chats. `--task TEXT` pins a public task label. Without it, the task defaults to `Building <product>`. A profile's fixed task/project fields aren't applied across automatically selected chats.

Alternatively, pin a single chat with `--session /path/to/rollout.jsonl`. Add `--watch /path/to/project` for file updates in that mode. The adapter uses Codex's internal local log format and may need updates when that format changes. Automatic cross-chat discovery for Claude/Gemini/other tools is not implemented; their terminal wrappers do show tool artwork and changed files.

## What updates, and when

- Member-list status: just the product name; `Building` when unavailable/private.
- Card details: latest eligible changed basename, or the explicit task before a file changes.
- Hover: agent name, lifecycle phase when available, public task, changed filename.
- Terminal wrapper changes are coalesced every 15 seconds.
- Desktop monitor polls every 2 seconds; session discovery refreshes every 5 seconds. It considers the 32 most recently modified session files, reading at most 4 MB per file per tick.
- File changes can come from any process in the project. This does not prove the agent edited a file. Read-only tool activity and every intermediate edit are not captured.
- Hidden files, dependency/build folders and likely secret filenames are excluded. Only basenames go to Discord. Filters are best effort.

## Options

`--task`, `--project`, `--profile FILE`, `--focus MINUTES`, `--client-id ID`, `--private`, `--preview`.

Private mode (terminal wrapper) disables watching and hides project names, files, images and links; explicit task/name remain public. Automatic desktop mode is an explicit opt-in to showing project basenames and changed source basenames. Stop it before private sessions.

The desktop process expires after eight hours by default (`--hours`, maximum 24). It survives terminal closure but installs no boot/login service. Runtime files are local to your chosen state directory. `connection: published` means Discord acknowledged the payload; verify profile visibility separately. The lock prevents duplicates in the same runtime folder. If a crash leaves a lock, confirm the recorded process has stopped before removing it.

## Rich profiles

See `profiles/showcase.json`. Replace its example URLs before using it. Supported keys: `name`, `task`, `project`, `type`, `statusDisplay`, `largeImage`, `smallImage`, `largeText`, `smallText`, `largeUrl`, `smallUrl`, `detailsUrl`, `stateUrl`, `buttons` (at most two), and `focusMinutes`.

The shared app has Codex and Claude art uploaded. Other providers reference public logo URLs. Remote images depend on their hosts and Discord's image proxy. Explicit `largeImage` overrides automatic tool art. Set `statusDisplay` to `state` for the product-only member-list status. Buttons appear only to other users. Discord controls layout and truncation.

## Beta limitations and release checks

Tested locally on macOS with live Discord for Codex. Protocol, multiple-chat selection, process lifecycle, privacy, providers and file-label formatting have automated tests. Linux/macOS CI is configured but has not run remotely. Windows is unverified. No claim of million-user readiness.

Multiple simultaneous wrappers and a desktop monitor can compete for presence; run one publisher at a time. Terminal integration for other providers is generic process/file watching, not full agent lifecycle support. There is no central presence server and no telemetry. No prompt text or source contents are transmitted.

```sh
npm test
npm pack
```

Before a public release: cross-platform live verification, multi-publisher arbitration, stale-lock recovery, official agent hooks, package provenance and signed distribution. Rich Presence reference: https://discord.com/developers/discord-social-sdk/development-guides/setting-rich-presence
