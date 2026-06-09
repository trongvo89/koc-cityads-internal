import ReactMarkdown from "react-markdown";

interface Props {
  children: string;
  className?: string;
}

export default function MarkdownContent({ children, className = "" }: Props) {
  return (
    <div className={className}>
    <ReactMarkdown
      components={{
        // Links: open in new tab, styled blue
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800 break-all"
          >
            {children}
          </a>
        ),
        // Images: max-width constrained, rounded
        img: ({ src, alt }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt ?? ""}
            className="max-w-full rounded-lg my-2"
          />
        ),
        // Bold
        strong: ({ children }) => (
          <strong className="font-semibold text-zinc-800">{children}</strong>
        ),
        // Paragraphs: spaced out
        p: ({ children }) => (
          <p className="mb-2 last:mb-0">{children}</p>
        ),
        // Unordered lists
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>
        ),
        // Ordered lists
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-zinc-600">{children}</li>
        ),
        // Headings
        h1: ({ children }) => (
          <h1 className="font-bold text-zinc-800 text-lg mb-2">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="font-semibold text-zinc-800 text-base mb-1.5">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="font-semibold text-zinc-700 text-sm mb-1">{children}</h3>
        ),
        // Horizontal rule
        hr: () => <hr className="border-zinc-200 my-3" />,
      }}
    >
      {children}
    </ReactMarkdown>
    </div>
  );
}
