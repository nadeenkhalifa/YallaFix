import { useCallback, useEffect, useState } from 'react';
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
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
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

export default function MyIssuesScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchComplaints = useCallback(async () => {
    try {
      const data = await issuesAPI.getMy();
      setComplaints(data.complaints || []);
    } catch (err: any) {
      console.log('fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  const open = complaints.filter(c => c.status === 'open').length;
  const inProgress = complaints.filter(c => c.status === 'in_progress').length;
  const resolved = complaints.filter(c => c.status === 'resolved').length;

  function renderItem({ item }: { item: Complaint }) {
    const borderColor = (Colors.status as any)[item.status] || Colors.border;
    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: borderColor }]}
        onPress={() => router.push({ pathname: '/community/issue-detail', params: { id: item.id } })}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          <StatusBadge status={item.status} />
        </View>
        <View style={styles.cardBottom}>
          {item.category ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>📁 {item.category}</Text>
            </View>
          ) : null}
          {item.location ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>📍 {item.location}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Dark Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.heading}>My Complaints</Text>
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

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderTopColor: Colors.status.open }]}>
          <Text style={[styles.statNum, { color: Colors.status.open }]}>{open}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: Colors.status.in_progress }]}>
          <Text style={[styles.statNum, { color: Colors.status.in_progress }]}>{inProgress}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: Colors.status.resolved }]}>
          <Text style={[styles.statNum, { color: Colors.status.resolved }]}>{resolved}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
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
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No complaints yet</Text>
              <Text style={styles.emptyText}>Tap the button below to report an issue</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/community/submit-issue')}>
        <Text style={styles.fabText}>+ New Complaint</Text>
      </TouchableOpacity>
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
  headerLeft: {},
  greeting: { fontSize: Fonts.sizes.sm, color: Colors.accent, fontWeight: '600' },
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

  list: { padding: Spacing.md, paddingBottom: 100 },
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
  cardBottom: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.xs },
  tag: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
  },
  tagText: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  cardDate: { fontSize: Fonts.sizes.xs, color: Colors.textLight },

  center: { flex: 1 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', color: Colors.secondary },
  emptyText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 4 },

  fab: {
    position: 'absolute', bottom: Spacing.xl, right: Spacing.lg, left: Spacing.lg,
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 15, alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  fabText: { color: Colors.white, fontWeight: '700', fontSize: Fonts.sizes.md },
});