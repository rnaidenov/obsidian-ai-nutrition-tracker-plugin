# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions prior to 3.0.0 were not tracked in this file — see the [GitHub releases](https://github.com/rnaidenov/obsidian-ai-nutrition-tracker-plugin/releases) for that history.

## [Unreleased]

### ⚠️ Breaking Changes

- **Hand-editing a meal note no longer syncs back to the saved meal.** Meal notes are now purely generated output — the meal's items, description, and name live in `meals.json`, and the note is a one-way render of that data. Renaming a meal note in Obsidian's file explorer still updates the meal's name, but editing the food cards or description by hand has no effect; the next save/render overwrites it. An explicit "sync meal from note" command is planned for a follow-up release for anyone who relied on hand-editing.
- **Daily food logs are now backed by a JSON store**, not the markdown note. The note is a rendered view (wrapped in `%% ntr:begin %%` / `%% ntr:end %%` markers) — the underlying data lives at `{logStoragePath}/.data/{date}.json`. Existing vaults are migrated automatically on first load of this version (see "Migration" below); nothing to do manually.

### Added

- JSON store for daily food logs (`FoodLogEntry`/`FoodLog`), replacing regex-parsed markdown as the source of truth.
- Stable, per-entry ids (`data-ntr-id`) assigned once at creation and never regenerated on render — the sole lookup key for edit/delete, for both food log entries and saved-meal items.
- Marker-wrapped generated regions (`%% ntr:begin %%` / `%% ntr:end %%`) in daily log notes, so any text a user writes above or below the generated cards survives future edits.
- One-time migration on first load of this version: scans existing daily log notes, moves their entries into the JSON store with fresh ids, backs up each note's original content to `{logStoragePath}/.data/backup-{date}.md`, and rewrites the note in the new format. Runs at most once per vault.
- Jest test suite (92 tests) covering the data layer, marker-region replacement, migration against fixture notes, and duplicate-entry disambiguation.
- CI workflow running build + tests on every PR and push to `main`.

### Fixed

- **Editing or deleting one of two identical food log entries (same food, quantity, and macros logged twice) now affects exactly the one you targeted.** Previously, lookup was based on the `(food, quantity, calories, protein, carbs, fat)` tuple with no way to distinguish duplicates, so delete/edit always acted on whichever matching card came first in the note — not necessarily the one that was clicked.

### Removed

- All regex-based HTML card parsing/splicing used for edit and delete (`findCardPosition`, `findCardBounds`, `deleteCardFromContent`, `extractCompleteCard`, `replaceCardInPosition`, and the `appendToExistingLog`/`replaceInExistingLog` string-splicing in the food log manager). Edits are now a full re-render of the marked region instead of surgery on generated HTML.
- The vault `modify` listener and its debounce timers (`mealSyncTimeouts`) that drove note → JSON meal sync.
- `isDeleteInProgress`, a global flag that blocked *all* deletes across the vault whenever any single delete was in flight. The per-button processing-state guard already covers the actual concern (double-clicking the same button).
- Manual DOM querying/removal in the modal-close path (`ensureModalClosed`), superseded by tracking a single modal instance.

## [2.0.1] - 2026-03-02

- Fix: use local timezone for today's food log lookup.
