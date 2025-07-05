import { TextStyle } from 'react-native';
import design from '../../design.json';

export const theme = design.designSystem;

export const px = (value: string | undefined): number => {
  if (typeof value === 'string' && value.endsWith('px')) {
    return parseInt(value, 10);
  }
  return 0;
};

export const fw = (weight: number | undefined): TextStyle['fontWeight'] => {
  return (weight?.toString() as TextStyle['fontWeight']) ?? 'normal';
};

export default theme;
