import React from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import Constants from 'expo-constants';
import theme from '../app/styles/theme';

export const isExpoGo = Constants.appOwnership === 'expo';

let gcast: any = null;
let NativeCastButton: any = null;

if (!isExpoGo) {
  try {
    gcast = require('react-native-google-cast');
    if (gcast) {
      NativeCastButton = gcast.CastButton || (gcast.default && gcast.default.CastButton);
    }
  } catch {
    gcast = null;
    NativeCastButton = null;
  }
}


export const useSafeRemoteMediaClient = () => {
  if (isExpoGo) return null;
  if (gcast && gcast.useRemoteMediaClient) return gcast.useRemoteMediaClient();
  if (gcast && gcast.default && gcast.default.useRemoteMediaClient) return gcast.default.useRemoteMediaClient();
  return null;
};

export const useSafeCastSession = () => {
  if (isExpoGo) return null;
  if (gcast && gcast.useCastSession) return gcast.useCastSession();
  if (gcast && gcast.default && gcast.default.useCastSession) return gcast.default.useCastSession();
  return null;
};

export const SafeCastButton = ({
    style,
    tintColor
}: {
    style?: StyleProp<ViewStyle>,
    tintColor?: string
}) => {
  const color = tintColor || theme.colorPalette.text.primary;

  if (isExpoGo || !NativeCastButton) {
    return null;
  }

  return (
    <NativeCastButton
      style={[{ width: 24, height: 24 }, style]}
      tintColor={color}
    />
  );
};
