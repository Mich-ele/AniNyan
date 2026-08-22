import React from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import Constants from 'expo-constants';
import type { CastSession } from 'react-native-google-cast';
import { theme } from '../app/styles/theme';

export const isExpoGo = Constants.appOwnership === 'expo';

type SafeCastState = 'noDevicesAvailable' | 'notConnected' | 'connecting' | 'connected' | null | undefined;

let gcast: any = null;
let NativeCastButton: any = null;
let useCastSessionHook: (options?: { ignoreSessionUpdatesInBackground?: boolean }) => CastSession | null = () => null;
let useCastStateHook: () => SafeCastState = () => null;

if (!isExpoGo) {
  try {
    gcast = require('react-native-google-cast');
    if (gcast) {
      NativeCastButton = gcast.CastButton || (gcast.default && gcast.default.CastButton);
      useCastSessionHook = gcast.useCastSession || useCastSessionHook;
      useCastStateHook = gcast.useCastState || useCastStateHook;
    }
  } catch {
    gcast = null;
    NativeCastButton = null;
  }
}

export const useSafeCastSession = () => useCastSessionHook({ ignoreSessionUpdatesInBackground: true });

export const useSafeCastState = () => useCastStateHook();

export const startSafeCastDiscovery = async () => {
  if (isExpoGo || !gcast) return;
  const CastContext = gcast.default || gcast.CastContext;
  const discoveryManager = CastContext?.getDiscoveryManager?.();
  await discoveryManager?.startDiscovery();
};

export const endSafeCastSession = async () => {
  if (isExpoGo || !gcast) return;
  const CastContext = gcast.default || gcast.CastContext;
  const sessionManager = CastContext?.getSessionManager?.();
  await sessionManager?.endCurrentSession(true);
};

export const SafeCastButton = ({
  style,
  tintColor,
}: {
  style?: StyleProp<ViewStyle>;
  tintColor?: string;
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
