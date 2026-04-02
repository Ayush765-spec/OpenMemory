import { loadMemory } from '../storage/index.js';
import { search, SafeSearchType } from 'duck-duck-scrape';

export async function researchAgent(context) {
  const { query, pastMemories, critique, iteration } = context;
  const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5-coder';
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

  const memoryContext = pastMemories && pastMemories.length > 0
    ? `Relevant past sessions:\n${pastMemories.map(m =>
      `- Query: ${m.query} | Key findings: ${m.memorySnippet} | Memory Retrieval Key: ${m.key || 'N/A'}`
    ).join('\n')}`
    : '';

  const activeQuery = (iteration > 0 && critique?.gaps?.length > 0)
    ? `Investigate these gaps independently: ${critique.gaps.join(', ')}`
    : query;

  const prompt = `You are a focused Research Agent. Gather comprehensive, factual information.
- Break down the query into key aspects
- Provide detailed findings for each aspect
- Call tools if you need current information or precise memory recall!
${memoryContext ? `\nUse this past memory context:\n${memoryContext}` : ''}

Research this thoroughly: "${activeQuery}"`;

  const tools = [
    {
      type: "function",
      function: {
        name: "recall_memory",
        description: "Retrieve complete past findings from local storage via a query string.",
        parameters: {
          type: "object",
          properties: {
            lookup_query: { type: "string", description: "The specific memory key or query string to lookup." }
          },
          required: ["lookup_query"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "web_search",
        description: "Search DuckDuckGo to safely fetch live factual results from the open internet.",
        parameters: {
          type: "object",
          properties: {
            lookup_query: { type: "string", description: "The specific text to search for." }
          },
          required: ["lookup_query"]
        }
      }
    }
  ];

  let messages = [
    { role: 'user', content: prompt }
  ];

  let finalFindings = "";
  let loops = 0;
  let hasFinalized = false;

  while (loops < 5 && !hasFinalized) {
    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        messages,
        tools,
        stream: false
      })
    });
    
    if (!res.ok) throw new Error("Ollama connection failed / unreachable offline.");
    
    const data = await res.json();
    const msg = data.message;
    messages.push(msg);

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      for (const call of msg.tool_calls) {
        const name = call.function.name;
        const args = typeof call.function.arguments === 'string' ? JSON.parse(call.function.arguments) : call.function.arguments;
        
        let toolOut = "";
        try {
          if (name === 'recall_memory') {
            const memoryContent = await loadMemory(args.lookup_query || query);
            toolOut = memoryContent ? JSON.stringify(memoryContent) : "No exact memory found. Continue researching.";
          } else if (name === 'web_search') {
            const searchRes = await search(args.lookup_query || query, { safeSearch: SafeSearchType.OFF });
            toolOut = JSON.stringify(searchRes.results.slice(0, 4).map(r => ({ title: r.title, description: r.description, url: r.url })));
          }
        } catch (e) {
          console.error("Tool execution failed: ", e);
          toolOut = `Tool Execution Error: ${e.message}. Proceed manually based on your own knowledge.`;
        }
        
        messages.push({ role: 'tool', content: toolOut });
      }
    } else {
      finalFindings = msg.content;
      hasFinalized = true;
    }
    loops++;
  }

  context.researchFindings = context.researchFindings
    ? context.researchFindings + "\n\n--- Refinement Findings ---\n\n" + finalFindings
    : finalFindings;

  return context;
}