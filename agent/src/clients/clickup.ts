import { config } from '../config.js';
import type { ClickUpTask } from '../state.js';

const BASE = 'https://api.clickup.com/api/v2';

function headers() {
  return {
    Authorization: config.clickupToken,
    'Content-Type': 'application/json'
  };
}

/** GET a task by id. */
export async function getTask(taskId: string): Promise<ClickUpTask> {
  const res = await fetch(`${BASE}/task/${taskId}`, { headers: headers() });
  if (!res.ok) {
    throw new Error(`ClickUp getTask ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    name: string;
    description?: string;
    text_content?: string;
    status?: { status: string };
  };
  return {
    title: data.name,
    description: data.description ?? data.text_content ?? '',
    status: data.status?.status ?? 'unknown'
  };
}

/** List open tasks in a list filtered by status (e.g. the trigger status). */
export async function getTasksByStatus(
  listId: string,
  status: string
): Promise<{ id: string; title: string }[]> {
  const url =
    `${BASE}/list/${listId}/task?archived=false` +
    `&statuses%5B%5D=${encodeURIComponent(status)}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    throw new Error(`ClickUp getTasksByStatus ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { tasks: { id: string; name: string }[] };
  return data.tasks.map((t) => ({ id: t.id, title: t.name }));
}

/** Move a task to a named status. */
export async function setStatus(taskId: string, status: string): Promise<void> {
  const res = await fetch(`${BASE}/task/${taskId}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    throw new Error(`ClickUp setStatus ${res.status}: ${await res.text()}`);
  }
}

/** Add a comment to a task. */
export async function addComment(taskId: string, text: string): Promise<void> {
  const res = await fetch(`${BASE}/task/${taskId}/comment`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ comment_text: text })
  });
  if (!res.ok) {
    throw new Error(`ClickUp addComment ${res.status}: ${await res.text()}`);
  }
}
