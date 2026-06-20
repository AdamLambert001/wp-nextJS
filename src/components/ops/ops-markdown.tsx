import type { ReactNode } from "react";
import { sanitizeUrl } from "@/components/ops/ops-utils";

function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMarkdownLinksToNodes(text: string): ReactNode[] {
  const raw = String(text || "");
  const pattern = /\[([^\]]*)\]\(([^)\r\n]+)\)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      const chunk = raw.slice(lastIndex, match.index);
      nodes.push(
        <span key={`text-${key++}`} dangerouslySetInnerHTML={{ __html: escapeHtml(chunk).replace(/\r?\n/g, "<br/>") }} />,
      );
    }

    const label = match[1];
    const href = sanitizeUrl(match[2]);
    if (href) {
      nodes.push(
        <a key={`link-${key++}`} href={href} rel="noopener noreferrer" target="_blank">
          {label}
        </a>,
      );
    } else {
      nodes.push(<span key={`bad-${key++}`}>{match[0]}</span>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < raw.length) {
    const chunk = raw.slice(lastIndex);
    nodes.push(
      <span key={`tail-${key++}`} dangerouslySetInnerHTML={{ __html: escapeHtml(chunk).replace(/\r?\n/g, "<br/>") }} />,
    );
  }

  return nodes;
}

type OpsMarkdownProps = {
  text: string;
  className?: string;
};

export function OpsMarkdown({ text, className }: OpsMarkdownProps) {
  return <div className={className}>{renderMarkdownLinksToNodes(text)}</div>;
}
