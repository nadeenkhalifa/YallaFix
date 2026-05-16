import { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, KeyboardAvoidingView,
  Modal, Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { issuesAPI, managerAPI } from '@/services/api';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

interface Complaint {
  id: string; description: string; category: string; location: string;
  status: string; created_at: string; reporter_name: string;
  assigned_worker_name: string | null; image_url: string | null;
  proof_image_url: string | null; confirmation_count: number;
  is_merged: boolean; parent_complaint_id: string | null;
}
interface Comment { id: string; text: string; author_name: string; is_official: boolean; created_at: string; }
interface Worker { id: string; name: string; email: string; }

const STATUS_LABELS: Record<string, string> = {
  open: 'OPEN', in_progress: 'IN PROGRESS', resolved: 'RESOLVED', closed: 'CLOSED',
};
const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

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

export default function ManagerIssueDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignModal, setAssignModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [mergeModal, setMergeModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [officialUpdate, setOfficialUpdate] = useState('');
  const [postingUpdate, setPostingUpdate] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([issuesAPI.getById(id), managerAPI.getWorkers(), issuesAPI.getAll()])
      .then(([issueData, workerData, allData]) => {
        setComplaint(issueData.complaint);
        setComments(issueData.comments || []);
        setWorkers(workerData.workers || []);
        setAllComplaints((allData.complaints || []).filter((c: Complaint) => c.id !== id && !c.is_merged));
      })
      .catch(err => Alert.alert('Error', err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAssign(workerId: string, workerName: string) {
    if (!complaint) return;
    setActionLoading(true);
    try {
      const data = await issuesAPI.assign(complaint.id, workerId);
      setComplaint(prev => prev ? { ...prev, ...data.complaint, assigned_worker_name: workerName } : prev);
      setAssignModal(false);
      Alert.alert('✅ Assigned', `Complaint assigned to ${workerName}`);
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setActionLoading(false); }
  }

  async function handleStatusChange(status: string) {
    if (!complaint) return;
    setActionLoading(true);
    try {
      const data = await issuesAPI.updateStatus(complaint.id, status);
      setComplaint(prev => prev ? { ...prev, ...data.complaint } : prev);
      setStatusModal(false);
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setActionLoading(false); }
  }

  async function handleClose() {
    if (!complaint) return;
    Alert.alert('Close Complaint', 'Are you sure you want to close this complaint?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Close', style: 'destructive', onPress: async () => {
        setActionLoading(true);
        try {
          const data = await issuesAPI.close(complaint.id);
          setComplaint(prev => prev ? { ...prev, ...data.complaint } : prev);
        } catch (err: any) { Alert.alert('Error', err.message); }
        finally { setActionLoading(false); }
      }},
    ]);
  }

  async function handleMerge(parentId: string, parentDesc: string) {
    Alert.alert('Merge Complaint', `Merge this into "#${parentId}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Merge', style: 'destructive', onPress: async () => {
        setActionLoading(true);
        try {
          const data = await issuesAPI.merge(complaint!.id, parentId);
          setComplaint(prev => prev ? { ...prev, ...data.complaint } : prev);
          setMergeModal(false);
        } catch (err: any) { Alert.alert('Error', err.message); }
        finally { setActionLoading(false); }
      }},
    ]);
  }

  async function handlePostUpdate() {
    if (!complaint || !officialUpdate.trim()) return;
    setPostingUpdate(true);
    try {
      const data = await issuesAPI.addComment(complaint.id, officialUpdate.trim());
      setComments(prev => [...prev, data.comment]);
      setOfficialUpdate('');
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setPostingUpdate(false); }
  }

  if (loading) return <ActivityIndicator size="large" color={Colors.primary} style={styles.center} />;
  if (!complaint) return null;

  const borderColor = (Colors.status as any)[complaint.status] || Colors.border;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container}>
        {/* Dark Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complaint #{complaint.id}</Text>
          <View style={{ width: 50 }} />
        </View>

        {complaint.is_merged && (
          <View style={styles.mergedBanner}>
            <Text style={styles.mergedText}>⚠️ Merged into #{complaint.parent_complaint_id}</Text>
          </View>
        )}

        <View style={styles.content}>
          {/* Info Card */}
          <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: borderColor }]}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardTitle}>{complaint.category || 'General'}</Text>
              <StatusBadge status={complaint.status} />
            </View>
            <InfoRow label="📝 Description" value={complaint.description} />
            <InfoRow label="👤 Reported By" value={complaint.reporter_name} />
            {complaint.location && <InfoRow label="📍 Location" value={complaint.location} />}
            <InfoRow label="👷 Assigned Worker" value={complaint.assigned_worker_name || 'Not assigned'} />
            <InfoRow label="✅ Confirmations" value={`${complaint.confirmation_count} community member(s)`} />
            <InfoRow label="🕐 Submitted" value={new Date(complaint.created_at).toLocaleString()} />
          </View>

          {/* Photos */}
          {complaint.image_url ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Complaint Photo</Text>
              <Image source={{ uri: complaint.image_url }} style={styles.photo} resizeMode="cover" />
            </View>
          ) : null}

          {complaint.proof_image_url ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>✅ Proof of Completion</Text>
              <Image source={{ uri: complaint.proof_image_url }} style={styles.photo} resizeMode="cover" />
            </View>
          ) : null}

          {/* Actions */}
          {!complaint.is_merged && (
            <View style={styles.actionsCard}>
              <Text style={styles.sectionTitle}>Actions</Text>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setAssignModal(true)} disabled={actionLoading}>
                <Text style={styles.actionBtnText}>👷 {complaint.assigned_worker_name ? 'Reassign Worker' : 'Assign Worker'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtnOutline} onPress={() => setStatusModal(true)} disabled={actionLoading}>
                <Text style={styles.actionBtnOutlineText}>🔄 Change Status</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtnGold} onPress={() => setMergeModal(true)} disabled={actionLoading}>
                <Text style={styles.actionBtnText}>🔀 Merge as Duplicate</Text>
              </TouchableOpacity>
              {complaint.status === 'resolved' && (
                <TouchableOpacity style={styles.actionBtnDanger} onPress={handleClose} disabled={actionLoading}>
                  <Text style={styles.actionBtnText}>✕ Close Complaint</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Official Update */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Official Update</Text>
            <TextInput
              style={styles.textarea}
              value={officialUpdate}
              onChangeText={setOfficialUpdate}
              placeholder="Post an official update visible to the reporter…"
              placeholderTextColor={Colors.textLight}
              multiline numberOfLines={3} textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.actionBtn, (!officialUpdate.trim() || postingUpdate) && styles.btnDisabled]}
              onPress={handlePostUpdate}
              disabled={postingUpdate || !officialUpdate.trim()}
            >
              <Text style={styles.actionBtnText}>{postingUpdate ? 'Posting…' : 'Post Official Update'}</Text>
            </TouchableOpacity>
          </View>

          {/* Comments */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notes ({comments.length})</Text>
            {comments.length === 0 && <Text style={styles.empty}>No comments yet.</Text>}
            {comments.map(c => (
              <View key={c.id} style={[styles.commentItem, c.is_official && styles.officialComment]}>
                {c.is_official && <Text style={styles.officialLabel}>OFFICIAL UPDATE</Text>}
                <Text style={styles.commentAuthor}>{c.author_name}</Text>
                <Text style={styles.commentText}>{c.text}</Text>
                <Text style={styles.commentDate}>{new Date(c.created_at).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Assign Modal */}
        <Modal visible={assignModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Worker</Text>
                <TouchableOpacity onPress={() => setAssignModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              {workers.length === 0 ? <Text style={styles.empty}>No workers available.</Text> : (
                <FlatList data={workers} keyExtractor={w => w.id} renderItem={({ item }) => (
                  <TouchableOpacity style={styles.listItem} onPress={() => handleAssign(item.id, item.name)}>
                    <View style={styles.workerAvatar}>
                      <Text style={styles.workerAvatarText}>{item.name[0]}</Text>
                    </View>
                    <View>
                      <Text style={styles.listItemTitle}>{item.name}</Text>
                      <Text style={styles.listItemSub}>{item.email}</Text>
                    </View>
                  </TouchableOpacity>
                )} />
              )}
            </View>
          </View>
        </Modal>

        {/* Status Modal */}
        <Modal visible={statusModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Change Status</Text>
                <TouchableOpacity onPress={() => setStatusModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              {STATUSES.map(s => {
                const color = (Colors.status as any)[s] || Colors.textLight;
                const bg = (Colors.statusLight as any)[s] || '#F5F5F5';
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusItem, complaint.status === s && { backgroundColor: color }]}
                    onPress={() => handleStatusChange(s)}
                  >
                    <Text style={[styles.statusItemText, complaint.status === s && { color: Colors.white }]}>
                      {STATUS_LABELS[s]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Modal>

        {/* Merge Modal */}
        <Modal visible={mergeModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Merge as Duplicate</Text>
                <TouchableOpacity onPress={() => setMergeModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>Select the original complaint:</Text>
              {allComplaints.length === 0 ? <Text style={styles.empty}>No other complaints available.</Text> : (
                <FlatList data={allComplaints} keyExtractor={c => c.id} renderItem={({ item }) => (
                  <TouchableOpacity style={styles.listItem} onPress={() => handleMerge(item.id, item.description)}>
                    <Text style={styles.listItemTitle}>#{item.id} — {item.description.slice(0, 50)}</Text>
                    <Text style={styles.listItemSub}>{item.reporter_name} · {item.status}</Text>
                  </TouchableOpacity>
                )} />
              )}
            </View>
          </View>
        </Modal>
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
    borderLeftColor: Colors.warning, padding: Spacing.md, margin: Spacing.md, borderRadius: Radius.sm,
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

  photo: { width: '100%', height: 220, borderRadius: Radius.md, marginTop: Spacing.sm },
  sectionTitle: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },

  actionsCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.sm,
  },
  actionBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  actionBtnOutline: { borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  actionBtnGold: { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  actionBtnDanger: { backgroundColor: Colors.error, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  actionBtnText: { color: Colors.white, fontSize: Fonts.sizes.md, fontWeight: '700' },
  actionBtnOutlineText: { color: Colors.primary, fontSize: Fonts.sizes.md, fontWeight: '700' },

  textarea: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    padding: Spacing.md, fontSize: Fonts.sizes.md, color: Colors.text,
    backgroundColor: Colors.surfaceAlt, height: 90, marginBottom: Spacing.sm,
  },

  commentItem: { borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: Spacing.md },
  officialComment: {
    backgroundColor: Colors.primary + '08', borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm, borderBottomWidth: 0,
    marginBottom: Spacing.xs, borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  officialLabel: { fontSize: Fonts.sizes.xs, fontWeight: '800', color: Colors.primary, marginBottom: 4 },
  commentAuthor: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.secondary },
  commentText: { fontSize: Fonts.sizes.md, color: Colors.text, marginTop: 3 },
  commentDate: { fontSize: Fonts.sizes.xs, color: Colors.textLight, marginTop: 4 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginVertical: Spacing.lg },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.lg, maxHeight: '75%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.secondary },
  modalClose: { fontSize: Fonts.sizes.xl, color: Colors.textSecondary },
  modalSubtitle: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginBottom: Spacing.md },

  listItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md },
  workerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center' },
  workerAvatarText: { color: Colors.accent, fontWeight: '700', fontSize: Fonts.sizes.lg },
  listItemTitle: { fontSize: Fonts.sizes.md, fontWeight: '600', color: Colors.text },
  listItemSub: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },

  statusItem: { padding: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.xs, backgroundColor: Colors.surfaceAlt, alignItems: 'center' },
  statusItemText: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.text },
});