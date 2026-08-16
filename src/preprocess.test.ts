import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  applyHeadingFilter,
  preprocessMarkdown,
  stripDynamicBlocks,
  stripFrontmatter,
} from "./preprocess.ts";

describe("stripFrontmatter", () => {
  test("removes leading frontmatter", () => {
    const md = "---\ntitle: Foo\ntags: [a]\n---\nBody text";
    assert.equal(stripFrontmatter(md), "Body text");
  });

  test("keeps a thematic break that is not frontmatter", () => {
    const md = "Body text\n\n---\n\nMore text";
    assert.equal(stripFrontmatter(md), md);
  });

  test("returns input unchanged when there is no frontmatter", () => {
    assert.equal(stripFrontmatter("Just text"), "Just text");
  });
});

describe("stripDynamicBlocks", () => {
  test("strips a base code block", () => {
    const md = "Before\n\n```base\nviews:\n  - type: feed\n```\n\nAfter";
    assert.equal(stripDynamicBlocks(md), "Before\n\n\nAfter");
  });

  test("strips dataview and dataviewjs blocks, case-insensitively", () => {
    const md =
      "A\n```dataview\nLIST\n```\nB\n```DataviewJS\ndv.list()\n```\nC";
    assert.equal(stripDynamicBlocks(md), "A\nB\nC");
  });

  test("keeps ordinary code blocks", () => {
    const md = "```js\nconst x = 1;\n```";
    assert.equal(stripDynamicBlocks(md), md);
  });

  test("strips tilde-fenced base blocks", () => {
    const md = "~~~base\nviews: []\n~~~\ntext";
    assert.equal(stripDynamicBlocks(md), "text");
  });

  test("does not close a longer fence with a shorter one", () => {
    const md = "````base\ncontains ``` inside\n````\ntext";
    assert.equal(stripDynamicBlocks(md), "text");
  });

  test("keeps a base example nested inside an outer code fence", () => {
    const md = "````md\n```base\nviews: []\n```\n````";
    assert.equal(stripDynamicBlocks(md), md);
  });

  test("strips an unclosed base fence to the end", () => {
    const md = "keep\n```base\nviews: []\nno close";
    assert.equal(stripDynamicBlocks(md), "keep");
  });

  test("removes .base file embeds but keeps note embeds", () => {
    const md = "![[my file.base]] and ![[Some Note]] stay friends";
    assert.equal(stripDynamicBlocks(md), " and ![[Some Note]] stay friends");
  });

  test("removes .base embeds with view suffix or alias", () => {
    const md = "![[dash.base#view|alias]]\n![[other.base|label]]\nkeep";
    assert.equal(stripDynamicBlocks(md), "\n\nkeep");
  });

  test("keeps .base embeds mentioned inside a code fence", () => {
    const md = "```txt\n![[my file.base]]\n```";
    assert.equal(stripDynamicBlocks(md), md);
  });

  test("strips a dataview block inside a callout", () => {
    const md = "> [!note]\n> ```dataviewjs\n> dv.list()\n> ```\ntail";
    assert.equal(stripDynamicBlocks(md), "> [!note]\ntail");
  });

  test("strips a base block inside a plain blockquote", () => {
    const md = "> ```base\n> views: []\n> ```\nkeep";
    assert.equal(stripDynamicBlocks(md), "keep");
  });

  test("a quoted dynamic fence ends when the blockquote ends", () => {
    const md = "> ```dataview\n> LIST\nafter the quote";
    assert.equal(stripDynamicBlocks(md), "after the quote");
  });

  test("strips a dynamic fence indented four or more spaces", () => {
    const md = "- item\n    ```dataview\n    LIST\n    ```\nkeep";
    assert.equal(stripDynamicBlocks(md), "- item\nkeep");
  });
});

describe("applyHeadingFilter", () => {
  const md = [
    "Intro text",
    "# Log",
    "entry one",
    "## Details",
    "deep detail",
    "# Tasks",
    "task one",
  ].join("\n");

  test("include keeps only the section under the heading, without the heading line", () => {
    assert.equal(
      applyHeadingFilter(md, { heading: "Log", mode: "include" }),
      "entry one\n## Details\ndeep detail",
    );
  });

  test("include stops at a same-level heading but keeps deeper subheadings", () => {
    assert.equal(
      applyHeadingFilter(md, { heading: "Tasks", mode: "include" }),
      "task one",
    );
  });

  test("include matches case-insensitively", () => {
    assert.equal(
      applyHeadingFilter(md, { heading: "tasks", mode: "include" }),
      "task one",
    );
  });

  test("include with a missing heading yields empty content", () => {
    assert.equal(
      applyHeadingFilter(md, { heading: "Nope", mode: "include" }),
      "",
    );
  });

  test("exclude removes the heading and its section, keeping the rest", () => {
    assert.equal(
      applyHeadingFilter(md, { heading: "Log", mode: "exclude" }),
      "Intro text\n# Tasks\ntask one",
    );
  });

  test("exclude removes every matching section", () => {
    const repeated = "# Meta\na\n# Keep\nb\n# Meta\nc";
    assert.equal(
      applyHeadingFilter(repeated, { heading: "Meta", mode: "exclude" }),
      "# Keep\nb",
    );
  });

  test("ignores heading-like lines inside code fences", () => {
    const fenced = "# Keep\n```txt\n# Not a heading\n```\ntail";
    assert.equal(
      applyHeadingFilter(fenced, { heading: "Not a heading", mode: "exclude" }),
      fenced,
    );
  });

  test("a trailing # without a space stays part of the heading text", () => {
    const sharp = "# C#\nsharp notes\n# Other\nother";
    assert.equal(
      applyHeadingFilter(sharp, { heading: "C#", mode: "include" }),
      "sharp notes",
    );
  });

  test("a space-separated closing hash sequence is stripped", () => {
    const closed = "# Title ##\nbody\n# Other\nother";
    assert.equal(
      applyHeadingFilter(closed, { heading: "Title", mode: "include" }),
      "body",
    );
  });

  describe("setext headings", () => {
    const setext = [
      "Intro",
      "",
      "Title",
      "=====",
      "content",
      "Sub",
      "---",
      "deep",
      "Title2",
      "======",
      "tail",
    ].join("\n");

    test("include on a level-1 setext heading", () => {
      assert.equal(
        applyHeadingFilter(setext, { heading: "Title", mode: "include" }),
        "content\nSub\n---\ndeep",
      );
    });

    test("include on a level-2 setext heading", () => {
      assert.equal(
        applyHeadingFilter(setext, { heading: "Sub", mode: "include" }),
        "deep",
      );
    });

    test("exclude removes the setext heading, its underline, and section", () => {
      assert.equal(
        applyHeadingFilter(setext, { heading: "Title", mode: "exclude" }),
        "Intro\n\nTitle2\n======\ntail",
      );
    });

    test("a dash line after a blank line is not a setext heading", () => {
      const md = "para\n\n---\n\nmore";
      assert.equal(
        applyHeadingFilter(md, { heading: "para", mode: "exclude" }),
        md,
      );
    });
  });
});

describe("preprocessMarkdown", () => {
  test("applies frontmatter strip, heading filter, then dynamic block strip", () => {
    const md = [
      "---",
      "title: Daily",
      "---",
      "# Recent",
      "```base",
      "views: []",
      "```",
      "some text",
      "# Other",
      "other text",
    ].join("\n");
    assert.equal(
      preprocessMarkdown(md, { heading: "Recent", mode: "include" }),
      "some text",
    );
  });

  test("works without a heading filter", () => {
    const md = "---\nx: 1\n---\nhello\n```dataview\nLIST\n```";
    assert.equal(preprocessMarkdown(md), "hello");
  });
});
