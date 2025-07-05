import React from 'react';
import { Svg, Path } from 'react-native-svg';
import { ViewStyle } from 'react-native';
import theme from '@/app/styles/theme';

interface LogoProps {
  style?: ViewStyle;
  color?: string;
}

export function Logo({ style, color = theme.colorPalette.text.primary }: LogoProps) {
  return (
    <Svg viewBox="0 0 100 100" style={style}>
      <Path
        fill={color}
        d="M50 0L0 25v50l50 25 50-25V25L50 0zm0 12.5L87.5 31.25 50 50 12.5 31.25 50 12.5zM25 43.75L50 56.25l25-12.5v25L50 81.25 25 68.75v-25z"
      />
    </Svg>
  );
}
