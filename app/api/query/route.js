import { runOrchestrator } from '../../../lib/orchestrator.js';

export async function POST(req) {
  try {
    const { query } = await req.json();

    if (!query || query.trim().length < 3) {
      return Response.json({ error: 'Query too short' }, { status: 400 });
    }

    const result = await runOrchestrator(query.trim());

    return Response.json({ success: true, result });

  } catch (error) {
    console.error('Orchestrator error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}