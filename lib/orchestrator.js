import { researchAgent } from '../agents/researchagent.js';
import { summarizerAgent } from '../agents/summarizeragent.js';
import { criticAgent } from '../agents/criticagent.js';
import { saveMemory, loadMemory, listMemories } from '../storage/index.js';

function findRelevantMemories(query, allMemories, topK = 3) {
  const queryWords = new Set(query.toLowerCase().split(/\W+/).filter(w => w.length > 3));

  return allMemories
    .map(mem => {
      const memWords = (mem.query + ' ' + (mem.memorySnippet || '')).toLowerCase().split(/\W+/);
      const overlap = memWords.filter(w => queryWords.has(w)).length;
      return { ...mem, score: overlap };
    })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export async function runOrchestrator(query) {
  const allMemoryKeys = await listMemories();
  const allMemories = [];

  for (const { key } of allMemoryKeys.slice(0, 20)) {
    const mem = await loadMemory(key);
    if (mem) allMemories.push(mem);
  }

  const relevantMemories = findRelevantMemories(query, allMemories);

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  const research = await researchAgent(query, relevantMemories);
  await delay(2000); // Mitigation for Free-Tier Gemini RPM limits

  const summary = await summarizerAgent(research.findings, query);
  await delay(2000);

  const critique = await criticAgent(query, summary, research.findings);

  const memoryKey = `session_${Date.now()}`;
  const memoryPayload = {
    query,
    findings: research.findings,
    answer: summary.answer,
    keyTakeaways: summary.keyTakeaways,
    memorySnippet: summary.memorySnippet,
    confidence: critique.confidence,
    followUpQuestions: critique.followUpQuestions,
    timestamp: Date.now()
  };

  await saveMemory(memoryKey, memoryPayload);

  return {
    query,
    answer: summary.answer,
    keyTakeaways: summary.keyTakeaways,
    critique,
    relevantMemories,
    storageKey: memoryKey
  };
}