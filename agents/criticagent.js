export async function criticAgent(context) {
  const { query, summary, researchFindings } = context;
  const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5-coder';
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

  const prompt = `You are a Critic Agent. Your job is to:
1. Check if the answer actually addresses the query
2. Identify any logical gaps or missing angles
3. Rate confidence from 0 to 100
4. Suggest follow-up questions

Original query: "${query}"
Summary answer: "${summary.answer}"
Full findings: ${researchFindings}

Return ONLY valid JSON, no extra markdown or backticks:
{"isComplete": true, "gaps": [], "confidence": 85, "followUpQuestions": ["...", "..."], "verdict": "APPROVED"}

verdict must be either APPROVED or NEEDS_MORE_RESEARCH`;

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
      context.critique = JSON.parse(jsonMatch[0]);
      return context;
    } else {
      context.critique = JSON.parse(text);
      return context;
    }
  } catch (err) {
    console.error("Critic JSON parsing failed:", err);
    context.critique = {
      isComplete: true,
      gaps: [],
      confidence: 50,
      followUpQuestions: [],
      verdict: 'NEEDS_MORE_RESEARCH'
    };
    return context;
  }
}