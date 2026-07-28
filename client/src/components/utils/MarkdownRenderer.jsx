import React from "react";

// ── Inline markdown parser ─────────────────────────────────────────
// Converts a text string into an array of React nodes, handling:
// **bold**, *italic*, `code`, and plain text
function parseInline(text) {
  if (!text) return null;

  const segments = [];
  let remaining = text;
  let keyCounter = 0;

  const patterns = [
    // Code first (highest priority — stops other patterns inside it)
    { re: /`([^`]+)`/,             render: (m) => <code key={keyCounter++} className="md-inline-code">{m[1]}</code> },
    // Bold + italic combined
    { re: /\*\*\*([^*]+)\*\*\*/,  render: (m) => <strong key={keyCounter++}><em>{m[1]}</em></strong> },
    // Bold
    { re: /\*\*([^*]+)\*\*/,      render: (m) => <strong key={keyCounter++}>{m[1]}</strong> },
    { re: /__([^_]+)__/,           render: (m) => <strong key={keyCounter++}>{m[1]}</strong> },
    // Italic
    { re: /\*([^*\s][^*]*)\*/,    render: (m) => <em key={keyCounter++}>{m[1]}</em> },
    { re: /_([^_\s][^_]*)_/,      render: (m) => <em key={keyCounter++}>{m[1]}</em> },
  ];

  while (remaining.length > 0) {
    let earliest = null;
    let earliestIdx = Infinity;
    let earliestMatch = null;

    for (const p of patterns) {
      const m = remaining.match(p.re);
      if (m && m.index < earliestIdx) {
        earliest = p;
        earliestIdx = m.index;
        earliestMatch = m;
      }
    }

    if (!earliest) {
      segments.push(remaining);
      break;
    }

    if (earliestIdx > 0) {
      segments.push(remaining.slice(0, earliestIdx));
    }
    segments.push(earliest.render(earliestMatch));
    remaining = remaining.slice(earliestIdx + earliestMatch[0].length);
  }

  return segments.length === 0 ? null : segments;
}

// ── Block-level markdown parser ────────────────────────────────────
function parseBlocks(text) {
  if (!text) return [];

  const lines = text.split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Fenced code block ````
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: "code", content: codeLines.join("\n"), language: lang });
      i++; // skip closing ```
      continue;
    }

    // ── Heading
    const hMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (hMatch) {
      blocks.push({ type: "h", level: hMatch[1].length, content: hMatch[2] });
      i++;
      continue;
    }

    // ── Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // ── Unordered list
    if (/^[-*+] /.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*+] /.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+] /, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // ── Ordered list
    if (/^\d+\. /.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\. /, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // ── Blank line (separator)
    if (!trimmed) {
      if (blocks.length > 0 && blocks[blocks.length - 1].type !== "blank") {
        blocks.push({ type: "blank" });
      }
      i++;
      continue;
    }

    // ── Paragraph: collect consecutive non-special lines
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().match(/^#{1,3} /) &&
      !lines[i].trim().startsWith("```") &&
      !/^[-*+] /.test(lines[i].trim()) &&
      !/^\d+\. /.test(lines[i].trim()) &&
      !/^[-*_]{3,}$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) {
      blocks.push({ type: "p", content: paraLines.join("\n") });
    }
  }

  return blocks;
}

// ── Render a single block ──────────────────────────────────────────
function renderBlock(block, idx) {
  switch (block.type) {
    case "h": {
      const Tag = `h${block.level}`;
      return (
        <Tag key={idx} className={`md-h${block.level}`}>
          {parseInline(block.content)}
        </Tag>
      );
    }

    case "hr":
      return <hr key={idx} className="md-hr" />;

    case "code":
      return (
        <div key={idx} className="md-code-block">
          {block.language && (
            <div className="md-code-lang">{block.language}</div>
          )}
          <pre><code>{block.content}</code></pre>
        </div>
      );

    case "ul":
      return (
        <ul key={idx} className="md-ul">
          {block.items.map((item, j) => (
            <li key={j}>{parseInline(item)}</li>
          ))}
        </ul>
      );

    case "ol":
      return (
        <ol key={idx} className="md-ol">
          {block.items.map((item, j) => (
            <li key={j}>{parseInline(item)}</li>
          ))}
        </ol>
      );

    case "p":
      // Preserve line breaks within a paragraph
      return (
        <p key={idx} className="md-p">
          {block.content.split("\n").map((ln, j, arr) => (
            <React.Fragment key={j}>
              {parseInline(ln)}
              {j < arr.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );

    case "blank":
      return null;

    default:
      return null;
  }
}

// ── Public component ───────────────────────────────────────────────
/**
 * MarkdownRenderer
 * Renders a markdown string as formatted React elements.
 * No external dependencies.
 *
 * @param {string} content  - Markdown text to render
 * @param {string} className - Optional wrapper class
 */
export default function MarkdownRenderer({ content, className = "" }) {
  if (!content) return null;
  const blocks = parseBlocks(content);
  return (
    <div className={`md-root ${className}`.trim()}>
      {blocks.map((block, idx) => renderBlock(block, idx))}
    </div>
  );
}
