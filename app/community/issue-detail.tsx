import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  image_url: string | null;
  confirmation_count: number;
  user_confirmed: number;
  is_merged: boolean;
  parent_complaint_id: string | null;
}

interface Comment {
  id: string;
  text: string;
  author_name: string;
  is_official: boolean;
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function IssueDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!id) return;
    issuesAPI.getById(id)
      .then(data => {
        setComplaint(data.complaint);
        setComments(data.comments || []);
      })
      .catch(err => console.log(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleConfirm() {
    if (!complaint) return;
    setConfirming(true);
    try {
      const isConfirmed = parseInt(String(complaint.user_confirmed)) > 0;
      const data = isConfirmed
        ? await issuesAPI.unconfirm(complaint.id)
        : await issuesAPI.confirm(complaint.id);
      setComplaint(prev => prev ? {
        ...prev,
        confirmation_count: parseInt(data.confirmation_count),
        user_confirmed: data.confirmed ? 1 : 0,
      } : prev);
    } catch (err: any) {
      console.log(err.message);
    } finally {
      setConfirming(false);
    }
  }

  async function handleAddComment() {
    if (!complaint || !comment.trim()) return;
    setCommenting(true);
    try {
      const data = await issuesAPI.addComment(complaint.id, comment.trim());
      setComments(prev => [...prev, data.comment]);
      setComment('');
    } catch (err: any) {
      console.log(err.message);
    } finally {
      setCommenting(false);
    }
  }

  if (loading) return <ActivityIndicator size="large" color={Colors.primary} style={styles.center} />;
  if (!complaint) return null;

  const isConfirmed = parseInt(String(complaint.user_confirmed)) > 0;
  const borderColor = (Colors.status as any)[complaint.status] || Colors.border;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container}>
        {/* Dark Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complaint Details</Text>
          <View style={{ width: 50 }} />
        </View>

        {complaint.is_merged && (
          <View style={styles.mergedBanner}>
            <Text style={styles.mergedText}>⚠️ Merged into #{complaint.parent_complaint_id}</Text>
          </View>
        )}

        <View style={styles.content}>
          {/* Status Card */}
          <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: borderColor }]}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardTitle}>{complaint.category || 'General'}</Text>
              <StatusBadge status={complaint.status} />
            </View>
            <InfoRow label="📝 Description" value={complaint.description} />
            {complaint.location && <InfoRow label="📍 Location" value={complaint.location} />}
            {complaint.assigned_worker_name && <InfoRow label="👷 Assigned To" value={complaint.assigned_worker_name} />}
            <InfoRow label="🕐 Submitted" value={new Date(complaint.created_at).toLocaleString()} />
          </View>

          {/* Photo */}
          {complaint.image_url ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Photo</Text>
              <Image source={{ uri: complaint.image_url }} style={styles.photo} resizeMode="cover" />
            </View>
          ) : null}

          {/* Confirm Button */}
          <TouchableOpacity
            style={[styles.confirmBtn, isConfirmed && styles.confirmBtnActive]}
            onPress={handleConfirm}
            disabled={confirming}
          >
            <Text style={[styles.confirmBtnText, isConfirmed && styles.confirmBtnTextActive]}>
              {isConfirmed ? '✓ You Confirmed This' : '+ Confirm This Issue'} · {complaint.confirmation_count}
            </Text>
          </TouchableOpacity>

          {/* Comments */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>
            {comments.length === 0 && (
              <Text style={styles.empty}>No comments yet.</Text>
            )}
            {comments.map(c => (
              <View key={c.id} style={[styles.commentItem, c.is_official && styles.officialComment]}>
                {c.is_official && (
                  <Text style={styles.officialLabel}>OFFICIAL UPDATE</Text>
                )}
                <Text style={styles.commentAuthor}>{c.author_name}</Text>
                <Text style={styles.commentText}>{c.text}</Text>
                <Text style={styles.commentDate}>{new Date(c.created_at).toLocaleString()}</Text>
              </View>
            ))}

            <Text style={styles.addCommentLabel}>Add Comment</Text>
            <TextInput
              style={styles.textarea}
              value={comment}
              onChangeText={setComment}
              placeholder="Write a comment about this issue…"
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.submitBtn, (!comment.trim() || commenting) && styles.submitDisabled]}
              onPress={handleAddComment}
              disabled={commenting || !comment.trim()}
            >
              <Text style={styles.submitBtnText}>{commenting ? 'Posting…' : 'Post Comment'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignSelf: 'center', marginTop: 100 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md,
    backgroundColor: Colors.secondary,
  },
  back: { color: Colors.accent, fontSize: Fonts.sizes.md, fontWeight: '600' },
  headerTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.white },

  mergedBanner: {
    backgroundColor: Colors.warning + '20', borderLeftWidth: 4,
    borderLeftColor: Colors.warning, padding: Spacing.md, margin: Spacing.md,
    borderRadius: Radius.sm,
  },
  mergedText: { color: Colors.warning, fontSize: Fonts.sizes.sm, fontWeight: '600' },

  content: { padding: Spacing.md, paddingBottom: 40 },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  cardTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', color: Colors.secondary },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontSize: 10, fontWeight: '800' },

  infoRow: { marginBottom: Spacing.md },
  infoLabel: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  infoValue: { fontSize: Fonts.sizes.md, color: Colors.text },

  sectionTitle: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  photo: { width: '100%', height: 220, borderRadius: Radius.md },

  confirmBtn: {
    borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 14, alignItems: 'center', marginBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  confirmBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  confirmBtnText: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.primary },
  confirmBtnTextActive: { color: Colors.white },

  commentItem: {
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingVertical: Spacing.md,
  },
  officialComment: {
    backgroundColor: Colors.primary + '08',
    borderRadius: Radius.sm, paddingHorizontal: Spacing.sm,
    borderBottomWidth: 0, marginBottom: Spacing.xs,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  officialLabel: { fontSize: Fonts.sizes.xs, fontWeight: '800', color: Colors.primary, marginBottom: 4 },
  commentAuthor: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.secondary },
  commentText: { fontSize: Fonts.sizes.md, color: Colors.text, marginTop: 3 },
  commentDate: { fontSize: Fonts.sizes.xs, color: Colors.textLight, marginTop: 4 },

  addCommentLabel: { fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: 6 },
  textarea: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    padding: Spacing.md, fontSize: Fonts.sizes.md, color: Colors.text,
    backgroundColor: Colors.surfaceAlt, height: 90,
  },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 13, alignItems: 'center', marginTop: Spacing.sm,
  },
  submitDisabled: { opacity: 0.4 },
  submitBtnText: { color: Colors.white, fontWeight: '700', fontSize: Fonts.sizes.md },
  empty: { color: Colors.textSecondary, textAlign: 'center', marginVertical: Spacing.sm },
});