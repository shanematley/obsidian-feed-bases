import { useContext, useMemo } from "react";
import { App } from "obsidian";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AppContext } from "./context";

export const useApp = (): App => {
  const app = useContext(AppContext);
  if (!app) {
    throw new Error("useApp must be used within an AppContext provider");
  }
  return app;
};

export const useFeedVirtualizer = (
  scrollElement: HTMLElement,
  count: number,
  overscan: number,
) => {
  const getScrollEl = useMemo(() => () => scrollElement, [scrollElement]);

  return useVirtualizer({
    count,
    getScrollElement: getScrollEl,
    estimateSize: () => 280,
    overscan,
    measureElement: (element, entry, instance) => {
      const el = element as HTMLElement;
      const direction = instance.scrollDirection;
      if (direction === "forward" || direction === null) {
        return el.getBoundingClientRect().height;
      }
      // Don't remeasure if we are scrolling up to prevent stuttering
      const indexKey = Number(el.getAttribute("data-index"));
      // @ts-ignore - accessing private property for performance fix (see https://github.com/TanStack/virtual/issues/659)
      const cacheMeasurement = instance.itemSizeCache.get(indexKey);
      // A cache miss must still return a real height: returning 0 would be
      // written into itemSizeCache and permanently collapse the row.
      return cacheMeasurement ?? el.getBoundingClientRect().height;
    },
  });
};
