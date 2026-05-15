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
  status: string;
  created_at: string;
  reporter_name: string;
  assigned_worker_name: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  open: 'OPEN', in_progress: 'IN PROGRESS', resolved: 'RESOLVED', closed: 'CLOSED',
};

const FILTERS = ['all', 'open', 'in_progress', 'resolved', 'closed'];
const FILTER_LABELS: Record<string, string> = {
  all: 'All', open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed',
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

export default function ManagerDashboard() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchComplaints = useCallback(async () => {
    try {
      const data = await issuesAPI.getAll();
      setComplaints(data.complaints || []);
    } catch (err: any) {
      console.log('error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  const filtered = filter === 'all' ? complaints : complaints.filter(c => c.status === filter);
  const open = complaints.filter(c => c.status === 'open').length;
  const inProgress = complaints.filter(c => c.status === 'in_progress').length;
  const resolved = complaints.filter(c => c.status === 'resolved').length;

  function renderItem({ item }: { item: Complaint }) {
    const borderColor = (Colors.status as any)[item.status] || Colors.border;
    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: borderColor }]}
        onPress={() => router.push({ pathname: '/manager/issue-detail', params: { id: item.id } })}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          <StatusBadge status={item.status} />
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.metaText}>👤 {item.reporter_name}</Text>
          {item.assigned_worker_name
            ? <Text style={styles.workerText}>👷 {item.assigned_worker_name}</Text>
            : <Text style={styles.unassignedText}>⚠️ Unassigned</Text>
          }
        </View>
        <View style={styles.cardBottom}>
          {item.category ? (
            <View style={styles.tag}><Text style={styles.tagText}>📁 {item.category}</Text></View>
          ) : null}
          <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Dark Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.role}>Facility Manager</Text>
          <Text style={styles.heading}>Dashboard</Text>
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
        <View style={[styles.statCard, { borderTopColor: Colors.accent }]}>
          <Text style={[styles.statNum, { color: Colors.accent }]}>{complaints.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={f => f}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {FILTER_LABELS[f]}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.center} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchComplaints(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyTitle}>No complaints found</Text>
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
    borderRadius: Radius.md, padding: Spacing.sm,
    alignItems: 'center', borderTopWidth: 3,
  },
  statNum: { fontSize: Fonts.sizes.xl, fontWeight: '800' },
  statLabel: { fontSize: 9, color: '#AAAAAA', marginTop: 2 },

  filterContainer: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterList: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  filterBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: Colors.white },

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
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  metaText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
  workerText: { fontSize: Fonts.sizes.sm, color: Colors.success, fontWeight: '600' },
  unassignedText: { fontSize: Fonts.sizes.sm, color: Colors.warning, fontWeight: '600' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
});