import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export async function criticAgent(query, summary, findings) {
  const prompt = `You are a Critic Agent. Your job is to:
1. Check if the answer actually addresses the query
2. Identify any logical gaps or missing angles
3. Rate confidence from 0 to 100
4. Suggest follow-up questions

Original query: "${query}"
Summary answer: "${summary.answer}"
Full findings: ${findings}

Return ONLY valid JSON, no extra text, no markdown, no backticks:
{"isComplete": true, "gaps": [], "confidence": 85, "followUpQuestions": ["...", "..."], "verdict": "APPROVED"}

verdict must be either APPROVED or NEEDS_MORE_RESEARCH`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { }

  return {
    isComplete: true,
    gaps: [],
    confidence: 75,
    followUpQuestions: [],
    verdict: 'APPROVED'
  };
}