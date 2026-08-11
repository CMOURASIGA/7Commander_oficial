"use client";

type MarkdownContentProps = {
  content: string;
  className?: string;
};

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "blockquote"; text: string };

function renderInline(text: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);

  return tokens.map((token, index) => {
    if (!token) return null;

    const boldMatch = token.match(/^\*\*([^*]+)\*\*$/);
    if (boldMatch) {
      return <strong key={index}>{boldMatch[1]}</strong>;
    }

    const codeMatch = token.match(/^`([^`]+)`$/);
    if (codeMatch) {
      return (
        <code key={index} className="workspace-inline-code">
          {codeMatch[1]}
        </code>
      );
    }

    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="workspace-markdown-link"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return <span key={index}>{token}</span>;
  });
}

function parseMarkdown(content: string): Block[] {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const blocks: Block[] = [];
  let paragraphBuffer: string[] = [];
  let unorderedItems: string[] = [];
  let orderedItems: string[] = [];

  function flushParagraph() {
    if (!paragraphBuffer.length) return;
    blocks.push({ type: "paragraph", text: paragraphBuffer.join(" ").trim() });
    paragraphBuffer = [];
  }

  function flushUnorderedList() {
    if (!unorderedItems.length) return;
    blocks.push({ type: "unordered-list", items: unorderedItems });
    unorderedItems = [];
  }

  function flushOrderedList() {
    if (!orderedItems.length) return;
    blocks.push({ type: "ordered-list", items: orderedItems });
    orderedItems = [];
  }

  function flushAll() {
    flushParagraph();
    flushUnorderedList();
    flushOrderedList();
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushAll();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    const blockquoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (blockquoteMatch) {
      flushAll();
      blocks.push({
        type: "blockquote",
        text: blockquoteMatch[1].trim(),
      });
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      flushOrderedList();
      unorderedItems.push(unorderedMatch[1].trim());
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      flushUnorderedList();
      orderedItems.push(orderedMatch[1].trim());
      continue;
    }

    paragraphBuffer.push(trimmed);
  }

  flushAll();
  return blocks;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const blocks = parseMarkdown(content);

  return (
    <div className={["workspace-markdown", className].filter(Boolean).join(" ")}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const headingLevel = Math.min(block.level + 2, 6);
          const HeadingTag = (
            {
              3: "h3",
              4: "h4",
              5: "h5",
              6: "h6",
            } as const
          )[headingLevel] ?? "h6";
          return <HeadingTag key={index}>{renderInline(block.text)}</HeadingTag>;
        }

        if (block.type === "unordered-list") {
          return (
            <ul key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "ordered-list") {
          return (
            <ol key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }

        if (block.type === "blockquote") {
          return <blockquote key={index}>{renderInline(block.text)}</blockquote>;
        }

        return <p key={index}>{renderInline(block.text)}</p>;
      })}
    </div>
  );
}
