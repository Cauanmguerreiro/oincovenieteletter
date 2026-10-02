import React from 'react';

interface MarkdownViewProps {
  content: string;
  className?: string;
  allowDropCap?: boolean;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({
  content,
  className = '',
  allowDropCap = false,
}) => {
  if (!content) return null;

  // Quebra por linhas duplas para identificar blocos
  const paragraphs = content.split(/\n\s*\n/);

  const renderInline = (text: string): React.ReactNode[] => {
    // Processa **negrito** e *itálico*
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const raw = match[0];
      if (raw.startsWith('**') && raw.endsWith('**')) {
        parts.push(
          <strong key={match.index} className="font-bold text-[#171717]">
            {raw.slice(2, -2)}
          </strong>
        );
      } else if (raw.startsWith('*') && raw.endsWith('*')) {
        parts.push(
          <em key={match.index} className="italic">
            {raw.slice(1, -1)}
          </em>
        );
      } else if (raw.startsWith('[') && raw.includes('](') && raw.endsWith(')')) {
        const title = raw.substring(1, raw.indexOf(']('));
        const url = raw.substring(raw.indexOf('](') + 2, raw.length - 1);
        parts.push(
          <a
            key={match.index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#b91c28] underline underline-offset-4 hover:opacity-80"
          >
            {title}
          </a>
        );
      }
      lastIndex = match.index + raw.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  return (
    <div className={`space-y-5 ${className}`}>
      {paragraphs.map((p, idx) => {
        const trimmed = p.trim();
        if (!trimmed) return null;

        // Headings
        if (trimmed.startsWith('#### ')) {
          return (
            <h4 key={idx} className="font-editorial text-lg font-bold text-[#171717] mt-6 mb-2 tracking-tight">
              {renderInline(trimmed.slice(5))}
            </h4>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="font-editorial text-2xl font-bold text-[#171717] mt-8 mb-3 tracking-tight">
              {renderInline(trimmed.slice(4))}
            </h3>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={idx} className="font-editorial text-3xl font-bold text-[#171717] mt-10 mb-4 tracking-tight">
              {renderInline(trimmed.slice(3))}
            </h2>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={idx} className="font-editorial text-4xl font-bold text-[#171717] mt-10 mb-5 tracking-tight">
              {renderInline(trimmed.slice(2))}
            </h1>
          );
        }

        // Blockquotes
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={idx}
              className="my-8 pl-6 border-l-4 border-[#b91c28] font-editorial text-2xl md:text-3xl font-bold tracking-tight text-[#171717] italic leading-snug"
            >
              {renderInline(trimmed.slice(2))}
            </blockquote>
          );
        }

        // Dropcap on first paragraph if requested
        const isOpening = allowDropCap && idx === 0;

        return (
          <p
            key={idx}
            className={`font-editorial text-lg md:text-xl text-[#171717] leading-relaxed ${
              isOpening ? 'opening-letter' : ''
            }`}
          >
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
};
