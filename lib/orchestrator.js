// Import completely mitigated from local dependencies!
import { researchAgent } from '../agents/researchagent.js';
import { summarizerAgent } from '../agents/summarizeragent.js';
import { criticAgent } from '../agents/criticagent.js';
import { saveMemory, loadMemory, listMemories } from '../storage/index.js';

function cosineSimilarity(A, B) {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < A.length; i++) {
    dotProduct += A[i] * B[i];
    normA += A[i] * A[i];
    normB += B[i] * B[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function keywordSearch(query, allMemories, topK = 3) {
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

async function findRelevantMemories(query, allMemories, topK = 3) {
  if (allMemories.length === 0) return [];
  try {
    const embedUrl = `${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/embeddings`;
    const embedModel = process.env.OLLAMA_EMBED_MODEL || 'llama3';

    const getEmbed = async (text) => {
      const resp = await fetch(embedUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: embedModel, prompt: text })
      });
      if (!resp.ok) throw new Error("Embed failed");
      const data = await resp.json();
      return data.embedding;
    };

    const queryVec = await getEmbed(query);

    const memoriesWithEmbeddings = await Promise.all(allMemories.map(async mem => {
      const textToEmbed = mem.memorySnippet || mem.query || "";
      const vec = await getEmbed(textToEmbed);
      const score = cosineSimilarity(queryVec, vec);
      return { ...mem, score };
    }));

    return memoriesWithEmbeddings
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  } catch (error) {
    console.warn("Local Embedding failed, falling back to keyword search", error);
    return keywordSearch(query, allMemories, topK);
  }
}

export async function runOrchestrator(query, onStageUpdate) {
  const allMemoryKeys = await listMemories();
  const allMemories = [];

  for (const { key } of allMemoryKeys.slice(0, 20)) {
    const mem = await loadMemory(key);
    if (mem) allMemories.push(mem);
  }

  const relevantMemories = await findRelevantMemories(query, allMemories);
  onStageUpdate?.('memories', 'Loaded past memories');

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  async function withRetry(stageName, fn, retryCount = 1) {
    try {
      return await fn();
    } catch (error) {
      if (retryCount > 0) {
        console.warn(`Execution trapped offline timeout. Assumed Daemon lag. Retrying...`);
        onStageUpdate?.(stageName, `Evaluating local daemon. Re-spinning execution request...`);
        await delay(2000);
        return await withRetry(stageName, fn, retryCount - 1);
      }
      throw error;
    }
  }

  const context = {
    query,
    pastMemories: relevantMemories,
    researchFindings: "",
    summary: null,
    critique: null,
    iteration: 0
  };

  const MAX_ITERATIONS = 2;

  while (context.iteration < MAX_ITERATIONS) {
    const isRefinement = context.iteration > 0;

    onStageUpdate?.('research', `Researching... ${isRefinement ? '(Refinement)' : ''}`);
    await withRetry('research', () => researchAgent(context));

    onStageUpdate?.('research', `Research completed ${isRefinement ? '(Refinement)' : ''}`);
    await delay(3000);

    onStageUpdate?.('summary', `Summarizing... ${isRefinement ? '(Refinement)' : ''}`);
    await withRetry('summary', () => summarizerAgent(context));
    onStageUpdate?.('summary', `Summary generated ${isRefinement ? '(Refinement)' : ''}`);
    await delay(3000);

    onStageUpdate?.('critique', `Critiquing... ${isRefinement ? '(Refinement)' : ''}`);
    await withRetry('critique', () => criticAgent(context));
    onStageUpdate?.('critique', `Critique completed ${isRefinement ? '(Refinement)' : ''}`);

    if (context.critique.verdict !== 'NEEDS_MORE_RESEARCH') {
      break;
    }

    if (context.iteration < MAX_ITERATIONS - 1) {
      await delay(3000);
    }

    context.iteration++;
  }

  const memoryKey = context.summary.mergeKey || `session_${Date.now()}`;
  const memoryPayload = {
    query,
    findings: context.researchFindings,
    answer: context.summary.answer,
    keyTakeaways: context.summary.keyTakeaways,
    memorySnippet: context.summary.memorySnippet,
    confidence: context.critique.confidence,
    followUpQuestions: context.critique.followUpQuestions,
    timestamp: Date.now()
  };

  await saveMemory(memoryKey, memoryPayload);
  onStageUpdate?.('saved', 'Memory saved');

  return {
    query,
    answer: context.summary.answer,
    keyTakeaways: context.summary.keyTakeaways,
    critique: context.critique,
    relevantMemories,
    storageKey: memoryKey
  };
}