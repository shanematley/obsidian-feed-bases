import { BasesEntry } from "obsidian";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CardRenderOptions,
  FeedEntryHandlers,
  VirtualFeedList,
} from "./VirtualFeedList";

export const MasonryView: React.FC<MasonryViewProps> = ({
  entries,
  onEntryClick,
  onEntryContextMenu,
  scrollElement,
  showProperties,
  staticCards,
  headingFilter,
  maxCardWidth,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(1);

  // Track container width for responsive column calculation
  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;

        // Calculate column count based on container width and max card width
        // Account for gaps between columns (16px per gap)
        const gapSize = 16;
        const availableWidth = width - gapSize * 2; // padding on sides
        const cols = Math.max(
          1,
          Math.floor((availableWidth + gapSize) / (maxCardWidth + gapSize)),
        );
        setColumnCount(cols);
      }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [maxCardWidth]);

  // Distribute entries across columns
  const columns = useMemo(() => {
    const cols: BasesEntry[][] = Array.from({ length: columnCount }, () => []);

    // Distribute entries evenly across columns (round-robin)
    entries.forEach((entry, index) => {
      cols[index % columnCount].push(entry);
    });

    return cols;
  }, [entries, columnCount]);

  return (
    <div ref={containerRef} className="bases-feed bases-feed-masonry">
      {entries.length === 0 ? (
        <div className="bases-feed-empty">No notes to display</div>
      ) : (
        <div
          className="bases-feed-masonry-grid"
          style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
        >
          {columns.map((columnEntries, columnIndex) => (
            <div key={columnIndex} className="bases-feed-masonry-column">
              <VirtualFeedList
                entries={columnEntries}
                scrollElement={scrollElement}
                overscan={5}
                showProperties={showProperties}
                staticCards={staticCards}
                headingFilter={headingFilter}
                onEntryClick={onEntryClick}
                onEntryContextMenu={onEntryContextMenu}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Props

type MasonryViewProps = FeedEntryHandlers &
  CardRenderOptions & {
    entries: BasesEntry[];
    scrollElement: HTMLElement;
    showProperties: boolean;
    maxCardWidth: number;
  };
