import React from 'react';

/**
 * Regex for inline markdown tokens:
 * - Links: [label](url)
 * - Inline code: `code`
 * - Bold-italic: ***text***
 * - Bold: **text**
 * - Italic: *text* or _text_
 */
const INLINE_REGEX = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*\*(?!\s)[^*\n]+?(?<!\s)\*\*\*|\*\*(?!\s)[^*\n]+?(?<!\s)\*\*|\*(?!\s)[^*\n]+?(?<!\s)\*|(?:\b|^)_(?!\s)[^_\n]+?(?<!\s)_(?:\b|$))/g;

/**
 * Render inline markdown elements (bold, italic, code, links).
 */
export function InlineContent({ text, isUser = false, isError = false }) {
  if (!text) return null;

  const parts = text.split(INLINE_REGEX);

  return (
    <>
      {parts.map((part, idx) => {
        if (!part) return null;

        // Bold + Italic: ***text***
        if (part.startsWith('***') && part.endsWith('***') && part.length > 6) {
          const content = part.slice(3, -3);
          return (
            <strong
              key={idx}
              className={`font-bold italic ${
                isUser ? 'text-white' : isError ? 'text-red-950' : 'text-sand-950'
              }`}
            >
              {content}
            </strong>
          );
        }

        // Bold: **text**
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          const content = part.slice(2, -2);
          return (
            <strong
              key={idx}
              className={`font-semibold ${
                isUser ? 'font-bold text-white' : isError ? 'font-bold text-red-950' : 'text-sand-950'
              }`}
            >
              {content}
            </strong>
          );
        }

        // Italic: *text* or _text_
        if (
          ((part.startsWith('*') && part.endsWith('*')) ||
            (part.startsWith('_') && part.endsWith('_'))) &&
          part.length > 2
        ) {
          const content = part.slice(1, -1);
          return (
            <em key={idx} className="italic">
              {content}
            </em>
          );
        }

        // Inline Code: `code`
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          const content = part.slice(1, -1);
          return (
            <code
              key={idx}
              className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                isUser
                  ? 'bg-white/20 text-white'
                  : isError
                  ? 'bg-red-100 text-red-900 border border-red-200'
                  : 'bg-sand-100 text-terracotta-800 border border-sand-200/80'
              }`}
            >
              {content}
            </code>
          );
        }

        // Markdown link: [label](url)
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          const [, label, url] = linkMatch;
          return (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline underline-offset-2 transition-opacity hover:opacity-80 ${
                isUser ? 'text-white font-medium' : 'text-terracotta-600 hover:text-terracotta-700'
              }`}
            >
              {label}
            </a>
          );
        }

        // Regular plain text
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </>
  );
}

/**
 * Parses raw markdown text into structural blocks:
 * headings, lists (ordered/unordered), code fences, tables, blockquotes, and paragraphs.
 */
function parseMarkdownBlocks(text) {
  if (!text) return [];

  const lines = text.split('\n');
  const blocks = [];

  let currentList = null; // { type: 'ul' | 'ol', items: [] }
  let currentTable = null; // { headers: [], rows: [] }
  let inCodeBlock = false;
  let codeBuffer = [];
  let codeLang = '';
  let currentParagraph = [];

  function flushList() {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  }

  function flushTable() {
    if (currentTable) {
      blocks.push(currentTable);
      currentTable = null;
    }
  }

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      blocks.push({
        type: 'paragraph',
        lines: currentParagraph,
      });
      currentParagraph = [];
    }
  }

  function flushAll() {
    flushList();
    flushTable();
    flushParagraph();
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Code Block Fence
    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        flushAll();
        inCodeBlock = true;
        codeLang = trimmed.slice(3).trim();
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        blocks.push({
          type: 'code',
          language: codeLang,
          code: codeBuffer.join('\n'),
        });
        codeBuffer = [];
        codeLang = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // 2. Empty line
    if (!trimmed) {
      flushAll();
      continue;
    }

    // 3. Table row detection: "| cell | cell |"
    const isTableRow = trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;
    if (isTableRow) {
      flushList();
      flushParagraph();

      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());

      const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));

      if (isSeparator) {
        // Just the divider line between header and body
        continue;
      }

      if (!currentTable) {
        currentTable = { type: 'table', headers: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    } else {
      flushTable();
    }

    // 4. Headings: "# ", "## ", "### ", "#### "
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushAll();
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      continue;
    }

    // 5. Blockquote: "> "
    const quoteMatch = trimmed.match(/^>\s*(.+)$/);
    if (quoteMatch) {
      flushAll();
      blocks.push({
        type: 'quote',
        text: quoteMatch[1],
      });
      continue;
    }

    // 6. Unordered list: "* ", "- ", "• "
    const bulletMatch = rawLine.match(/^(\s*)[*\-•]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      flushTable();
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[2]);
      continue;
    }

    // 7. Ordered list: "1. ", "2. ", "1) "
    const orderedMatch = rawLine.match(/^(\s*)\d+[.)]\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      flushTable();
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(orderedMatch[2]);
      continue;
    }

    // 8. Normal text line inside paragraph
    flushList();
    currentParagraph.push(rawLine);
  }

  flushAll();

  // If code fence was left unclosed at end of input
  if (inCodeBlock && codeBuffer.length > 0) {
    blocks.push({
      type: 'code',
      language: codeLang,
      code: codeBuffer.join('\n'),
    });
  }

  return blocks;
}

/**
 * FormattedMessage Component
 *
 * Renders rich Markdown formatting with Tailwind CSS classes tailored to
 * TripPlanner's warm terracotta/sand visual theme.
 */
export function FormattedMessage({ content, isUser = false, isError = false }) {
  if (!content) return null;

  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-2 leading-relaxed break-words">
      {blocks.map((block, bIdx) => {
        switch (block.type) {
          case 'heading': {
            const HeadingTag = block.level <= 2 ? 'h4' : 'h5';
            const headingClasses =
              block.level <= 2
                ? `font-bold text-sm sm:text-base mt-2 mb-1 ${
                    isUser ? 'text-white' : 'text-sand-950'
                  }`
                : `font-semibold text-xs sm:text-sm mt-1.5 mb-0.5 ${
                    isUser ? 'text-white/95' : 'text-sand-900'
                  }`;

            return (
              <HeadingTag key={bIdx} className={headingClasses}>
                <InlineContent text={block.text} isUser={isUser} isError={isError} />
              </HeadingTag>
            );
          }

          case 'ul': {
            return (
              <ul
                key={bIdx}
                className={`list-disc pl-4 space-y-1 my-1.5 ${
                  isUser ? 'marker:text-sand-200' : 'marker:text-terracotta-500'
                }`}
              >
                {block.items.map((item, iIdx) => (
                  <li key={iIdx} className="leading-relaxed">
                    <InlineContent text={item} isUser={isUser} isError={isError} />
                  </li>
                ))}
              </ul>
            );
          }

          case 'ol': {
            return (
              <ol
                key={bIdx}
                className={`list-decimal pl-4 space-y-1 my-1.5 ${
                  isUser
                    ? 'marker:text-sand-200 marker:font-semibold'
                    : 'marker:text-terracotta-600 marker:font-semibold'
                }`}
              >
                {block.items.map((item, iIdx) => (
                  <li key={iIdx} className="leading-relaxed">
                    <InlineContent text={item} isUser={isUser} isError={isError} />
                  </li>
                ))}
              </ol>
            );
          }

          case 'quote': {
            return (
              <blockquote
                key={bIdx}
                className={`border-l-2 pl-3 my-1.5 italic ${
                  isUser
                    ? 'border-white/50 text-sand-100'
                    : 'border-terracotta-400 text-sand-700 bg-sand-50/50 py-1 rounded-r-lg'
                }`}
              >
                <InlineContent text={block.text} isUser={isUser} isError={isError} />
              </blockquote>
            );
          }

          case 'code': {
            return (
              <pre
                key={bIdx}
                className="my-2 p-2.5 rounded-xl bg-sand-950 text-sand-100 font-mono text-xs overflow-x-auto border border-sand-800 shadow-inner"
              >
                <code>{block.code}</code>
              </pre>
            );
          }

          case 'table': {
            return (
              <div
                key={bIdx}
                className="overflow-x-auto my-2 rounded-xl border border-sand-200/90 shadow-warm-xs"
              >
                <table className="min-w-full text-xs text-left">
                  {block.headers.length > 0 && (
                    <thead className="bg-sand-100/90 text-sand-800 font-semibold border-b border-sand-200">
                      <tr>
                        {block.headers.map((hdr, hIdx) => (
                          <th key={hIdx} className="px-3 py-2">
                            <InlineContent text={hdr} isUser={isUser} isError={isError} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody className="divide-y divide-sand-100 bg-white">
                    {block.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-sand-50/50 transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-2 text-sand-800">
                            <InlineContent text={cell} isUser={isUser} isError={isError} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          case 'paragraph':
          default: {
            return (
              <p key={bIdx} className="leading-relaxed">
                {block.lines.map((line, lIdx) => (
                  <React.Fragment key={lIdx}>
                    <InlineContent text={line} isUser={isUser} isError={isError} />
                    {lIdx < block.lines.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </p>
            );
          }
        }
      })}
    </div>
  );
}

export default FormattedMessage;
