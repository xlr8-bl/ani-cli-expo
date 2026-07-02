import '@/global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  SourceSerif4_400Regular,
  SourceSerif4_400Regular_Italic,
} from '@expo-google-fonts/source-serif-4';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Family names here must match tokens.fonts. UI sans = bundled SF Pro Display.
  const [loaded] = useFonts({
    SourceSerif4: SourceSerif4_400Regular,
    SourceSerif4Italic: SourceSerif4_400Regular_Italic,
    SFProDisplay: require('@/assets/fonts/SFProDisplay-Regular.otf'),
    SFProDisplayMedium: require('@/assets/fonts/SFProDisplay-Medium.otf'),
    SFProDisplayBold: require('@/assets/fonts/SFProDisplay-Bold.otf'),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
