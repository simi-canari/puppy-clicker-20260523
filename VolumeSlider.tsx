import { useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';

type Props = { value: number; onChange: (value: number) => void; color: string };

export default function VolumeSlider({ value, onChange, color }: Props) {
  const [width, setWidth] = useState(0);
  const track = useRef<View>(null);
  const latest = useRef({ width, value, onChange });
  latest.current = { width, value, onChange };
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: event => update(event.nativeEvent.pageX),
    onPanResponderMove: event => update(event.nativeEvent.pageX),
  })).current;

  function update(pageX: number) {
    track.current?.measureInWindow(x => {
      if (latest.current.width > 0) {
        latest.current.onChange(Math.max(0, Math.min(1, (pageX - x) / latest.current.width)));
      }
    });
  }

  return (
    <View
      ref={track}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      {...responder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Click volume"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100), text: `${Math.round(value * 100)}%` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={event => onChange(Math.max(0, Math.min(1,
        value + (event.nativeEvent.actionName === 'increment' ? 0.05 : -0.05))))}
      style={{ height: 44, justifyContent: 'center' }}
    >
      <View style={{ height: 4, borderRadius: 2, backgroundColor: color, opacity: 0.25 }} />
      <View style={{ position: 'absolute', width: `${value * 100}%`, height: 4, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: value * Math.max(0, width - 24), width: 24, height: 24, borderRadius: 12, backgroundColor: color }} />
    </View>
  );
}
