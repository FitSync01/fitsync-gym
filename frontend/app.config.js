const appScheme = process.env.EXPO_PUBLIC_APP_SCHEME || 'frontend';
const androidPackage = process.env.EXPO_PUBLIC_ANDROID_PACKAGE;
const iosBundleIdentifier = process.env.EXPO_PUBLIC_IOS_BUNDLE_ID;

module.exports = {
  expo: {
    name: 'FitSync Gym',
    slug: 'frontend',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: appScheme,
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: iosBundleIdentifier || undefined,
      infoPlist: {
        NSCameraUsageDescription: 'Scan QR codes for gym check-in',
      },
    },
    android: {
      package: androidPackage || undefined,
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#0A0A0A',
      },
      edgeToEdgeEnabled: true,
      permissions: ['CAMERA'],
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#0A0A0A',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Scan QR codes for gym check-in',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
  },
};
