import { Plugin } from "obsidian";
import { FeedView, FeedViewType } from "./feed-view";

export default class ObsidianFeedPlugin extends Plugin {
  onload() {
    this.registerBasesView(FeedViewType, {
      name: "Feed",
      icon: "lucide-newspaper",
      factory: (controller, containerEl) =>
        new FeedView(controller, containerEl),
      options: (config) => [
        {
          key: "showProperties",
          type: "toggle",
          displayName: "Show note properties (experimental)",
          default: false,
          // Static cards strip frontmatter before rendering, so this toggle
          // has no effect there; hide it rather than leave it inert.
          shouldHide: () => !!config.get("staticCards"),
        },
        {
          key: "multipleColumns",
          type: "toggle",
          displayName: "Show notes in multiple columns (experimental)",
          default: false,
        },
        {
          key: "maxCardWidth",
          type: "slider",
          displayName: "Maximum card width (experimental)",
          default: 400,
          min: 200,
          max: 800,
          step: 10,
        },
        {
          type: "group",
          displayName: "Static cards",
          items: [
            {
              key: "staticCards",
              type: "toggle",
              displayName: "Read-only cards without dynamic blocks",
              default: false,
            },
            {
              key: "headingFilter",
              type: "text",
              displayName: "Filter by heading",
              placeholder: "Heading text",
              default: "",
              shouldHide: () => !config.get("staticCards"),
            },
            {
              key: "headingFilterMode",
              type: "dropdown",
              displayName: "Heading filter behavior",
              options: {
                include: "Show only this section",
                exclude: "Hide this section",
              },
              default: "include",
              shouldHide: () => !config.get("staticCards"),
            },
          ],
        },
      ],
    });
  }

  onunload() {}
}
