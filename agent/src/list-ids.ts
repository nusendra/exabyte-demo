import { config } from './config.js';

// Prints every ClickUp list the token can see, with its numeric API id.
// Run: npm run list-ids  then copy the numeric id into CLICKUP_LIST_ID.

const BASE = 'https://api.clickup.com/api/v2';
const h = { Authorization: config.clickupToken };

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: h });
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

async function main() {
  if (!config.clickupToken) {
    console.error('Missing CLICKUP_TOKEN in agent/.env');
    process.exit(1);
  }

  const { teams } = await get<{ teams: { id: string; name: string }[] }>('/team');
  for (const team of teams) {
    console.log(`\n🏢 Workspace: ${team.name} (${team.id})`);
    const { spaces } = await get<{ spaces: { id: string; name: string }[] }>(
      `/team/${team.id}/space`
    );
    for (const space of spaces) {
      console.log(`  📁 Space: ${space.name}`);

      // Folderless lists
      const flless = await get<{ lists: { id: string; name: string }[] }>(
        `/space/${space.id}/list?archived=false`
      );
      for (const l of flless.lists) {
        console.log(`    📋 ${l.name}  ->  CLICKUP_LIST_ID=${l.id}`);
      }

      // Lists inside folders
      const { folders } = await get<{
        folders: { name: string; lists: { id: string; name: string }[] }[];
      }>(`/space/${space.id}/folder?archived=false`);
      for (const folder of folders) {
        for (const l of folder.lists) {
          console.log(`    📋 ${folder.name} / ${l.name}  ->  CLICKUP_LIST_ID=${l.id}`);
        }
      }
    }
  }
  console.log('\nCopy the numeric id after CLICKUP_LIST_ID= into agent/.env');
}

main().catch((err) => {
  console.error('failed:', err);
  process.exit(1);
});
