export async function summarizerAgent(context) {
  const { query, researchFindings, critique, iteration, pastMemories } = context;
  const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5-coder';
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  
  const memoriesPrompt = pastMemories?.length > 0 
    ? `\nPast Memories:\n${pastMemories.map(m => `- Key: ${m.key || m.storageKey || 'N/A'}\n  Snippet: ${m.memorySnippet}`).join('\n')}\n`
    : '';

  const prompt = `You are a Summarizer Agent. Take the research findings and distill them into a structured JSON response.

Query: "${query}"
${iteration > 0 && critique?.gaps?.length > 0 ? `Please make sure to explicitly address these gaps identified in the previous critique: ${critique.gaps.join(', ')}\n` : ''}
Research findings: ${researchFindings}
${memoriesPrompt}
Check if any of the Past Memories cover exactly the same central topic. If yes, return its Key as "mergeKey". Otherwise, return null for "mergeKey".

Return ONLY valid JSON, no extra markdown or backticks:
{"answer": "2-3 sentence clear answer here", "keyTakeaways": ["point 1", "point 2", "point 3"], "memorySnippet": "one line summary for future recall", "mergeKey": "key_or_null"}`;

  try {
    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [{ role: 'user', content: prompt }],
        format: 'json',
        stream: false
      })
    });
    
    if (!res.ok) throw new Error("Ollama generation failed");
    const data = await res.json();
    const text = data.message.content;
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      context.summary = JSON.parse(jsonMatch[0]);
      return context;
    } else {
      context.summary = JSON.parse(text);
      return context;
    }
  } catch (err) {
    console.error("Summarizer JSON parsing failed:", err);
    context.summary = {
      answer: "Failed to summarize exactly due to JSON corruption.",
      keyTakeaways: [],
      memorySnippet: query.slice(0, 100),
      mergeKey: null
    };
    return context;
  }
}