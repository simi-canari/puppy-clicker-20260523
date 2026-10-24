type Props = { value: number; onChange: (value: number) => void; color: string };

export default function VolumeSlider({ value, onChange, color }: Props) {
  return (
    <input
      type="range"
      aria-label="Click volume"
      aria-valuetext={`${Math.round(value * 100)}%`}
      min={0}
      max={100}
      step={1}
      value={Math.round(value * 100)}
      onChange={event => onChange(Number(event.currentTarget.value) / 100)}
      style={{ width: '100%', height: 44, margin: 0, accentColor: color, cursor: 'pointer' }}
    />
  );
}
