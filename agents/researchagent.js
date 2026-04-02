import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export async function researchAgent(query, pastMemories = []) {
  const memoryContext = pastMemories.length > 0
    ? `Relevant past research sessions:\n${pastMemories.map(m =>
      `- Query: ${m.query} | Key findings: ${m.memorySnippet}`
    ).join('\n')}`
    : '';

  const prompt = `You are a focused Research Agent. Your job is to gather comprehensive, factual information about a query.
- Break down the query into key aspects
- Provide detailed findings for each aspect
- Note any uncertainties or gaps in knowledge
- Output structured research findings
${memoryContext ? `\nUse this past memory context to build on previous research:\n${memoryContext}` : ''}

Research this thoroughly: "${query}"`;

  const result = await model.generateContent(prompt);
  const findings = result.response.text();

  return {
    agent: 'ResearchAgent',
    query,
    findings,
    timestamp: Date.now()
  };
}