# Troubleshooting

## Nothing on Discord

Run `agent-presence doctor`. Open the **desktop** Discord app on the same machine. Enable activity sharing in Discord settings. The browser client, remote SSH and containers are not supported. For desktop tracking, run `agent-presence desktop status`: `published` confirms Discord accepted the payload, not that everyone can see it.

## Command not found

Install Node.js 22+ from https://nodejs.org/en/download, reopen the terminal and rerun the install command. If the global npm bin directory isn't on PATH, follow your Node installation's setup instructions. Don't use `sudo` as a default fix. Your agent must be separately installed too.

Without a global install, download `agent-presence.tgz` from the GitHub release and run:

```sh
npx --yes --package ./agent-presence.tgz agent-presence setup
```

## No Codex sessions

Open Codex and send a prompt first, then rerun `agent-presence desktop start --auto`. A custom location can be supplied with `--sessions-dir /path/to/sessions`. `CODEX_HOME` is respected.

## Wrong project name

Terminal mode defaults to the folder you launch from. Use `--project "My app"`. Automatic desktop mode uses the chat working folder; configure `--project-map` for friendly names ([usage](usage.md)). Switching tabs without prompting does not change the selected chat.

## Monitor already running / lock exists

Run `agent-presence desktop status`, then `agent-presence desktop stop`. Allow two seconds before restarting. A crash may leave a lock. Only remove the `lock` file from `~/.local/state/agent-presence` after verifying that the PID in `status.json` is no longer running. Custom `--state-dir` values must be reused for status/stop.

## Logo missing / buttons missing

External images depend on their original hosts and Discord caching. Try again later or set an uploaded asset in a profile. Buttons are visible to other users, not yourself. Custom application IDs need their own uploaded `codex` / `claude-code` assets.

## File updates look delayed

Terminal changes are batched every 15 seconds. Desktop mode polls every two seconds and discovers sessions every five seconds. Only the latest eligible changed filename is shown. Hidden files, build outputs, dependencies, and likely secret filenames are filtered.

## Stop or uninstall

```sh
agent-presence desktop stop
npm uninstall -g agent-presence
```

Terminal wrapper presence ends when its agent exits. No login item or startup service is installed. Runtime status/log files are kept in `~/.local/state/agent-presence`; remove them if no longer wanted after stopping the process.
