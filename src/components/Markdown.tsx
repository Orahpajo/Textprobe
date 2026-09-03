import { Fragment, type ReactNode } from 'react'

/**
 * Winziger Inline-Renderer für **fett** und *kursiv* – mehr braucht das
 * Szenen-Markdown innerhalb einer Replik nicht.
 */
export function Inline({ text }: { text: string }): ReactNode {
  return (
    <>
      {text.split('\n\n').map((para, p) => (
        <p key={p} className="para">
          {renderInline(para)}
        </p>
      ))}
    </>
  )
}

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={i++}>{text.slice(last, m.index)}</Fragment>)
    if (m[1]) out.push(<strong key={i++}>{m[1]}</strong>)
    else out.push(<em key={i++}>{m[2] ?? m[3]}</em>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(<Fragment key={i++}>{text.slice(last)}</Fragment>)
  return out
}
