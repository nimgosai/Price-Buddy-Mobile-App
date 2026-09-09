import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, Text, TextInput } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar } from "expo-status-bar";

import { useAppFonts } from "@/src/hooks/use-app-fonts";
import { AuthProvider } from "@/src/auth/auth-context";
import { BusinessProvider } from "@/src/business/business-context";
import { ToastProvider } from "@/src/components/toast";
import { FontWarmup } from "@/src/components/font-warmup";
import { colors } from "@/src/theme/theme";

// Disable logbox errors etc so that users can see the app
// and agent works as expected.
LogBox.ignoreAllLogs(true);

// Render text at the exact designed sizes on every device, ignoring the phone's
// system "Font size / Display size" accessibility setting. Without this, native
// devices scale all text so it no longer matches the design (and the web preview).
const TextAny = Text as unknown as { defaultProps?: Record<string, unknown> };
TextAny.defaultProps = { ...(TextAny.defaultProps || {}), allowFontScaling: false };
const TextInputAny = TextInput as unknown as { defaultProps?: Record<string, unknown> };
TextInputAny.defaultProps = { ...(TextInputAny.defaultProps || {}), allowFontScaling: false };

// Keep the native splash visible from cold start until the app fonts register.
// Icon fonts (@react-native-vector-icons) load themselves lazily via Expo's
// dynamic font loader on first <Ionicons> mount, so no manual preload is needed.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();

  const ready = fontsLoaded || fontError;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <AuthProvider>
            <BusinessProvider>
              <ToastProvider>
                <StatusBar style="dark" />
                <FontWarmup />
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surfaceSecondary } }} />
              </ToastProvider>
            </BusinessProvider>
          </AuthProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
