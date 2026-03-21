# Release Process

**Last Updated**: 2026-03-21

## Overview

Automated release pipeline for wtty using semantic-release. Conventional commit prefixes in PR titles drive version bumps post-merge to `main`. semantic-release determines the version, creates a GitHub Release with release notes, and uploads platform-specific binary artifacts. No manual versioning, no release commits, no extra files. Git tags are the sole version record.

## Principles

| # | Principle | Meaning |
|---|-----------|---------|
| 1 | Developers don't version | Merge to `main` with a conventional PR title — CI handles the rest. |
| 2 | Commit message is the changelog | PR title (squash merge commit message) is the changelog entry. No separate changeset files. |
| 3 | Git tags are the version record | `package.json` version stays at `0.0.0-development`. Tags are the source of truth. |
| 4 | Tag-only releases | No release commits pushed back to the repo. No `@semantic-release/git`. Clean one-commit-per-PR history. |
| 5 | Binary artifacts on every release | GitHub Release includes pre-built binaries for all supported platforms. |

## Flow

```
PR                                   Post-Merge (main)
+----------------------------+        +------------------------------------------+
| lint, build, test          |   →    | semantic-release                         |
| (PR check workflow)        | squash | analyze commits → determine version bump |
+----------------------------+        | create GitHub Release + release notes    |
                                      | build & upload platform binaries         |
                                      +------------------------------------------+
```

### Developer Workflow

1. Open a PR to `main` with a conventional commit prefix in the title
2. Get review and approval
3. Squash merge — PR title becomes the single commit message on `main`
4. CI runs semantic-release post-merge:
   - `fix:` → patch bump (`0.1.0` → `0.1.1`)
   - `feat:` → minor bump (`0.1.0` → `0.2.0`)
   - `feat!:` / `BREAKING CHANGE:` → major bump (`0.1.0` → `1.0.0`)
   - `chore:`, `docs:`, `ci:` → no release
5. GitHub Release created with tag `v0.2.0` and binary artifacts attached

### Conventional Commit Prefixes

| Prefix | Bump | Example |
|--------|------|---------|
| `fix:` | Patch (0.0.x) | `fix: handle PTY exit on Windows` |
| `feat:` | Minor (0.x.0) | `feat: add config file support` |
| `feat!:` / `BREAKING CHANGE:` | Major (x.0.0) | `feat!: redesign WebSocket protocol` |
| `chore:`, `docs:`, `ci:` | No release | `chore: update dev deps` |

PRs that don't match a release prefix produce no release — no error, no tag.

## Pipeline Structure

### PR Check Workflow (`.github/workflows/ci.yml`)

Runs on every push to an open PR. No versioning.

```yaml
on:
  pull_request:
    branches: [main]
jobs:
  lint, build, test
```

### Release Workflow (`.github/workflows/release.yml`)

Runs post-merge on `main`. Triggered by push to `main`.

```yaml
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0          # full clone — semantic-release needs commit history
          persist-credentials: false
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.10
      - run: bun install --frozen-lockfile
      - run: bun run build
      - name: Build platform binaries
        run: bun run build:binaries
      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: bunx semantic-release
```

Key details:
- `fetch-depth: 0` — semantic-release needs full git history to find previous tags
- `persist-credentials: false` + `GITHUB_TOKEN` — semantic-release pushes tags via its own auth
- Binary build step produces artifacts before the release step attaches them

## Configuration

### `.releaserc.json` (repo root)

```json
{
  "branches": ["main"],
  "tagFormat": "v${version}",
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/github",
      {
        "assets": [
          { "path": "dist/wtty-linux-x64", "label": "wtty-linux-x64" },
          { "path": "dist/wtty-linux-arm64", "label": "wtty-linux-arm64" },
          { "path": "dist/wtty-darwin-x64", "label": "wtty-darwin-x64" },
          { "path": "dist/wtty-darwin-arm64", "label": "wtty-darwin-arm64" },
          { "path": "dist/wtty-win32-x64.exe", "label": "wtty-win32-x64.exe" }
        ]
      }
    ]
  ]
}
```

Plugin chain:
1. **commit-analyzer** — determines bump type from conventional commits
2. **release-notes-generator** — generates changelog from commits (used for GitHub Release body)
3. **github** — creates the GitHub Release, uploads binary assets, pushes the git tag

`@semantic-release/git` and `@semantic-release/changelog` are intentionally omitted — tag-only approach keeps history clean and avoids CI push-to-branch permissions.

### `package.json` version

Keep at `0.0.0-development` to signal that the in-repo version is not the published version:

```json
{
  "version": "0.0.0-development"
}
```

## Version Progression

```
main branch:
  v0.1.0   (feat: bootstrap terminal server)
  v0.1.1   (fix: handle PTY exit on Windows)
  v0.2.0   (feat: add config file support)
  v1.0.0   (feat!: redesign WebSocket protocol)
```

## Tag Format

Git tags: `v<version>` (e.g. `v0.2.0`). Created by `@semantic-release/github` on the merge commit on `main`. Do not delete tags — semantic-release uses them to determine the next version.

## GitHub Settings (one-time)

### Repository Settings

| Setting | Value | Why |
|---------|-------|-----|
| Squash merging | Enabled | PR title becomes the commit message semantic-release reads |
| Allow merge commits | Disabled (recommended) | Enforce squash-only to keep one commit per PR on `main` |

### Workflow Permissions

Go to **Settings → Actions → General → Workflow permissions**:

| Setting | Value | Why |
|---------|-------|-----|
| Workflow permissions | Read and write | `GITHUB_TOKEN` needs to push tags and create releases |
| Allow GitHub Actions to create and approve pull requests | Not needed | Release workflow doesn't open PRs |

`GITHUB_TOKEN` is provided automatically by GitHub Actions — no manual secret setup needed.

## Features

| Feature | Status | Reference |
|---------|--------|-----------|
| Automated versioning via conventional commits | ⬜ | [ADR 003](../adrs/003.release-process.semantic-release.md) |
| GitHub Release with release notes | ⬜ | [ADR 003](../adrs/003.release-process.semantic-release.md) |
| Platform binary artifacts on release | ⬜ | [ADR 003](../adrs/003.release-process.semantic-release.md) |
