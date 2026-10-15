import React from 'react';
import { Pressable as RNPressable, type PressableProps } from 'react-native';
/**
 * Drop-in Pressable that keeps `style={({ pressed }) => …}` working. NativeWind's JSX transform drops
 * style callbacks on Pressable, so the pressed state is tracked here and a plain style is passed down.
 */
export function Pressable({ style, onPressIn, onPressOut, ...props }: PressableProps) {
  const [pressed, setPressed] = React.useState(false);
  const resolved = typeof style === 'function' ? style({ pressed, hovered: false }) : style;
  return (
    <RNPressable
      {...props}
      style={resolved}
      onPressIn={event => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={event => {
        setPressed(false);
        onPressOut?.(event);
      }}
    />
  );
}
