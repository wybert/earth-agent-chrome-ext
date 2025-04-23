import { Message } from 'ai';

export async function POST(req: Request) {
  const { messages }: { messages: Message[] } = await req.json();

  // For now, just echo back the last message
  // TODO: Replace with actual AI integration
  const lastMessage = messages[messages.length - 1];
  const stream = new ReadableStream({
    async start(controller) {
      const text = `You said: ${lastMessage.content}`;
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });

  // Custom streaming response instead of using StreamingTextResponse
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked'
    }
  });
}