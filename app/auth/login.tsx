import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Dark GIU Header */}
        <View style={styles.heroSection}>
          {/* GIU Logo */}
          <View style={styles.logoBox}>
            <View style={styles.logoStripe} />
            <View style={styles.logoInner}>
              <Text style={styles.logoG}>G</Text>
              <Text style={styles.logoI}>I</Text>
              <Text style={styles.logoU}>U</Text>
            </View>
          </View>
          <Text style={styles.uniName}>GERMAN INTERNATIONAL UNIVERSITY</Text>
          <View style={styles.goldLine} />
          <Text style={styles.appName}>YallaFix</Text>
          <Text style={styles.appTagline}>Smart Campus Facility Management</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Sign in to continue</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@giu-uni.de"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.textLight}
              secureTextEntry
            />
          </View>

          <TouchableOpacity onPress={() => router.push('/auth/forgot-password')}>
            <Text style={styles.forgotLink}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.signInBtn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.signInBtnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => router.push('/auth/register')}
          >
            <Text style={styles.registerBtnText}>Create New Account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>© 2026 German International University · YallaFix</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.secondary },
  container: { flexGrow: 1 },

  heroSection: {
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: Spacing.lg,
  },
  logoBox: {
    width: 88, height: 88,
    borderRadius: Radius.lg,
    backgroundColor: Colors.secondary,
    borderWidth: 2.5,
    borderColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  logoStripe: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 6, backgroundColor: Colors.primary,
  },
  logoInner: { flexDirection: 'row', alignItems: 'center' },
  logoG: { fontSize: 26, fontWeight: '900', color: Colors.primary },
  logoI: { fontSize: 26, fontWeight: '900', color: Colors.accent, marginHorizontal: 1 },
  logoU: { fontSize: 26, fontWeight: '900', color: Colors.white },
  uniName: {
    fontSize: 9, fontWeight: '700', color: Colors.accent,
    letterSpacing: 2, textAlign: 'center', marginBottom: Spacing.sm,
  },
  goldLine: {
    width: 50, height: 2.5,
    backgroundColor: Colors.accent,
    marginBottom: Spacing.sm,
    borderRadius: 2,
  },
  appName: {
    fontSize: Fonts.sizes.xxxl, fontWeight: '800',
    color: Colors.white, letterSpacing: -1,
  },
  appTagline: {
    fontSize: Fonts.sizes.sm, color: '#888888', marginTop: 4,
  },

  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    flex: 1,
    minHeight: 480,
  },
  cardTitle: {
    fontSize: Fonts.sizes.xxl, fontWeight: '800',
    color: Colors.secondary, marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: Fonts.sizes.sm, color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },

  inputGroup: { marginBottom: Spacing.md },
  label: {
    fontSize: Fonts.sizes.sm, fontWeight: '600',
    color: Colors.textSecondary, marginBottom: 6,
  },
  input: {
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md,
    paddingVertical: 13, fontSize: Fonts.sizes.md,
    color: Colors.text, backgroundColor: Colors.surfaceAlt,
  },

  forgotLink: {
    color: Colors.primary, fontSize: Fonts.sizes.sm,
    textAlign: 'right', marginBottom: Spacing.lg, fontWeight: '600',
  },

  signInBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 15, alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  signInBtnText: {
    color: Colors.white, fontSize: Fonts.sizes.md, fontWeight: '700',
  },

  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: {
    color: Colors.textLight, fontSize: Fonts.sizes.sm,
    marginHorizontal: Spacing.sm,
  },

  registerBtn: {
    borderWidth: 1.5, borderColor: Colors.accent,
    borderRadius: Radius.md, paddingVertical: 14,
    alignItems: 'center', backgroundColor: Colors.accentLight,
  },
  registerBtnText: {
    color: Colors.secondary, fontSize: Fonts.sizes.md, fontWeight: '700',
  },

  footer: {
    textAlign: 'center', color: '#555555',
    fontSize: Fonts.sizes.xs,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.white,
  },
});
