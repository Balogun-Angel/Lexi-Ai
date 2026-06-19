import type { ReactNode } from 'react'

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={index} className="font-semibold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

export function renderMarkdownContent(content: string) {
  const lines = content.split('\n')
  const nodes: ReactNode[] = []
  let listItems: ReactNode[] = []

  function flushList() {
    if (listItems.length === 0) return
    nodes.push(
      <ul key={`list-${nodes.length}`} className="my-2 list-disc space-y-1 pl-5">
        {listItems}
      </ul>,
    )
    listItems = []
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/)

    if (bulletMatch) {
      listItems.push(
        <li key={`li-${index}`} className="text-text-secondary">
          {renderInlineMarkdown(bulletMatch[1])}
        </li>,
      )
      return
    }

    flushList()

    if (!trimmed) {
      nodes.push(<div key={`space-${index}`} className="h-2" />)
      return
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2]
      const className =
        level === 1
          ? 'mb-2 text-base font-semibold text-text-primary'
          : level === 2
            ? 'mb-2 text-sm font-semibold text-text-primary'
            : 'mb-1 text-sm font-medium text-text-primary'
      nodes.push(
        <p key={`h-${index}`} className={className}>
          {renderInlineMarkdown(text)}
        </p>,
      )
      return
    }

    nodes.push(
      <p key={`p-${index}`} className="text-text-secondary">
        {renderInlineMarkdown(line)}
      </p>,
    )
  })

  flushList()
  return nodes
}
