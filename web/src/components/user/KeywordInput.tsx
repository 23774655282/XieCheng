/**
 * 用户端 - 关键词/城市输入
 */
interface KeywordInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
}

export default function KeywordInput({ placeholder = '城市 / 关键词', value = '', onChange }: KeywordInputProps) {
  return (
    <input
      type="text"
      className="keyword-input"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #ddd' }}
    />
  );
}
