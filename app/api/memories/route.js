import { listMemories, loadMemory } from '../../../storage/index.js';

export async function GET() {
  try {
    const keys = await listMemories();
    const memories = [];

    for (const { key, timestamp } of keys.slice(0, 10)) {
      const mem = await loadMemory(key);
      if (mem) {
        memories.push({
          key,
          query: mem.query,
          answer: mem.answer,
          memorySnippet: mem.memorySnippet,
          confidence: mem.confidence,
          timestamp: mem.timestamp
        });
      }
    }

    return Response.json({ memories });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}