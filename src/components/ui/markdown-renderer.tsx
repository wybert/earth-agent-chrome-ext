import React from 'react';
import ReactMarkdown, { type Components } from "react-markdown"
import rehypeRaw from "rehype-raw"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"

import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/ui/copy-button"

// Fix for dynamic tag rendering and component types
const components: Components = {
  h1: ({ node, ...props }: any) => <h1 className="mt-2 scroll-m-20 text-4xl font-bold tracking-tight" {...props} />, 
  h2: ({ node, ...props }: any) => <h2 className="mt-10 scroll-m-20 border-b pb-1 text-3xl font-semibold tracking-tight first:mt-0" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="mt-8 scroll-m-20 text-2xl font-semibold tracking-tight" {...props} />,
  h4: ({ node, ...props }: any) => <h4 className="mt-8 scroll-m-20 text-xl font-semibold tracking-tight" {...props} />,
  h5: ({ node, ...props }: any) => <h5 className="mt-8 scroll-m-20 text-lg font-semibold tracking-tight" {...props} />,
  h6: ({ node, ...props }: any) => <h6 className="mt-8 scroll-m-20 text-base font-semibold tracking-tight" {...props} />,
  a: ({ node, ...props }: any) => <a className="font-medium underline underline-offset-4" target="_blank" rel="noopener noreferrer" {...props} />,
  p: ({ node, ...props }: any) => <p className="leading-7 [&:not(:first-child)]:mt-6 break-words" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="my-6 ml-6 list-disc" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="my-6 ml-6 list-decimal" {...props} />,
  li: ({ node, ...props }: any) => <li className="mt-2" {...props} />,
  blockquote: ({ node, ...props }: any) => <blockquote className="mt-6 border-l-2 pl-6 italic [&>*]:text-muted-foreground" {...props} />,
  img: ({ node, ...props }: any) => <img className="rounded-md border" {...props} />,
  hr: ({ node, ...props }: any) => <hr className="my-4 md:my-8" {...props} />,
  table: ({ node, ...props }: any) => <table className="my-6 w-full overflow-y-auto" {...props} />,
  tr: ({ node, ...props }: any) => <tr className="m-0 border-t p-0 even:bg-muted" {...props} />,
  th: ({ node, ...props }: any) => <th className="border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right" {...props} />,
  td: ({ node, ...props }: any) => <td className="border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right" {...props} />,
  pre: ({ node, children, ...props }: any) => {
    // Basic pre formatting, removed CodeBlock component usage
    return <pre className="overflow-x-scroll rounded-md border bg-background/50 p-4 font-mono text-sm [scrollbar-width:none]" {...props}>{children}</pre>
  },
  code: ({ node, inline, className, children, ...props }: any) => {
    // Basic code formatting, handle potential language class from remarkGfm
    const match = /language-(\w+)/.exec(className || '')
    return (
      <code 
        className={cn(
          'relative rounded border bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm',
          inline ? '' : 'whitespace-pre',
          className // Keep original className which might contain language-xxx
        )} 
        {...props}
      >
        {children}
      </code>
    )
  },
}

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({
  content,
}: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  )
}
