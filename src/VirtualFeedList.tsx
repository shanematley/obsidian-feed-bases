import { BasesEntry, MarkdownView, WorkspaceLeaf } from "obsidian";
import React, { useCallback } from "react";
import { useApp, useFeedVirtualizer } from "./hooks";
import { reportError } from "./utils";

// Virtualized list of feed entries, shared by the single-column and masonry views.
export const VirtualFeedList: React.FC<VirtualFeedListProps> = ({
  entries,
  scrollElement,
  overscan,
  showProperties,
  onEntryClick,
  onEntryContextMenu,
}) => {
  const rowVirtualizer = useFeedVirtualizer(
    scrollElement,
    entries.length,
    overscan,
  );

  return (
    <div
      className="bases-feed-virtualizer"
      style={{ height: rowVirtualizer.getTotalSize() }}
    >
      {rowVirtualizer.getVirtualItems().map((vi) => (
        <div
          key={vi.key}
          data-index={vi.index}
          ref={rowVirtualizer.measureElement}
          className="bases-feed-virtual-item"
          style={{
            transform: `translateY(${vi.start}px)`,
          }}
        >
          <FeedEntry
            entry={entries[vi.index]}
            showProperties={showProperties}
            onEntryClick={onEntryClick}
            onEntryContextMenu={onEntryContextMenu}
          />
        </div>
      ))}
    </div>
  );
};

const FeedEntry: React.FC<FeedEntryProps> = ({
  entry,
  showProperties,
  onEntryClick,
  onEntryContextMenu,
}) => {
  const app = useApp();

  const handleTitleClick = (evt: React.MouseEvent) => {
    evt.preventDefault();
    const isModEvent = evt.ctrlKey || evt.metaKey;
    onEntryClick(entry, isModEvent);
  };

  const handleContextMenu = (evt: React.MouseEvent) => {
    onEntryContextMenu(evt, entry);
  };

  const handleHover = (evt: React.MouseEvent) => {
    app.workspace.trigger("hover-link", {
      event: evt.nativeEvent,
      source: "bases",
      hoverParent: app.renderContext,
      targetEl: evt.currentTarget,
      linktext: entry.file.path,
    });
  };

  const setEditorHost = useCallback(
    (node: HTMLDivElement) => {
      let alive = true;
      // @ts-ignore using internal API
      const leaf = new WorkspaceLeaf(app);
      void (async () => {
        try {
          await leaf.openFile(entry.file, {
            state: { mode: "source", source: false },
          });
          if (!alive) return;

          const view = leaf.view;
          if (!(view instanceof MarkdownView)) {
            node.replaceChildren();
            const err = node.createDiv("bases-feed-error");
            err.setText("Failed to load Markdown editor");
            return;
          }

          node.replaceChildren(view.containerEl);
        } catch (e) {
          if (alive) reportError("Failed to load note preview", e);
        }
      })();

      return () => {
        alive = false;
        node.replaceChildren();
        // Detach the leaf so its editor and event registrations are released;
        // otherwise every recycled row leaks a live MarkdownView.
        leaf.detach();
      };
    },
    [app, entry.file],
  );

  return (
    <div className="bases-feed-entry" onContextMenu={handleContextMenu}>
      <div className="bases-feed-entry-header">
        <a
          className="bases-feed-entry-title"
          onClick={handleTitleClick}
          onMouseEnter={handleHover}
          href="#"
        >
          {entry.file.basename}
        </a>
      </div>

      <div className="bases-feed-entry-content">
        <div
          ref={setEditorHost}
          className="bases-feed-entry-editor"
          style={
            {
              "--metadata-display-editing": showProperties ? "block" : "none",
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
};

// Props

export type FeedEntryHandlers = {
  onEntryClick: (entry: BasesEntry, isModEvent: boolean) => void;
  onEntryContextMenu: (evt: React.MouseEvent, entry: BasesEntry) => void;
};

type VirtualFeedListProps = FeedEntryHandlers & {
  entries: BasesEntry[];
  scrollElement: HTMLElement;
  overscan: number;
  showProperties: boolean;
};

type FeedEntryProps = FeedEntryHandlers & {
  entry: BasesEntry;
  showProperties: boolean;
};
