import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authAPI } from '@/services/api';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your email to receive a reset link</Text>
        </View>

        {sent ? (
          <View style={styles.form}>
            <Text style={styles.successText}>Check your email for the reset link.</Text>
            <TouchableOpacity style={styles.button} onPress={() => router.replace('/auth/login')}>
              <Text style={styles.buttonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Sending…' : 'Send Reset Link'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  back: { marginBottom: Spacing.md },
  backText: { color: Colors.primary, fontSize: Fonts.sizes.md },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  title: { fontSize: Fonts.sizes.xxl, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: Fonts.sizes.md, color: Colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center' },
  form: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  label: { fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.text, marginBottom: Spacing.xs },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    padding: Spacing.sm, fontSize: Fonts.sizes.md, color: Colors.text, backgroundColor: Colors.white,
  },
  button: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    padding: Spacing.md, alignItems: 'center', marginTop: Spacing.lg,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: Fonts.sizes.md, fontWeight: '700' },
  successText: { fontSize: Fonts.sizes.md, color: Colors.success, textAlign: 'center', marginBottom: Spacing.lg },
});
