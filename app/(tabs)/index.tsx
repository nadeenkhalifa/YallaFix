import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';

export default function HomeScreen() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/auth/login" />;
  if (user.role === 'Community Member') return <Redirect href="/community/my-issues" />;
  if (user.role === 'Facility Manager') return <Redirect href="/manager/dashboard" />;
  if (user.role === 'Worker') return <Redirect href="/worker/assigned" />;
  if (user.role === 'Admin') return <Redirect href="/admin/dashboard" />;
  return <Redirect href="/auth/login" />;
}
