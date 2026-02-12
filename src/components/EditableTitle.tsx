import { useRef, useCallback } from 'react'

const MAX_CHARS = 40

interface Props {
  value: string
  onChange: (value: string) => void
}

export function EditableTitle({ value, onChange }: Props) {
  const ref = useRef<HTMLHeadingElement>(null)

  const commit = useCallback(() => {
    const el = ref.current
    if (!el) return
    const trimmed = el.textContent?.trim() ?? ''
    if (trimmed) {
      onChange(trimmed)
    } else {
      el.textContent = value
    }
  }, [onChange, value])

  const handleClick = () => {
    const el = ref.current
    if (!el) return
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }

  const handleInput = () => {
    const el = ref.current
    if (!el) return
    const text = el.textContent ?? ''
    if (text.length > MAX_CHARS) {
      // Truncate and restore caret to end
      el.textContent = text.slice(0, MAX_CHARS)
      const range = document.createRange()
      const sel = window.getSelection()
      range.setStart(el.childNodes[0] ?? el, MAX_CHARS)
      range.collapse(true)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLHeadingElement>) => {
    e.preventDefault()
    const plain = e.clipboardData.getData('text/plain')
    const current = ref.current?.textContent ?? ''
    const sel = window.getSelection()
    let inserted = plain
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      const selectedLen = range.toString().length
      const remaining = MAX_CHARS - (current.length - selectedLen)
      inserted = plain.slice(0, Math.max(0, remaining))
    } else {
      inserted = plain.slice(0, Math.max(0, MAX_CHARS - current.length))
    }
    document.execCommand('insertText', false, inserted)
  }

  return (
    <h1
      ref={ref}
      className="editable-title"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onClick={handleClick}
      onBlur={commit}
      onInput={handleInput}
      onPaste={handlePaste}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); (e.target as HTMLElement).blur() }
        if (e.key === 'Escape') { ref.current!.textContent = value; (e.target as HTMLElement).blur() }
      }}
      title="Click to edit (max 40 characters)"
    >
      {value}
    </h1>
  )
}
