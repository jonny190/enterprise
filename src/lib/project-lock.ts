// Shared guard for the "ready to build" version lock.
//
// When a project version is marked ready to build it is snapshotted into a
// finalized Revision and the project is locked: all spec edits (requirements,
// meta, objectives, stories, process flows, chat-driven changes, new manual
// snapshots) are rejected until someone explicitly unlocks it, which starts a
// new working version.

export const PROJECT_LOCKED_MESSAGE =
  "This version is marked ready to build and is locked. Unlock it (which starts a new version) before making changes.";

export class ProjectLockedError extends Error {
  constructor(message: string = PROJECT_LOCKED_MESSAGE) {
    super(message);
    this.name = "ProjectLockedError";
  }
}

/** Throw {@link ProjectLockedError} if the project is currently locked. */
export function assertProjectEditable(project: {
  lockedAt: Date | null;
}): void {
  if (project.lockedAt) {
    throw new ProjectLockedError();
  }
}
