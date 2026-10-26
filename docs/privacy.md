# Privacy and architecture

Agent Presence runs locally. It connects to Discord desktop's IPC socket and sends Rich Presence using the public application ID. This ID is not a secret. It never asks for a Discord password, account token, or bot token.

## Public data

Product name, explicit task label, agent name, latest changed basename, elapsed time, optional lifecycle phase, image URLs and links. Don't put private information into task labels or profiles. Discord controls who sees the activity.

## Data read locally

Terminal mode watches filesystem events under the current project. It doesn't read source contents. Desktop auto mode reads up to the 32 most recently modified Codex JSONL logs under the configured sessions directory, using working-directory metadata and lifecycle tags. JSON records containing messages are parsed as part of reading the log but their bodies aren't used for presence or transmitted. It watches only the currently selected chat's project. Tool commands are not executed from log contents.

The latest prompt's turn-start timestamp determines selection. Completion or background output from an older chat cannot take over. Subagent logs are excluded when their metadata identifies them. Codex's log format is internal and may change.

## Storage and networking

Runtime PID, heartbeat, connection status and product label live in your state directory. There is no analytics endpoint or central session database. Public image URLs are passed to Discord for fetching. Logos may be hosted by vendors or a pinned community icon package; see artwork sources.

## Private work

Use `--private` in terminal mode to disable file watching and suppress project/file names, images and links. Explicit task/name remain visible. Automatic desktop mode is an opt-in to project and changed-basename sharing across chats; stop it before sensitive sessions. Filename filters are best effort, not a security boundary.
