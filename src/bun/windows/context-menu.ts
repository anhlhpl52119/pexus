import { ContextMenu } from "electrobun/bun";

export function setupContextMenu() {
  ContextMenu.showContextMenu([
    {
      label: "Open",
      action: "open",
      accelerator: "o",
      data: { source: "context-menu" },
    },
    {
      label: "More",
      submenu: [
        { label: "Rename", action: "rename" },
        { label: "Delete", action: "delete", enabled: false },
      ],
    },
    { type: "separator" },
    { role: "copy" },
    { role: "paste" },
  ]);

  ContextMenu.on("context-menu-clicked", (event: unknown) => {
    console.log("Context menu action", event);
  });
}
