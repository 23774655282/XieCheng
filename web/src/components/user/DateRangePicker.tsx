/**
 * 用户端 - 入住/离店日期选择
 */
interface DateRangePickerProps {
  checkIn?: string;
  checkOut?: string;
  onChange?: (checkIn: string, checkOut: string) => void;
}

export default function DateRangePicker({ checkIn = '', checkOut = '', onChange }: DateRangePickerProps) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="date-range-picker" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        type="date"
        value={checkIn}
        min={today}
        onChange={(e) => onChange?.(e.target.value, checkOut)}
        style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #ddd' }}
      />
      <span>至</span>
      <input
        type="date"
        value={checkOut}
        min={checkIn || today}
        onChange={(e) => onChange?.(checkIn, e.target.value)}
        style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #ddd' }}
      />
    </div>
  );
}
