<p align="center"><img src="assets/agent-presence.png" width="100" alt="Agent Presence"></p>
<h1 align="center">Agent Presence</h1>
<p align="center">Discord Rich Presence for AI Coding Agents.</p>
<p align="center"><img src="https://img.shields.io/badge/tests-21%20passing-brightgreen" alt="21 tests pass locally"> <img src="https://img.shields.io/badge/license-MIT-lime" alt="MIT"> <img src="https://img.shields.io/badge/Node-22%2B-blue" alt="Node 22+"> <img src="https://img.shields.io/badge/status-beta-orange" alt="Beta"></p>

Show what you're building while you use Codex, Claude Code, Gemini CLI, OpenCode, Aider, Goose, Copilot, Cursor, or your own terminal agent.

```text
                 Ship
 [agent logo]    Changed checkout.tsx
                 My Store
                 24:08 elapsed
```

The member list shows **My Store**. The card shows the latest changed file. Hover over the logo for tool, task and status details.

## Get started in a minute

You need **[Node.js 22+](https://nodejs.org/en/download)**, **Discord desktop**, and your coding agent installed. Tested live on macOS. Linux and Windows still need live verification.

**1. Install**

```sh
npm install -g https://github.com/codewithriza/agent-presence/releases/download/v0.3.1-beta.1/agent-presence.tgz
```

**2. Run setup**

```sh
agent-presence setup
```

Choose terminal agents or automatic Codex desktop tracking. No API keys, bot tokens, or Discord developer account. Keep Discord desktop open and enable activity sharing in Discord settings.

**Already know what you want?** From your project folder:

```sh
agent-presence codex
# or
agent-presence claude
```

For Codex desktop chats:

```sh
agent-presence desktop start --auto
```

It follows the most recently **prompted** chat, rather than whichever tab you click. Runs for eight hours by default. Stop any time:

```sh
agent-presence desktop stop
```

## Make it yours

```sh
# A clean public product name
agent-presence codex --project "My Store"

# A task label; agent arguments go after --
agent-presence claude --task "Building checkout" -- --model sonnet

# Hide project names, filenames, artwork, and links
agent-presence codex --private

# See what would be published without launching anything
agent-presence opencode --project "My Store" --preview

# Diagnose setup
agent-presence doctor
```

## Agents

| Agent | Command | Logo | Chat lifecycle |
| --- | --- | --- | --- |
| Codex | `agent-presence codex` | Codex | Automatic desktop mode available |
| Claude Code | `agent-presence claude` | Claude | Process and file watching |
| Gemini CLI | `agent-presence gemini` | Gemini | Process and file watching |
| OpenCode | `agent-presence opencode` | OpenCode | Process and file watching |
| Aider | `agent-presence aider` | Aider | Process and file watching |
| Goose | `agent-presence goose` | Goose | Process and file watching |
| GitHub Copilot | `agent-presence copilot` | Copilot | Process and file watching |
| Cursor | `agent-presence cursor-agent` | Cursor | Process and file watching |
| Any executable | `agent-presence your-tool` | Generic or custom | Process and file watching |

The wrapper doesn't install agents or change your shell configuration. Plain `codex`/`claude` commands aren't intercepted. Use one publisher at a time: stop desktop mode before starting a terminal wrapper.

## What leaves your computer?

Your public product/task labels, tool name, changed file **basename**, session timer, and configured links/artwork go to Discord. **No prompts, replies, code contents, tokens, or telemetry.** Discord applies your activity visibility settings.

The file watcher observes changes from any process in your project. It doesn't claim to know which process edited a file, capture reads, or display every intermediate edit. Terminal updates are batched every 15 seconds; desktop updates poll every 2 seconds.

## Documentation

- [Full usage and rich profiles](docs/usage.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Privacy and architecture](docs/privacy.md)
- [Contributing](CONTRIBUTING.md)
- [Security reports](SECURITY.md)
- [Artwork sources](assets/SOURCES.md)

## Development

No runtime dependencies.

```sh
git clone https://github.com/codewithriza/agent-presence.git
cd agent-presence
npm test
node src/cli.js codex --preview
npm pack
```

This is a beta. Codex log parsing uses an internal format; multi-publisher arbitration, automatic chat switching for other agents, and reliable Windows support are still open work. See the docs before using it with private projects.

MIT-licensed code. Third-party tool names and artwork belong to their respective owners; this project is independent and not endorsed by them.
