import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export async function summarizerAgent(researchFindings, query) {
  const prompt = `You are a Summarizer Agent. Take the research findings and distill them into a structured response.

Query: "${query}"
Research findings: ${researchFindings}

Return ONLY valid JSON, no extra text, no markdown, no backticks:
{"answer": "2-3 sentence clear answer here", "keyTakeaways": ["point 1", "point 2", "point 3"], "memorySnippet": "one line summary for future recall"}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { }

  return {
    answer: text,
    keyTakeaways: [],
    memorySnippet: query.slice(0, 100)
  };
}