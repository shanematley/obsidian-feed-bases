import { BasesEntry } from "obsidian";
import React from "react";
import { MasonryView } from "./MasonryView";
import {
  CardRenderOptions,
  FeedEntryHandlers,
  VirtualFeedList,
} from "./VirtualFeedList";

export const FeedReactView: React.FC<FeedReactViewProps> = ({
  entries,
  onEntryClick,
  onEntryContextMenu,
  scrollElement,
  showProperties,
  staticCards,
  headingFilter,
  multipleColumns = false,
  maxCardWidth = 400,
}) => {
  // Conditionally render masonry or single column view
  if (multipleColumns) {
    return (
      <MasonryView
        entries={entries}
        onEntryClick={onEntryClick}
        onEntryContextMenu={onEntryContextMenu}
        scrollElement={scrollElement}
        showProperties={showProperties}
        staticCards={staticCards}
        headingFilter={headingFilter}
        maxCardWidth={maxCardWidth}
      />
    );
  }

  // Single column centered view
  return (
    <div
      className="bases-feed bases-feed-single-column"
      style={{ maxWidth: `${maxCardWidth}px` }}
    >
      {entries.length === 0 ? (
        <div className="bases-feed-empty">No notes to display</div>
      ) : (
        <VirtualFeedList
          entries={entries}
          scrollElement={scrollElement}
          overscan={8}
          showProperties={showProperties}
          staticCards={staticCards}
          headingFilter={headingFilter}
          onEntryClick={onEntryClick}
          onEntryContextMenu={onEntryContextMenu}
        />
      )}
    </div>
  );
};

// Props

type FeedReactViewProps = FeedEntryHandlers &
  CardRenderOptions & {
    entries: BasesEntry[];
    scrollElement: HTMLElement;
    showProperties: boolean;
    multipleColumns?: boolean;
    maxCardWidth?: number;
  };
