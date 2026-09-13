import type { Workspace } from "./types";

export const initialWorkspace: Workspace = {
  tags: [],
  tagRecords: [],
  projects: [],
  tasks: [],
  skills: [],
  focusSessions: [],
  activeFocus: null,
  focusBreaks: [],
  activeBreak: null,
  user: { name: "", email: "" },
};
