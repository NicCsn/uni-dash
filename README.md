# Uni Dash

A minimal, local-only university dashboard built with [Tauri 2](https://v2.tauri.app), [React](https://react.dev), and [TypeScript](https://www.typescriptlang.org).

All data stays on your machine — no accounts, no telemetry, no external API calls.

## Features

- **Dashboard** — Overview with today's events, Todos countdown, and quick links
- **Calendar** — Week (24h) and month view, drag-and-drop events, recurring events, red current-time line, auto-scroll to now
- **Todos** — Priority levels, course/topic field, due dates
- **Documents** — macOS Finder-like file browser, split-view preview panel (code, images, PDFs), color labels, search
- **Quick Links** — Bookmark-style links that open in your system browser
- **Settings** — Theme toggle (dark/light), backup export/import, clear all events
- **Command Palette** — Press Cmd+K to search across events, todos, links, and documents

## Development

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run tauri dev
```

## Build for Distribution

```bash
npm run tauri build
```

Outputs:
- **macOS**: `.app` + `.dmg` in `src-tauri/target/release/bundle/`
- **Linux**: `.AppImage` + `.deb` in `src-tauri/target/release/bundle/`

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 19 + TypeScript |
| Desktop Shell | Tauri 2 (Rust) |
| Styling | Tailwind CSS v4 |
| Storage | Local JSON files via `@tauri-apps/plugin-fs` |
| Build | Vite 8 |

## Join the waitlist

No waitlist. Just clone and run.
