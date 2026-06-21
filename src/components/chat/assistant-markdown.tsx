"use client";

import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const mdComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => {
    // Internal links are scripture references injected by linkifyScriptureReferences —
    // render them as highlighted, in-app reference chips. External links open out.
    if (href && href.startsWith("/")) {
      return (
        <Link
          href={href}
          className="rounded bg-primary/10 px-1 py-px font-medium whitespace-nowrap text-primary no-underline transition-colors hover:bg-primary/20"
        >
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        {children}
      </a>
    );
  },
  code: ({ children }) => (
    <code className="rounded bg-background/70 px-1 py-0.5 font-mono text-[0.85em]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-md bg-background/70 p-2 text-xs last:mb-0">
      {children}
    </pre>
  ),
  h1: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
  h2: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
  h3: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border pl-3 italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border" />,
  del: ({ children }) => <del className="line-through opacity-70">{children}</del>,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-2 py-1">{children}</td>
  ),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- drop the hast node so it isn't spread onto the DOM input
  input: ({ node, ...props }) => (
    <input {...props} disabled className="mr-1.5 align-middle accent-primary" />
  ),
};

/** Renders an assistant message's markdown with the app's compact chat styling.
 *  Shared by the in-reader assistant panel and the standalone Ask page. */
export function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="leading-relaxed [&>:first-child]:mt-0 [&>:last-child]:mb-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
