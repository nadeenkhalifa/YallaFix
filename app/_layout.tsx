import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/AuthContext';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === 'auth';
    if (!user && !inAuth) {
      router.replace('/auth/login');
    } else if (user && inAuth) {
      if (user.role === 'Community Member') {
        router.replace('/community/my-issues');
      } else if (user.role === 'Facility Manager') {
        router.replace('/manager/dashboard');
      } else if (user.role === 'Worker') {
        router.replace('/worker/assigned');
      } else if (user.role === 'Admin') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/community/my-issues');
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="auth/forgot-password" />
        <Stack.Screen name="community/my-issues" />
        <Stack.Screen name="community/submit-issue" />
        <Stack.Screen name="community/issue-detail" />
        <Stack.Screen name="manager/dashboard" />
        <Stack.Screen name="manager/issue-detail" />
        <Stack.Screen name="worker/assigned" />
        <Stack.Screen name="worker/issue-work" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="admin/dashboard" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
