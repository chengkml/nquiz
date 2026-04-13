"use client";

import { useRef, useState } from "react";

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const handleAbort = () => {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", handleAbort);
      reject(new DOMException("Aborted", "AbortError"));
    };

    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      resolve();
    }, ms);

    signal.addEventListener("abort", handleAbort);
  });
}

function splitStreamContent(content: string) {
  const chunks = content
    .split(/(?<=[。！？\n])/)
    .map((item) => item.trimStart())
    .filter(Boolean);

  if (chunks.length > 0) {
    return chunks;
  }

  return content.match(/.{1,24}/g) ?? [content];
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function useChatStream() {
  const controllerRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  async function startStream(params: {
    content: string;
    onChunk: (chunk: string) => void;
    onComplete: () => Promise<void> | void;
    onAbort?: () => Promise<void> | void;
  }) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsStreaming(true);

    try {
      const chunks = splitStreamContent(params.content);
      for (const chunk of chunks) {
        await wait(48, controller.signal);
        params.onChunk(chunk);
      }
      await params.onComplete();
    } catch (error) {
      if (isAbortError(error)) {
        await params.onAbort?.();
        return;
      }
      throw error;
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
      setIsStreaming(false);
    }
  }

  function stopStream() {
    controllerRef.current?.abort();
  }

  return {
    isStreaming,
    startStream,
    stopStream,
  };
}
