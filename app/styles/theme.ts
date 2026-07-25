import { TextStyle } from 'react-native';

export const theme = {
  colorPalette: {
    primary: {
      background: '#000000',
      backgroundSecondary: '#0D0D0D',
      backgroundTertiary: '#151515',
    },
    accent: {
      primary: '#f47521',
      secondary: '#ff9e3d',
    },
    text: {
      primary: '#ffffff',
      secondary: '#d6d3d8',
      tertiary: '#918c96',
    },
    surface: {
      raised: '#181818',
    },
    interactive: {
      buttonInactive: '#3D3D3D',
    },
  },
  typography: {
    fontFamily: {
      primary: 'Rubik-Regular',
      primaryBold: 'Rubik-Bold',
      primaryLight: 'Rubik-Light',
      secondary: 'Rubik-Regular',
    },
    sizes: {
      title: '24px',
      body: '16px',
      caption: '14px',
    },
    weights: {
      medium: 500,
      bold: 700,
    },
  },
  spacing: {
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  borderRadius: {
    round: '999px',
  },
};

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
