import { ApplicationMenu } from "electrobun";

export function setupMenuContext() {
  ApplicationMenu.setApplicationMenu([
    {
      submenu: [
        {
          label: "Quit",
          role: "quit",
          accelerator: "Command+Q",
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "quit" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "pasteAndMatchStyle" },
        { role: "delete" },
        { role: "selectAll" },
      ],
    },
  ]);
}
