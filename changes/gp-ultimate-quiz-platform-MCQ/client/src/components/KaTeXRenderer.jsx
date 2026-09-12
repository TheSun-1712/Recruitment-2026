import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Offline KaTeX renderer component.
 * Parses text containing $inline$ and $$block$$ math expressions and renders them
 * with full KaTeX mathematical typesetting (integrals, matrices, fractions, symbols).
 */
export default function KaTeXRenderer({ content, text, className = '', inline = false }) {
    const rawContent = (content !== undefined && content !== null)
        ? content
        : (text !== undefined && text !== null ? text : '');

    const renderedElements = useMemo(() => {
        if (!rawContent || typeof rawContent !== 'string') {
            return null;
        }

        // Tokenize into block math ($$...$$), inline math ($...$), and regular text
        const regex = /(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$)/g;
        const parts = rawContent.split(regex);

        return parts.map((part, index) => {
            if (!part) return null;

            if (part.startsWith('$$') && part.endsWith('$$')) {
                // Block math
                const math = part.slice(2, -2).trim();
                try {
                    const html = katex.renderToString(math, {
                        displayMode: true,
                        throwOnError: false,
                    });
                    return (
                        <div
                            key={index}
                            className="my-3 overflow-x-auto text-center"
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    );
                } catch (err) {
                    return <div key={index} className="text-red-400 font-mono text-sm">{part}</div>;
                }
            } else if (part.startsWith('$') && part.endsWith('$')) {
                // Inline math
                const math = part.slice(1, -1).trim();
                try {
                    const html = katex.renderToString(math, {
                        displayMode: false,
                        throwOnError: false,
                    });
                    return (
                        <span
                            key={index}
                            className="inline-block mx-0.5 align-middle"
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    );
                } catch (err) {
                    return <span key={index} className="text-red-400 font-mono text-sm">{part}</span>;
                }
            } else {
                // Plain text
                return <span key={index}>{part}</span>;
            }
        });
    }, [rawContent]);

    return (
        <span className={`katex-wrapper ${className}`}>
            {renderedElements}
        </span>
    );
}
