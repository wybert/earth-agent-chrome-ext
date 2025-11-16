import React, { type CSSProperties } from 'react';
import ReactMarkdown, { type Components } from "react-markdown"
import rehypeRaw from "rehype-raw"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import { Highlight, themes, type Language, type PrismTheme, type RenderProps } from "prism-react-renderer"

import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/ui/copy-button"

const LANGUAGE_ALIASES: Record<string, Language> = {
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  sh: "bash",
  shell: "bash",
  bash: "bash",
  py: "python",
  python: "python",
  rb: "ruby",
  shellsession: "bash",
  md: "markdown",
  markup: "markup",
  html: "markup",
  yml: "yaml",
  yaml: "yaml",
  cjs: "javascript",
  mjs: "javascript",
  jsx: "jsx",
  tsx: "tsx",
  code: "javascript",
}

const usePrismTheme = () => {
  const [theme, setTheme] = React.useState<PrismTheme>(themes.github)

  React.useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains("dark") || mediaQuery.matches
      setTheme(isDark ? themes.nightOwl : themes.github)
    }

    updateTheme()

    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", updateTheme)
    } else {
      // @ts-ignore - Support older browsers
      mediaQuery.addListener(updateTheme)
    }

    return () => {
      observer.disconnect()
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", updateTheme)
      } else {
        // @ts-ignore - Support older browsers
        mediaQuery.removeListener(updateTheme)
      }
    }
  }, [])

  return theme
}

const normalizeLanguage = (language?: string): Language => {
  if (!language) {
    return "javascript"
  }
  const normalized = language.toLowerCase()
  return LANGUAGE_ALIASES[normalized] || (normalized as Language)
}

const getCodeContent = (codeChildren: React.ReactNode): string => {
  return React.Children.toArray(codeChildren)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return child.toString()
      }
      return ""
    })
    .join("")
    .replace(/\n$/, "")
}

interface CodeBlockProps {
  code: string
  language?: string
}

const CodeBlock = ({ code, language }: CodeBlockProps) => {
  const theme = usePrismTheme()
  const lang = normalizeLanguage(language)

  return (
    <div className="group relative my-4 w-full max-w-full">
      <div className="absolute right-3 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyButton content={code} copyMessage="Code copied" />
      </div>
      <Highlight
        code={code}
        language={lang}
        theme={theme}
      >
        {({ className, style, tokens, getLineProps, getTokenProps }: RenderProps) => {
          const preStyle: CSSProperties = {
            ...style,
            backgroundColor: "transparent",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }

          return (
            <pre
              className={cn(
                "m-0 max-h-[65vh] min-w-0 w-full overflow-auto rounded-lg border bg-background/80 p-4 text-sm leading-6 text-foreground shadow-sm whitespace-pre-wrap break-words break-all",
                className
              )}
              style={preStyle}
            >
              {tokens.map((line, lineIndex) => {
                const lineProps = getLineProps({ line, key: lineIndex })
                const lineStyle: CSSProperties = {
                  ...lineProps.style,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }
                return (
                  <div
                    key={lineIndex}
                    {...lineProps}
                    style={lineStyle}
                    className={cn("break-words break-all whitespace-pre-wrap", lineProps.className)}
                  >
                    {line.map((token, tokenIndex) => {
                      const tokenProps = getTokenProps({ token, key: tokenIndex })
                      const tokenStyle: CSSProperties = {
                        ...tokenProps.style,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                      }
                      return (
                        <span
                          key={tokenIndex}
                          {...tokenProps}
                          style={tokenStyle}
                          className={cn("break-words break-all whitespace-pre-wrap", tokenProps.className)}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </pre>
          )
        }}
      </Highlight>
    </div>
  )
}

// Fix for dynamic tag rendering and component types
const components: Components = {
  h1: ({ node, ...props }: any) => <h1 className="mt-2 scroll-m-20 text-4xl font-bold tracking-tight" {...props} />, 
  h2: ({ node, ...props }: any) => <h2 className="mt-10 scroll-m-20 border-b pb-1 text-3xl font-semibold tracking-tight first:mt-0" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="mt-8 scroll-m-20 text-2xl font-semibold tracking-tight" {...props} />,
  h4: ({ node, ...props }: any) => <h4 className="mt-8 scroll-m-20 text-xl font-semibold tracking-tight" {...props} />,
  h5: ({ node, ...props }: any) => <h5 className="mt-8 scroll-m-20 text-lg font-semibold tracking-tight" {...props} />,
  h6: ({ node, ...props }: any) => <h6 className="mt-8 scroll-m-20 text-base font-semibold tracking-tight" {...props} />,
  a: ({ node, ...props }: any) => <a className="font-medium underline underline-offset-4" target="_blank" rel="noopener noreferrer" {...props} />,
  p: ({ node, ...props }: any) => <p className="leading-7 [&:not(:first-child)]:mt-6 break-words overflow-wrap-anywhere" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="my-6 ml-6 list-disc break-words overflow-wrap-anywhere" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="my-6 ml-6 list-decimal break-words overflow-wrap-anywhere" {...props} />,
  li: ({ node, ...props }: any) => <li className="mt-2 break-words overflow-wrap-anywhere" {...props} />,
  blockquote: ({ node, ...props }: any) => <blockquote className="mt-6 border-l-2 pl-6 italic [&>*]:text-muted-foreground" {...props} />,
  img: ({ node, ...props }: any) => <img className="rounded-md border" {...props} />,
  hr: ({ node, ...props }: any) => <hr className="my-4 md:my-8" {...props} />,
  table: ({ node, ...props }: any) => <table className="my-6 w-full overflow-y-auto" {...props} />,
  tr: ({ node, ...props }: any) => <tr className="m-0 border-t p-0 even:bg-muted" {...props} />,
  th: ({ node, ...props }: any) => <th className="border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right" {...props} />,
  td: ({ node, ...props }: any) => <td className="border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right" {...props} />,
  pre: ({ children, ...props }: any) => {
    const childArray = React.Children.toArray(children)
    const child = childArray[0] as React.ReactElement<{ className?: string; children?: React.ReactNode }> | undefined
    const language = child?.props?.className ? /language-([\w-]+)/.exec(child.props.className)?.[1] : undefined
    const code = child?.props?.children ? getCodeContent(child.props.children) : ""

    if (code) {
      return <CodeBlock code={code} language={language} />
    }

    return (
      <pre
        className="overflow-x-auto rounded-md border bg-background/50 p-4 font-mono text-sm max-w-full whitespace-pre-wrap break-words"
        {...props}
      >
        {children}
      </pre>
    )
  },
  code: ({ node, inline, className, children, ...props }: any) => {
    // inline code: inline is undefined or true
    // block code: inline is explicitly false
    const isInlineCode = inline !== false;

    return (
      <code
        className={cn(
          'relative rounded border bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm',
          isInlineCode
            ? 'inline align-baseline break-words overflow-wrap-anywhere'
            : 'block whitespace-pre-wrap break-all',
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
