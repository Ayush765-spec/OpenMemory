import { runOrchestrator } from '../../../lib/orchestrator.js';

export async function POST(req) {
  try {
    const { query } = await req.json();

    if (!query || query.trim().length < 3) {
      return Response.json({ error: 'Query too short' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const enqueueJson = (obj) => {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
        };

        try {
          const result = await runOrchestrator(query.trim(), (stage, message) => {
            enqueueJson({ type: "stage", stage, message });
          });

          enqueueJson({ type: "result", data: result });
        } catch (error) {
          console.error('Orchestrator streaming error:', error);
          enqueueJson({ type: "error", error: error.message });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Request parsing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}