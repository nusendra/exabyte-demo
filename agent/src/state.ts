import { Annotation } from '@langchain/langgraph';

export interface ClickUpTask {
  title: string;
  description: string;
  status: string;
}

export interface Plan {
  summary: string;
  /** Repo-relative paths the agent intends to change (under web/). */
  targetFiles: string[];
  /** Repo-relative path of the test file to add. */
  testFile: string;
}

export interface FileChange {
  /** Repo-relative path, e.g. "web/src/lib/posts.ts". */
  path: string;
  content: string;
}

/**
 * Graph state. Each channel is last-value-wins (default LangGraph reducer),
 * so a node returns a partial state patch and it overwrites the channel.
 */
export const AgentState = Annotation.Root({
  taskId: Annotation<string>(),
  task: Annotation<ClickUpTask | null>(),
  plan: Annotation<Plan | null>(),
  branch: Annotation<string>(),
  changedFiles: Annotation<string[]>(),
  testPassed: Annotation<boolean>(),
  attempts: Annotation<number>(),
  testOutput: Annotation<string>(),
  prUrl: Annotation<string>(),
  error: Annotation<string>()
});

export type AgentStateType = typeof AgentState.State;
