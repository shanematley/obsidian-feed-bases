## Obsidian Feed Bases

<a href='https://ko-fi.com/W7W71T4JPP' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi5.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

![](screenshot.png)

Adds a feed layout to [Obsidian Bases](https://help.obsidian.md/bases) so you can display notes with their content in an editable feed view.

- Display all notes from your bases in a scrollable feed.
- Edits are automatically saved back to the source file.
- Sort by modified date, created date, or name (default).
- Click note titles to open them or use context menus for more options.
- Optional static cards: read-only rendering without dataview/base blocks, so feeds of notes that embed their own feeds don't recurse.
- Heading filters for static cards: show only one section of each note, or hide one.

## Installation

This plugin currently requires Obsidian v1.10.0 or later to work.

Obsidian v1.10.0 is currently in [Early Access](https://help.obsidian.md/early-access), so you will need a [Catalyst license](https://help.obsidian.md/catalyst) to use it.

### Install via BRAT

1. Install the [BRAT plugin](obsidian://show-plugin?id=obsidian42-brat) under Community Plugins.
2. Open BRAT settings and click "Add beta plugin".
3. Enter the URL of this repository: `https://github.com/edrickleong/obsidian-feed-bases`.
4. Under "Select a version", choose the Latest version.
5. Click "Add plugin".

### Install via Community Plugins

Feed Bases is not yet available under Community Plugins. It is currently being reviewed and should hopefully be available soon.

## Usage

1. Create or open a Bases view.
2. Click the view type selector and choose "Feed".
3. Configure sorting options in the view settings.
4. Edit notes directly in the feed by clicking on them.
5. Any changes you make are automatically saved.

### Static cards

By default every card is a live editor, which renders everything the note contains — including `base`, `dataview`, and `dataviewjs` blocks. If the notes in your feed contain their own "last N notes" feed blocks, that would recurse; the plugin caps nesting by showing a "Nested feed hidden to prevent recursion" placeholder in place of any feed rendered inside another feed's card.

For a calmer feed, enable **Static cards** in the view options:

- **Read-only cards without dynamic blocks** — cards render the note's markdown read-only, with frontmatter, `base`/`dataview`/`dataviewjs` blocks, and `![[*.base]]` embeds stripped. Internal links, hover previews, and tag clicks still work; editing happens by opening the note.
- **Filter by heading** — show only the section under a named heading (or everything except it, via **Heading filter behavior**). Matches ATX (`# Heading`) and setext (underlined) headings, case-insensitively.

Static cards are also considerably lighter than live editors, which helps large feeds scroll smoothly.

## Development

- `npm run dev` — build in watch mode; `npm run build` — type-check and bundle.
- `npm test` — unit tests for the markdown preprocessing (requires Node 22.18+, tests run directly via `node --test`).

## License

This project is licensed under the MIT License.
