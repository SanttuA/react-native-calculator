import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React, { useMemo } from 'react';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const backgroundColor = colorScheme === 'dark' ? '#101113' : '#F7F8FA';
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      contentStyle: { backgroundColor },
    }),
    [backgroundColor],
  );

  return (
    <ThemeProvider value={theme}>
      <Stack screenOptions={screenOptions} />
    </ThemeProvider>
  );
}
