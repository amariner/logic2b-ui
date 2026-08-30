import {
  REGISTRY_CHANNEL,
  REGISTRY_RELEASED_AT,
  REGISTRY_VERSION,
} from "./version.ts";

export type RegistryChangeKind =
  | "baseline"
  | "added"
  | "changed"
  | "fixed"
  | "deprecated"
  | "removed";

export interface RegistryReleaseChange {
  /** `*` establishes a tracked baseline; later releases should name items. */
  items: "*" | readonly string[];
  kind: RegistryChangeKind;
  summary: string;
}

export interface RegistryRelease {
  version: string;
  channel: string;
  releasedAt: string;
  changes: readonly RegistryReleaseChange[];
}

/**
 * Append-only release history. A published version manifest is immutable; a
 * changed item must be named in a new release before the registry can build.
 */
export const REGISTRY_RELEASES: readonly RegistryRelease[] = [
  {
    version: "1.0.0-rc.1",
    channel: "next",
    releasedAt: "2026-08-29",
    changes: [
      {
        items: "*",
        kind: "baseline",
        summary:
          "First release tracked by the immutable registry manifest and per-item changelog contract.",
      },
    ],
  },
  {
    version: "1.0.0-rc.2",
    channel: "next",
    releasedAt: "2026-08-29",
    changes: [
      {
        items: [
          "button",
          "card",
          "input",
          "label",
          "badge",
          "separator",
          "item",
          "avatar",
          "skeleton",
          "alert",
          "textarea",
          "accordion",
          "collapsible",
          "dialog",
          "alert-dialog",
          "dropdown-menu",
          "popover",
          "tooltip",
          "sheet",
          "tabs",
          "hover-card",
          "context-menu",
          "menubar",
          "navigation-menu",
          "drawer",
          "form",
          "checkbox",
          "radio-group",
          "switch",
          "select",
          "native-select",
          "slider",
          "progress",
          "toggle",
          "toggle-group",
          "button-group",
          "input-group",
          "field",
          "tags-input",
          "rating",
          "number-field",
          "autocomplete",
          "file-dropzone",
          "color-picker",
          "table",
          "breadcrumb",
          "pagination",
          "scroll-area",
          "aspect-ratio",
          "command",
          "sonner",
          "sidebar",
          "kbd",
          "spinner",
          "empty",
          "calendar",
          "carousel",
          "resizable",
          "input-otp",
          "tree-view",
          "stepper",
          "timeline",
          "code-block",
          "motion",
          "motion-fade",
          "motion-slide",
          "motion-scale",
          "motion-blur",
          "scroll-reveal",
          "parallax",
          "chart",
        ],
        kind: "changed",
        summary:
          "Add a machine-readable accessibility contract covering built-in semantics, keyboard behavior, consumer responsibilities and known limitations.",
      },
    ],
  },
  {
    version: "1.0.0-rc.3",
    channel: "next",
    releasedAt: "2026-08-29",
    changes: [
      {
        items: ["skeleton"],
        kind: "fixed",
        summary:
          "Mark the visual loading placeholder aria-hidden by default so its implementation matches the published decorative-content contract.",
      },
    ],
  },
  {
    version: "1.0.0-rc.4",
    channel: "next",
    releasedAt: "2026-08-29",
    changes: [
      {
        items: ["file-dropzone"],
        kind: "fixed",
        summary:
          "Move the labelled native file input outside the role=button surface to remove nested interactive controls while preserving click, keyboard and drop behavior.",
      },
    ],
  },
  {
    version: "1.0.0-rc.5",
    channel: "next",
    releasedAt: "2026-08-29",
    changes: [
      {
        items: ["command", "item", "resizable"],
        kind: "fixed",
        summary:
          "Keep decorative separators out of list semantics, make item groups semantically neutral by default, and prevent implicit panel scroll regions while retaining explicit consumer overflow control.",
      },
    ],
  },
  {
    version: "1.0.0-rc.6",
    channel: "next",
    releasedAt: "2026-08-29",
    changes: [
      {
        items: ["command"],
        kind: "fixed",
        summary:
          "Expose command separators as aria-hidden decoration so listbox child semantics remain valid without affecting cmdk behavior.",
      },
    ],
  },
  {
    version: "1.0.0-rc.7",
    channel: "next",
    releasedAt: "2026-08-29",
    changes: [
      {
        items: ["scroll-area"],
        kind: "fixed",
        summary:
          "Make the scroll viewport keyboard-focusable by default so overflow content remains operable across browsers and assistive technologies.",
      },
    ],
  },
  {
    version: "1.0.0-rc.8",
    channel: "next",
    releasedAt: "2026-08-29",
    changes: [
      {
        items: [
          "button",
          "card",
          "input",
          "label",
          "badge",
          "separator",
          "item",
          "avatar",
          "skeleton",
          "alert",
          "textarea",
          "accordion",
          "collapsible",
          "dialog",
          "alert-dialog",
          "dropdown-menu",
          "popover",
          "tooltip",
          "sheet",
          "tabs",
          "hover-card",
          "context-menu",
          "menubar",
          "navigation-menu",
          "drawer",
          "form",
          "checkbox",
          "radio-group",
          "switch",
          "select",
          "native-select",
          "slider",
          "progress",
          "toggle",
          "toggle-group",
          "button-group",
          "input-group",
          "field",
          "tags-input",
          "rating",
          "number-field",
          "autocomplete",
          "file-dropzone",
          "color-picker",
          "table",
          "breadcrumb",
          "pagination",
          "scroll-area",
          "aspect-ratio",
          "command",
          "sonner",
          "sidebar",
          "kbd",
          "spinner",
          "empty",
          "calendar",
          "carousel",
          "resizable",
          "input-otp",
          "tree-view",
          "stepper",
          "timeline",
          "code-block",
          "motion",
          "motion-fade",
          "motion-slide",
          "motion-scale",
          "motion-blur",
          "scroll-reveal",
          "parallax",
          "chart",
        ],
        kind: "changed",
        summary:
          "Add a source-generated API contract covering every public component, hook, type, utility, owned prop, default and inherited props expression.",
      },
      {
        items: ["pagination"],
        kind: "fixed",
        summary:
          "Derive PaginationLink size from the button variant contract instead of treating the CVA function as a React component type.",
      },
    ],
  },
  {
    version: "1.0.0-rc.9",
    channel: "next",
    releasedAt: "2026-08-30",
    changes: [
      {
        items: ["landing-page-01"],
        kind: "added",
        summary:
          "Add a complete marketing landing page bundle that composes the canonical navbar, animated hero, animated feature grid, call to action and footer through transitive registry dependencies.",
      },
    ],
  },
  {
    version: "1.0.0-rc.10",
    channel: "next",
    releasedAt: "2026-08-30",
    changes: [
      {
        items: ["mail-client-01"],
        kind: "added",
        summary:
          "Add a responsive three-pane mail client with folder navigation, search, message selection, unread and label states, a reading view and interactive starring.",
      },
    ],
  },
  {
    version: "1.0.0-rc.11",
    channel: "next",
    releasedAt: "2026-08-30",
    changes: [
      {
        items: ["calendar-app-01"],
        kind: "added",
        summary:
          "Add a responsive team calendar with month navigation, calendar filters, event selection, a scroll-safe month grid and an event detail rail.",
      },
    ],
  },
  {
    version: "1.0.0-rc.12",
    channel: "next",
    releasedAt: "2026-08-30",
    changes: [
      {
        items: ["ai-chat-01"],
        kind: "added",
        summary:
          "Add a responsive AI conversation workspace with accessible message history, deterministic streaming, stop and continue states, prompt composer and context rail.",
      },
    ],
  },
  {
    version: "1.0.0-rc.13",
    channel: "next",
    releasedAt: "2026-08-30",
    changes: [
      {
        items: ["ai-chat-01"],
        kind: "fixed",
        summary:
          "Capture each streaming chunk before scheduling React state updates so generation preserves the first token and never appends an undefined tail.",
      },
    ],
  },
  {
    version: "1.0.0-rc.14",
    channel: "next",
    releasedAt: "2026-08-30",
    changes: [
      {
        items: ["chart-realtime-01"],
        kind: "added",
        summary:
          "Add a deterministic rolling-window chart with start, pause and reset controls, live throughput and error metrics, accessible status announcements and animation-free updates.",
      },
    ],
  },
  {
    version: "1.0.0-rc.15",
    channel: "next",
    releasedAt: "2026-08-30",
    changes: [
      {
        items: ["chart-realtime-01"],
        kind: "fixed",
        summary:
          "Align stream controls with the chart heading on desktop while preserving the stacked mobile header.",
      },
    ],
  },
  {
    version: REGISTRY_VERSION,
    channel: REGISTRY_CHANNEL,
    releasedAt: REGISTRY_RELEASED_AT,
    changes: [
      {
        items: ["chart-realtime-01"],
        kind: "fixed",
        summary:
          "Use an explicit wrapping flex header so controls align beside the title when space permits and wrap naturally on narrow screens regardless of base card display rules.",
      },
    ],
  },
];

export interface ItemChangelogEntry {
  version: string;
  releasedAt: string;
  kind: RegistryChangeKind;
  summary: string;
}

export function itemChangelog(name: string): ItemChangelogEntry[] {
  return REGISTRY_RELEASES.flatMap((release) =>
    release.changes
      .filter(
        (change) =>
          change.items === "*" || change.items.includes(name),
      )
      .map((change) => ({
        version: release.version,
        releasedAt: release.releasedAt,
        kind: change.kind,
        summary: change.summary,
      })),
  ).reverse();
}

export function itemVersion(name: string): string {
  const latest = itemChangelog(name)[0];
  if (!latest) {
    throw new Error(
      `Registry item "${name}" has no release history. Add it to REGISTRY_RELEASES.`,
    );
  }
  return latest.version;
}
