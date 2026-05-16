import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

const ROLES = [
  { key: 'reporter', label: 'Community Member', icon: '👤' },
  { key: 'manager', label: 'Facility Manager', icon: '🏢' },
  { key: 'worker', label: 'Worker', icon: '🔧' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('reporter');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, role);
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Dark Header */}
        <View style={styles.heroSection}>
          <View style={styles.logoBox}>
            <View style={styles.logoStripe} />
            <View style={styles.logoInner}>
              <Text style={styles.logoG}>G</Text>
              <Text style={styles.logoI}>I</Text>
              <Text style={styles.logoU}>U</Text>
            </View>
          </View>
          <Text style={styles.appName}>YallaFix</Text>
          <Text style={styles.appTagline}>Create your account</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Register</Text>
          <Text style={styles.cardSubtitle}>Join the GIU facility management system</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="words"
            />
          </View>

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
              placeholder="Min. 6 characters"
              placeholderTextColor={Colors.textLight}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Your Role</Text>
            <View style={styles.roleGrid}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.roleCard, role === r.key && styles.roleCardActive]}
                  onPress={() => setRole(r.key)}
                >
                  <Text style={styles.roleIcon}>{r.icon}</Text>
                  <Text style={[styles.roleLabel, role === r.key && styles.roleLabelActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.registerBtn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.registerBtnText}>{loading ? 'Creating Account…' : 'Create Account'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.link}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 60,
    paddingBottom: 32,
  },
  logoBox: {
    width: 72, height: 72,
    borderRadius: Radius.lg,
    backgroundColor: Colors.secondary,
    borderWidth: 2, borderColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.sm, overflow: 'hidden',
  },
  logoStripe: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 5, backgroundColor: Colors.primary,
  },
  logoInner: { flexDirection: 'row', alignItems: 'center' },
  logoG: { fontSize: 22, fontWeight: '900', color: Colors.primary },
  logoI: { fontSize: 22, fontWeight: '900', color: Colors.accent, marginHorizontal: 1 },
  logoU: { fontSize: 22, fontWeight: '900', color: Colors.white },
  appName: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: Colors.white },
  appTagline: { fontSize: Fonts.sizes.sm, color: '#888888', marginTop: 4 },

  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: Spacing.lg, paddingTop: Spacing.xl, flex: 1,
  },
  cardTitle: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: Colors.secondary, marginBottom: 4 },
  cardSubtitle: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginBottom: Spacing.lg },

  inputGroup: { marginBottom: Spacing.md },
  label: { fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 13,
    fontSize: Fonts.sizes.md, color: Colors.text, backgroundColor: Colors.surfaceAlt,
  },

  roleGrid: { gap: 8 },
  roleCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt, gap: Spacing.sm,
  },
  roleCardActive: { borderColor: Colors.primary, backgroundColor: '#FFF0F0' },
  roleIcon: { fontSize: 20 },
  roleLabel: { fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.textSecondary },
  roleLabelActive: { color: Colors.primary },

  registerBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 15, alignItems: 'center', marginTop: Spacing.sm,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  registerBtnText: { color: Colors.white, fontSize: Fonts.sizes.md, fontWeight: '700' },

  footerText: { textAlign: 'center', color: Colors.textSecondary, fontSize: Fonts.sizes.sm, marginTop: Spacing.lg },
  link: { color: Colors.primary, fontWeight: '700' },
});