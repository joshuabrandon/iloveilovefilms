import { useRef, useCallback } from 'react'

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

  return (
    <h1
      ref={ref}
      className="editable-title"
      contentEditable
      suppressContentEditableWarning
      onClick={handleClick}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); (e.target as HTMLElement).blur() }
        if (e.key === 'Escape') { ref.current!.textContent = value; (e.target as HTMLElement).blur() }
      }}
      title="Click to edit"
    >
      {value}
    </h1>
  )
}
