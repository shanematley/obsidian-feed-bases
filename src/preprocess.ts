// Pure markdown preprocessing for static (read-only) feed cards.
// Deliberately free of Obsidian imports so it can be unit-tested with node --test.

export type HeadingFilter = {
  heading: string;
  mode: "include" | "exclude";
};

// Languages whose code blocks execute queries when rendered, and can
// therefore recurse back into a feed.
const DYNAMIC_LANGS = new Set(["base", "dataview", "dataviewjs"]);

// Fences are matched at any indent and behind blockquote markers: an indented
// or quoted dynamic block still executes when rendered, so under-matching is
// the dangerous direction. The rare cost is over-stripping a dynamic fence
// that is literal content of an indented code block.
const FENCE_OPEN_RE = /^\s*(`{3,}|~{3,})\s*(\S*)/;
const FENCE_CLOSE_RE = /^\s*(`{3,}|~{3,})\s*$/;
const QUOTE_PREFIX_RE = /^(?: {0,3}> ?)+/;
const ATX_HEADING_RE = /^ {0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
const SETEXT_UNDERLINE_RE = /^ {0,3}(=+|-+)\s*$/;
const BASE_EMBED_RE = /!\[\[[^[\]]*?\.base(?:[#|][^[\]]*)?\]\]/gi;

type FenceState = { marker: string; length: number; dynamic: boolean };

function openFence(line: string): FenceState | null {
  const match = line.match(FENCE_OPEN_RE);
  if (!match) return null;
  const lang = match[2].toLowerCase();
  return {
    marker: match[1][0],
    length: match[1].length,
    dynamic: DYNAMIC_LANGS.has(lang),
  };
}

function closesFence(line: string, fence: FenceState): boolean {
  const match = line.match(FENCE_CLOSE_RE);
  return (
    match !== null &&
    match[1][0] === fence.marker &&
    match[1].length >= fence.length
  );
}

type LineClass =
  // Outside any fence; `unquoted` has blockquote markers removed.
  | { kind: "text"; unquoted: string; quoted: boolean }
  // A fence delimiter line, or a line inside a fence.
  | { kind: "fence"; dynamic: boolean };

function classifyLines(lines: string[]): LineClass[] {
  const classes: LineClass[] = [];
  let fence: (FenceState & { quoted: boolean }) | null = null;

  for (const line of lines) {
    const quoteMatch = line.match(QUOTE_PREFIX_RE);
    const unquoted = quoteMatch ? line.slice(quoteMatch[0].length) : line;

    if (fence) {
      // A fence opened inside a blockquote ends with the blockquote; the
      // current line then belongs to whatever follows the quote.
      if (fence.quoted && !quoteMatch) {
        fence = null;
      } else {
        const closed = closesFence(unquoted, fence);
        classes.push({ kind: "fence", dynamic: fence.dynamic });
        if (closed) fence = null;
        continue;
      }
    }

    const opened = openFence(unquoted);
    if (opened) {
      fence = { ...opened, quoted: quoteMatch !== null };
      classes.push({ kind: "fence", dynamic: opened.dynamic });
      continue;
    }

    classes.push({ kind: "text", unquoted, quoted: quoteMatch !== null });
  }

  return classes;
}

export function stripFrontmatter(md: string): string {
  if (!/^---\r?\n/.test(md)) return md;
  const close = md.indexOf("\n---", 3);
  if (close === -1) return md;
  const closeLineEnd = md.indexOf("\n", close + 1);
  if (!/^\n---\s*$/.test(md.slice(close, closeLineEnd === -1 ? undefined : closeLineEnd))) {
    return md;
  }
  return closeLineEnd === -1 ? "" : md.slice(closeLineEnd + 1);
}

// Removes base/dataview/dataviewjs fenced blocks (including quoted/indented
// ones) and ![[*.base]] embeds, leaving ordinary code fences untouched.
export function stripDynamicBlocks(md: string): string {
  const lines = md.split("\n");
  const classes = classifyLines(lines);
  const kept: string[] = [];

  lines.forEach((line, i) => {
    const cls = classes[i];
    if (cls.kind === "fence") {
      if (!cls.dynamic) kept.push(line);
      return;
    }
    kept.push(line.replace(BASE_EMBED_RE, ""));
  });

  return kept.join("\n");
}

type HeadingLine = {
  index: number;
  level: number;
  text: string;
  contentStart: number;
};

function findHeadings(lines: string[]): HeadingLine[] {
  const classes = classifyLines(lines);
  const headings: HeadingLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const cls = classes[i];
    // Match the metadata cache: only unquoted headings count.
    if (cls.kind !== "text" || cls.quoted) continue;

    const atx = lines[i].match(ATX_HEADING_RE);
    if (atx) {
      headings.push({
        index: i,
        level: atx[1].length,
        text: atx[2],
        contentStart: i + 1,
      });
      continue;
    }

    // Setext heading: a non-empty paragraph line directly above an =/- line.
    const next = classes[i + 1];
    if (
      lines[i].trim() !== "" &&
      next?.kind === "text" &&
      !next.quoted &&
      SETEXT_UNDERLINE_RE.test(lines[i + 1])
    ) {
      headings.push({
        index: i,
        level: lines[i + 1].trim().startsWith("=") ? 1 : 2,
        text: lines[i].trim(),
        contentStart: i + 2,
      });
      i++; // the underline is part of the heading, not a candidate line
    }
  }

  return headings;
}

// End of the section started by headings[i]: the next heading at the same
// or a shallower level, or the end of the document.
function sectionEnd(
  headings: HeadingLine[],
  i: number,
  lineCount: number,
): number {
  for (let j = i + 1; j < headings.length; j++) {
    if (headings[j].level <= headings[i].level) return headings[j].index;
  }
  return lineCount;
}

export function applyHeadingFilter(md: string, filter: HeadingFilter): string {
  const wanted = filter.heading.trim().toLowerCase();
  if (!wanted) return md;

  const lines = md.split("\n");
  const headings = findHeadings(lines);
  const matches = (h: HeadingLine) => h.text.toLowerCase() === wanted;

  if (filter.mode === "include") {
    const i = headings.findIndex(matches);
    if (i === -1) return "";
    const end = sectionEnd(headings, i, lines.length);
    return lines.slice(headings[i].contentStart, end).join("\n");
  }

  // exclude: drop every matching section, heading line(s) included
  const drop = new Array<boolean>(lines.length).fill(false);
  headings.forEach((h, i) => {
    if (!matches(h) || drop[h.index]) return;
    const end = sectionEnd(headings, i, lines.length);
    for (let line = h.index; line < end; line++) drop[line] = true;
  });
  return lines.filter((_, i) => !drop[i]).join("\n");
}

export function preprocessMarkdown(md: string, filter?: HeadingFilter): string {
  let result = stripFrontmatter(md);
  if (filter?.heading.trim()) {
    result = applyHeadingFilter(result, filter);
  }
  return stripDynamicBlocks(result);
}
