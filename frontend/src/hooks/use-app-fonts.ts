import { useFonts } from "expo-font";

// Loads the Geist type family used across the app.
export const useAppFonts = (): readonly [boolean, Error | null] =>
  useFonts({
    "Geist-Regular": require("../../assets/fonts/Geist-Regular.ttf"),
    "Geist-Medium": require("../../assets/fonts/Geist-Medium.ttf"),
    "Geist-SemiBold": require("../../assets/fonts/Geist-SemiBold.ttf"),
    "Geist-Bold": require("../../assets/fonts/Geist-Bold.ttf"),
  });
