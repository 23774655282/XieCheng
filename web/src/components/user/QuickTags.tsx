/**
 * 用户端 - 快捷标签（亲子/豪华/停车等）
 */
interface QuickTagsProps {
  onSelect?: (tag: string) => void;
}

const TAGS = ['亲子', '豪华', '停车', '近地铁', '含早'];

export default function QuickTags({ onSelect }: QuickTagsProps) {
  return (
    <div className="quick-tags" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {TAGS.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onSelect?.(tag)}
          style={{ padding: '0.25rem 0.75rem', borderRadius: 999, border: '1px solid #1677ff', background: '#fff', color: '#1677ff' }}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
