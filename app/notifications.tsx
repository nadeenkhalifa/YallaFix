import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { notificationsAPI } from '@/services/api';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

interface Notification {
  id: string;
  title: string;
  body: string;
  complaint_id: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationsAPI.getAll();
      setNotifications(data.notifications || []);
    } catch (err: any) {
      console.log('error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  async function handleMarkAllRead() {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  }

  async function handlePress(item: Notification) {
    if (!item.is_read) {
      await notificationsAPI.markRead(item.id).catch(() => {});
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
    }
    if (item.complaint_id) {
      router.push({ pathname: '/community/issue-detail', params: { id: item.complaint_id } });
    }
  }

  const unread = notifications.filter(n => !n.is_read).length;

  function renderItem({ item }: { item: Notification }) {
    return (
      <TouchableOpacity
        style={[styles.item, !item.is_read && styles.itemUnread]}
        onPress={() => handlePress(item)}
      >
        <View style={styles.itemLeft}>
          {!item.is_read
            ? <View style={styles.dot} />
            : <View style={styles.dotRead} />
          }
        </View>
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, item.is_read && styles.itemTitleRead]}>
            {item.title}
          </Text>
          <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.itemDate}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Dark Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Notifications</Text>
        {unread > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 80 }} />}
      </View>

      {/* Unread count banner */}
      {unread > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadText}>🔔 {unread} unread notification{unread !== 1 ? 's' : ''}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.center} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>You'll be notified about issue updates here</Text>
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
  back: { color: Colors.accent, fontSize: Fonts.sizes.md, fontWeight: '600', width: 60 },
  heading: { fontSize: Fonts.sizes.xl, fontWeight: '800', color: Colors.white },
  markAll: { color: Colors.accent, fontSize: Fonts.sizes.sm, width: 80, textAlign: 'right', fontWeight: '600' },

  unreadBanner: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.primary + '30',
  },
  unreadText: { color: Colors.primary, fontSize: Fonts.sizes.sm, fontWeight: '600' },

  list: { padding: Spacing.md, paddingBottom: 40 },
  item: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    flexDirection: 'row', alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  itemUnread: {
    borderLeftWidth: 4, borderLeftColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  itemLeft: { marginRight: Spacing.sm, paddingTop: 4 },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  dotRead: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.border,
  },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.text },
  itemTitleRead: { fontWeight: '500', color: Colors.textSecondary },
  itemBody: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 3, lineHeight: 18 },
  itemDate: { fontSize: Fonts.sizes.xs, color: Colors.textLight, marginTop: 6 },

  center: { flex: 1 },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', color: Colors.secondary },
  emptyText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
});