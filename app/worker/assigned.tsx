import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator, FlatList, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { issuesAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

interface Complaint {
  id: string;
  description: string;
  category: string;
  location: string;
  status: string;
  created_at: string;
  reporter_name: string;
}

const STATUS_LABELS: Record<string, string> = {
  open: 'OPEN', in_progress: 'IN PROGRESS', resolved: 'RESOLVED', closed: 'CLOSED',
};

function StatusBadge({ status }: { status: string }) {
  const color = (Colors.status as any)[status] || Colors.textLight;
  const bg = (Colors.statusLight as any)[status] || '#F5F5F5';
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{STATUS_LABELS[status] || status}</Text>
    </View>
  );
}

export default function WorkerAssignedScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchComplaints = useCallback(async () => {
    try {
      const data = await issuesAPI.getAssigned();
      setComplaints(data.complaints || []);
    } catch (err: any) {
      console.log('error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchComplaints(); }, [fetchComplaints]));

  const inProgress = complaints.filter(c => c.status === 'in_progress').length;
  const resolved = complaints.filter(c => c.status === 'resolved').length;

  function renderItem({ item }: { item: Complaint }) {
    const borderColor = (Colors.status as any)[item.status] || Colors.border;
    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: borderColor }]}
        onPress={() => router.push({ pathname: '/worker/issue-work', params: { id: item.id } })}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          <StatusBadge status={item.status} />
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.metaText}>👤 {item.reporter_name}</Text>
          {item.category ? (
            <View style={styles.tag}><Text style={styles.tagText}>📁 {item.category}</Text></View>
          ) : null}
        </View>
        {item.location ? <Text style={styles.locationText}>📍 {item.location}</Text> : null}
        <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Dark Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.role}>Worker</Text>
          <Text style={styles.heading}>My Tasks</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/notifications')}>
            <Text style={styles.iconBtnText}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderTopColor: Colors.status.in_progress }]}>
          <Text style={[styles.statNum, { color: Colors.status.in_progress }]}>{inProgress}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: Colors.status.resolved }]}>
          <Text style={[styles.statNum, { color: Colors.status.resolved }]}>{resolved}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: Colors.accent }]}>
          <Text style={[styles.statNum, { color: Colors.accent }]}>{complaints.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Worker greeting card */}
      <View style={styles.greetingCard}>
        <Text style={styles.greetingText}>👷 Hello, {user?.name?.split(' ')[0]}!</Text>
        <Text style={styles.greetingSubtext}>You have {inProgress} task{inProgress !== 1 ? 's' : ''} in progress</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.center} />
      ) : (
        <FlatList
          data={complaints}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchComplaints(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={styles.emptyTitle}>No tasks assigned</Text>
              <Text style={styles.emptyText}>You're all caught up!</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md,
    backgroundColor: Colors.secondary,
  },
  role: { fontSize: Fonts.sizes.sm, color: Colors.accent, fontWeight: '600' },
  heading: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: Colors.white },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  iconBtnText: { fontSize: 18 },
  logoutBtn: {
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    backgroundColor: Colors.primary, borderRadius: Radius.full,
  },
  logoutText: { color: Colors.white, fontSize: Fonts.sizes.xs, fontWeight: '700' },

  statsRow: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.secondary,
  },
  statCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.md, padding: Spacing.md,
    alignItems: 'center', borderTopWidth: 3,
  },
  statNum: { fontSize: Fonts.sizes.xxl, fontWeight: '800' },
  statLabel: { fontSize: Fonts.sizes.xs, color: '#AAAAAA', marginTop: 2 },

  greetingCard: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    backgroundColor: Colors.accent + '20',
    borderRadius: Radius.md, padding: Spacing.md,
    borderLeftWidth: 4, borderLeftColor: Colors.accent,
  },
  greetingText: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.secondary },
  greetingSubtext: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 2 },

  list: { padding: Spacing.md, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  cardDesc: { flex: 1, fontSize: Fonts.sizes.md, fontWeight: '600', color: Colors.text, marginRight: Spacing.sm },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
  badgeText: { fontSize: 10, fontWeight: '800' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  metaText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
  tag: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
  },
  tagText: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  locationText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginBottom: Spacing.xs },
  cardDate: { fontSize: Fonts.sizes.xs, color: Colors.textLight },

  center: { flex: 1 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', color: Colors.secondary },
  emptyText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 4 },
});