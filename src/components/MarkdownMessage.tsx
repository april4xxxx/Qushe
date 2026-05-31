import ReactMarkdown from 'react-markdown'

interface Props {
  content: string
  variant?: 'user' | 'assistant'
}

export function MarkdownMessage({ content, variant = 'assistant' }: Props) {
  const isUser = variant === 'user'
  const textColor = isUser ? 'text-cream/90' : 'text-espresso-light'
  const accentColor = isUser ? 'text-cream' : 'text-espresso'
  const quoteBorder = isUser ? 'border-cream/30' : 'border-espresso/15'
  const codeBg = isUser ? 'bg-cream/10' : 'bg-parchment/60'

  return (
    <div className={`prose-editorial ${textColor}`}>
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="font-sans text-[14px] leading-relaxed mb-3 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className={`font-medium ${accentColor}`}>{children}</strong>
          ),
          em: ({ children }) => (
            <em className="font-serif italic">{children}</em>
          ),
          h1: ({ children }) => (
            <h1 className={`font-serif text-[18px] mt-4 mb-2 ${accentColor}`}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className={`font-serif text-[16px] mt-4 mb-2 ${accentColor}`}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className={`font-serif text-[15px] mt-3 mb-2 ${accentColor}`}>{children}</h3>
          ),
          ul: ({ children }) => (
            <ul className="font-sans text-[14px] leading-relaxed space-y-1 my-3 pl-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="font-sans text-[14px] leading-relaxed space-y-1 my-3 pl-5 list-decimal">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="font-sans text-[14px] leading-relaxed flex gap-2 before:content-['·'] before:shrink-0 before:font-bold before:opacity-50 [&>p]:!mb-0">
              <span className="flex-1">{children}</span>
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className={`border-l-2 ${quoteBorder} pl-3 my-3 font-serif italic opacity-90`}>
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className={`${codeBg} px-1.5 py-0.5 rounded font-mono text-[12px]`}>{children}</code>
          ),
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className={`underline underline-offset-2 decoration-[0.5px] ${accentColor}`}>
              {children}
            </a>
          ),
          hr: () => <hr className={`my-4 ${isUser ? 'border-cream/20' : 'border-parchment'}`} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
