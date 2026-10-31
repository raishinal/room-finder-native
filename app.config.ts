import type { ConfigContext, ExpoConfig } from "expo/config";
export default ({ config }: ConfigContext): ExpoConfig => {
  const local = (process.env.EXPO_PUBLIC_APP_ENV ?? "local") === "local";
  return {
    ...config,
    name: "Room Finder",
    slug: "room-finder-native",
    icon: "./assets/images/room-finder-icon.png",
    ios: {
      ...config.ios,
      icon: "./assets/images/room-finder-icon.png",
      bundleIdentifier: "com.roshanlama.roomfinder",
      infoPlist: {
        ...config.ios?.infoPlist,
        ...(local
          ? { NSAppTransportSecurity: { NSAllowsLocalNetworking: true } }
          : {}),
      },
    },
    android: {
      ...config.android,
      package: "com.roshanlama.roomfinder",
      adaptiveIcon: {
        foregroundImage: "./assets/images/room-finder-foreground.png",
        backgroundColor: "#b65f43",
        monochromeImage: "./assets/images/room-finder-foreground.png",
      },
    },
    web: { ...config.web, favicon: "./assets/images/room-finder-icon.png" },
    plugins: [
      ...(config.plugins ?? []).filter(
        (plugin) =>
          (Array.isArray(plugin) ? plugin[0] : plugin) !== "expo-splash-screen",
      ),
      [
        "expo-splash-screen",
        {
          backgroundColor: "#b65f43",
          image: "./assets/images/room-finder-foreground.png",
          imageWidth: 180,
        },
      ],
      "expo-secure-store",
      [
        "expo-image-picker",
        {
          photosPermission:
            "Choose photos for your properties, profile, and notices.",
          cameraPermission: false,
          microphonePermission: false,
        },
      ],
      ["expo-build-properties", { android: { usesCleartextTraffic: local } }],
    ],
  };
};
