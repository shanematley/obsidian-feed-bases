import {
  BasesEntry,
  BasesPropertyId,
  BasesView,
  Menu,
  QueryController,
} from "obsidian";
import { StrictMode } from "react";
import { createRoot, Root } from "react-dom/client";
import { FeedReactView } from "./FeedReactView";
import { AppContext } from "./context";
import { reportError } from "./utils";
import { FEED_CARD_CLASS } from "./VirtualFeedList";

export const FeedViewType = "feed";

export class FeedView extends BasesView {
  private static readonly collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });

  type = FeedViewType;
  scrollEl: HTMLElement;
  containerEl: HTMLElement;
  root: Root | null = null;

  private entries: BasesEntry[] = [];
  private pendingRenderFrame: number | null = null;

  constructor(controller: QueryController, scrollEl: HTMLElement) {
    super(controller);
    this.scrollEl = scrollEl;
    this.containerEl = scrollEl.createDiv({
      cls: "bases-feed-container is-loading",
      attr: { tabIndex: 0 },
    });
  }

  onload(): void {
    // React components will handle their own lifecycle
  }

  onunload() {
    if (this.pendingRenderFrame !== null) {
      cancelAnimationFrame(this.pendingRenderFrame);
      this.pendingRenderFrame = null;
    }
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    this.entries = [];
  }

  onResize(): void {
    // Feed view should adapt to resizing automatically
  }

  public focus(): void {
    this.containerEl.focus({ preventScroll: true });
  }

  public onDataUpdated(): void {
    this.containerEl.removeClass("is-loading");
    this.scheduleGuardedRender();
  }

  // A feed rendered inside another feed's card would recurse (its cards
  // render notes whose embedded bases spawn more feeds). Cap the depth at
  // one by rendering a flat placeholder instead. The ancestry check is only
  // meaningful once our DOM is attached — embedded views can receive data
  // while still detached — so rendering is deferred until connected.
  private scheduleGuardedRender(): void {
    if (this.pendingRenderFrame !== null) return;
    if (!this.containerEl.isConnected) {
      this.pendingRenderFrame = requestAnimationFrame(() => {
        this.pendingRenderFrame = null;
        this.scheduleGuardedRender();
      });
      return;
    }
    if (this.containerEl.closest(`.${FEED_CARD_CLASS}`)) {
      this.renderNestedPlaceholder();
      return;
    }
    this.updateFeed();
  }

  private renderNestedPlaceholder(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    this.containerEl.empty();
    this.containerEl.createDiv("bases-feed-nested-placeholder").setText(
      "Nested feed hidden to prevent recursion",
    );
  }

  private updateFeed(): void {
    if (!this.data) {
      this.root?.unmount();
      this.root = null;
      this.containerEl.empty();
      this.containerEl.createDiv("bases-feed-empty").textContent =
        "No entries to display";
      return;
    }

    this.entries = [...this.data.data].filter(
      (entry) => entry.file.extension === "md",
    );

    const sort = this.config.getSort();
    const firstSortProperty = sort?.[0]?.property;
    // Normalize direction to 'ASC' | 'DESC'; default to ASC for alphabetical title sort
    const firstSortDirection = sort?.[0]?.direction ?? "ASC";
    // Always sort. If no property selected, default to file title A–Z.
    this.entries = this.sortEntries(
      this.entries,
      firstSortProperty,
      firstSortDirection,
    );

    this.renderReactFeed();
  }

  // Sort entries by an optional property and direction. If no property is
  // provided, defaults to sorting by file title (basename) A–Z.
  private sortEntries(
    entries: BasesEntry[],
    property?: BasesPropertyId,
    direction: "ASC" | "DESC" = "ASC",
  ): BasesEntry[] {
    if (!property) {
      // Default: sort by file title (basename) A–Z, case-insensitive, numeric-aware
      return entries.sort((a, b) =>
        FeedView.collator.compare(a.file.basename, b.file.basename),
      );
    }

    // Extract each entry's sort key once up front; getValue/valueOf per
    // comparison is too slow for large bases.
    const keyed = entries.map((entry) => ({
      entry,
      key: this.getPropertyValue(entry, property),
    }));
    const sign = direction === "DESC" ? -1 : 1;

    keyed.sort((a, b) => {
      // Nulls last regardless of direction, so direction only applies to
      // the real-value comparison below.
      if (a.key === null && b.key === null) return 0;
      if (a.key === null) return 1;
      if (b.key === null) return -1;

      const compareValue =
        typeof a.key === "number" && typeof b.key === "number"
          ? a.key - b.key
          : FeedView.collator.compare(String(a.key), String(b.key));
      return sign * compareValue;
    });

    return keyed.map((k) => k.entry);
  }

  private getPropertyValue(
    entry: BasesEntry,
    propId: BasesPropertyId,
  ): string | number | null {
    try {
      const value = entry.getValue(propId);
      if (!value || !value.isTruthy()) return null;

      // Try to get a comparable primitive. A value that doesn't override
      // valueOf() returns itself (an object), so only accept primitives here
      // and fall through to toString() otherwise.
      const primitive = (
        value as unknown as { valueOf: () => unknown }
      ).valueOf();
      if (typeof primitive === "number") return primitive;
      if (primitive instanceof Date) return primitive.getTime();
      if (typeof primitive === "string") {
        return primitive.trim().length > 0 ? primitive : null;
      }

      const str = value.toString();
      return str && str.trim().length > 0 ? str : null;
    } catch {
      return null;
    }
  }

  private renderReactFeed(): void {
    if (!this.root) {
      this.root = createRoot(this.containerEl);
    }

    const showProperties =
      (this.config.get("showProperties") as boolean | undefined) ?? false;
    const multipleColumns =
      (this.config.get("multipleColumns") as boolean | undefined) ?? false;
    const maxCardWidth =
      (this.config.get("maxCardWidth") as number | undefined) ?? 400;
    const staticCards =
      (this.config.get("staticCards") as boolean | undefined) ?? false;
    const headingText = (
      (this.config.get("headingFilter") as string | undefined) ?? ""
    ).trim();
    const headingMode =
      this.config.get("headingFilterMode") === "exclude"
        ? ("exclude" as const)
        : ("include" as const);
    const headingFilter = headingText
      ? { heading: headingText, mode: headingMode }
      : null;

    this.root.render(
      <StrictMode>
        <AppContext.Provider value={this.app}>
          <FeedReactView
            entries={this.entries}
            scrollElement={this.scrollEl}
            showProperties={showProperties}
            staticCards={staticCards}
            headingFilter={headingFilter}
            multipleColumns={multipleColumns}
            maxCardWidth={maxCardWidth}
            onEntryClick={(entry: BasesEntry, isModEvent: boolean) => {
              this.app.workspace
                .openLinkText(entry.file.path, "", isModEvent)
                .catch((err) => reportError("Failed to open note", err));
            }}
            onEntryContextMenu={(evt: React.MouseEvent, entry: BasesEntry) => {
              evt.preventDefault();
              this.showEntryContextMenu(evt.nativeEvent, entry);
            }}
          />
        </AppContext.Provider>
      </StrictMode>,
    );
  }

  private showEntryContextMenu(evt: MouseEvent, entry: BasesEntry): void {
    const file = entry.file;
    const menu = Menu.forEvent(evt);

    this.app.workspace.handleLinkContextMenu(menu, file.path, "");
  }
}
