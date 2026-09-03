import type { SceneItem } from '../lib/parser'
import { Inline } from './Markdown'

export default function ScenePreview({
  items,
  highlightRole,
}: {
  items: SceneItem[]
  highlightRole?: string | null
}) {
  return (
    <div className="script">
      {items.map((item) =>
        item.kind === 'dialogue' ? (
          <div
            key={item.key}
            className={`line${
              highlightRole && item.speakers.some((s) => s.toUpperCase() === highlightRole.toUpperCase())
                ? ' own'
                : ''
            }`}
          >
            <span className="speaker">{item.speaker}:</span>
            <div className="line-text">
              <Inline text={item.text} />
            </div>
          </div>
        ) : item.kind === 'stage' ? (
          <p key={item.key} className="stage">
            <Inline text={item.text} />
          </p>
        ) : (
          <p key={item.key} className="plain">
            <Inline text={item.text} />
          </p>
        ),
      )}
    </div>
  )
}
