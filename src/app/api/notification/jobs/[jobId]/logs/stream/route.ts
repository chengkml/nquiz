import { replayOrRunNotificationJob } from "@/lib/notifications/send/mock-store";

export const dynamic = "force-dynamic";

function encodeSseEvent(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let connectionClosed = false;

      const emit = (event: string, payload: unknown) => {
        if (connectionClosed) return;
        controller.enqueue(encoder.encode(encodeSseEvent(event, payload)));
      };

      const onAbort = () => {
        connectionClosed = true;
      };

      request.signal.addEventListener("abort", onAbort);

      try {
        const result = await replayOrRunNotificationJob(jobId, {
          onStatus: async (status) => {
            emit("status", status);
          },
          onLog: async (line) => {
            emit("log", line);
          },
        });

        if (!result.ok) {
          emit("fatal", { message: result.message });
        }

        emit("done", { jobId });
      } catch (error) {
        emit("fatal", {
          message: error instanceof Error ? error.message : "日志流执行失败",
        });
      } finally {
        request.signal.removeEventListener("abort", onAbort);
        if (!connectionClosed) {
          controller.close();
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
