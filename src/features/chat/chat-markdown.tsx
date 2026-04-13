import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(pattern).filter(Boolean);

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={key}
          className="rounded-md bg-black/5 px-1.5 py-0.5 font-mono text-[0.92em] dark:bg-white/10"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (linkMatch) {
      return (
        <a
          key={key}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-sky-700 underline underline-offset-4 dark:text-sky-300"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return <span key={key}>{part}</span>;
  });
}

function renderTextBlock(block: string, key: string) {
  const lines = block.split("\n").filter((line) => line.length > 0);
  if (lines.length === 0) {
    return null;
  }

  if (lines.every((line) => /^- /.test(line))) {
    return (
      <ul key={key} className="list-disc space-y-1 pl-5">
        {lines.map((line, index) => (
          <li key={`${key}-${index}`}>{renderInline(line.replace(/^- /, ""), `${key}-${index}`)}</li>
        ))}
      </ul>
    );
  }

  if (lines.every((line) => /^\d+\. /.test(line))) {
    return (
      <ol key={key} className="list-decimal space-y-1 pl-5">
        {lines.map((line, index) => (
          <li key={`${key}-${index}`}>
            {renderInline(line.replace(/^\d+\. /, ""), `${key}-${index}`)}
          </li>
        ))}
      </ol>
    );
  }

  if (lines.length === 1 && /^### /.test(lines[0])) {
    return (
      <h3 key={key} className="text-base font-semibold tracking-tight">
        {renderInline(lines[0].replace(/^### /, ""), key)}
      </h3>
    );
  }

  if (lines.length === 1 && /^## /.test(lines[0])) {
    return (
      <h2 key={key} className="text-lg font-semibold tracking-tight">
        {renderInline(lines[0].replace(/^## /, ""), key)}
      </h2>
    );
  }

  if (lines.length === 1 && /^# /.test(lines[0])) {
    return (
      <h1 key={key} className="text-xl font-semibold tracking-tight">
        {renderInline(lines[0].replace(/^# /, ""), key)}
      </h1>
    );
  }

  if (lines.every((line) => /^> /.test(line))) {
    return (
      <blockquote
        key={key}
        className="rounded-2xl border border-black/10 bg-black/5 px-4 py-3 text-sm text-black/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
      >
        {lines.map((line, index) => (
          <p key={`${key}-${index}`}>{renderInline(line.replace(/^> /, ""), `${key}-${index}`)}</p>
        ))}
      </blockquote>
    );
  }

  return (
    <p key={key} className="whitespace-pre-wrap">
      {lines.map((line, index) => (
        <span key={`${key}-${index}`}>
          {renderInline(line, `${key}-${index}`)}
          {index < lines.length - 1 ? <br /> : null}
        </span>
      ))}
    </p>
  );
}

export function ChatMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const blocks = content.split(/```([\s\S]*?)```/g);

  return (
    <div className={cn("space-y-3 text-sm leading-7", className)}>
      {blocks.map((block, index) => {
        const key = `block-${index}`;
        if (index % 2 === 1) {
          return (
            <pre
              key={key}
              className="overflow-x-auto rounded-2xl border border-black/10 bg-black px-4 py-3 text-xs text-white shadow-sm dark:border-white/10"
            >
              <code>{block.trim()}</code>
            </pre>
          );
        }

        return block
          .split(/\n{2,}/)
          .map((textBlock, nestedIndex) => renderTextBlock(textBlock.trim(), `${key}-${nestedIndex}`));
      })}
    </div>
  );
}
