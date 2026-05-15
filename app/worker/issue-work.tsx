import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { issuesAPI } from '@/services/api';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

interface Complaint {
  id: string; description: string; category: string; location: string;
  status: string; created_at: string; reporter_name: string;
  image_url: string | null; proof_image_url: string | null;
}
interface Comment { id: string; text: string; author_name: string; is_official: boolean; created_at: string; }

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

export default function IssueWorkScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [proofPhoto, setProofPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  useEffect(() => {
    if (!id) return;
    issuesAPI.getById(id)
      .then(data => { setComplaint(data.complaint); setComments(data.comments || []); })
      .catch(err => Alert.alert('Error', err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusUpdate(status: string) {
    if (!complaint) return;
    setActionLoading(true);
    try {
      const data = await issuesAPI.updateStatus(complaint.id, status);
      setComplaint(prev => prev ? { ...prev, ...data.complaint } : prev);
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setActionLoading(false); }
  }

  async function handleAddComment() {
    if (!complaint || !comment.trim()) return;
    setActionLoading(true);
    try {
      const data = await issuesAPI.addComment(complaint.id, comment.trim());
      setComments(prev => [...prev, data.comment]);
      setComment('');
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setActionLoading(false); }
  }

  async function handlePickProof() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission Required', 'Camera access needed.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true,
    });
    if (!result.canceled) setProofPhoto(result.assets[0]);
  }

  async function handleUploadProof() {
    if (!complaint || !proofPhoto) return;
    setUploadingProof(true);
    try {
      const data = await issuesAPI.uploadProof(complaint.id, {
        uri: proofPhoto.uri, type: proofPhoto.mimeType || 'image/jpeg', name: proofPhoto.fileName || 'proof.jpg',
      });
      setComplaint(prev => prev ? { ...prev, ...data.complaint } : prev);
      setProofPhoto(null);
      Alert.alert('✅ Uploaded', 'Proof of completion uploaded!');
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setUploadingProof(false); }
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
          <Text style={styles.headerTitle}>Work on Issue</Text>
          <View style={{ width: 50 }} />
        </View>

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
          </View>

          {/* Status Actions */}
          {(complaint.status === 'open' || complaint.status === 'in_progress') && (
            <View style={styles.actionsCard}>
              <Text style={styles.sectionTitle}>Update Status</Text>
              {complaint.status === 'open' && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: Colors.status.in_progress }]}
                  onPress={() => handleStatusUpdate('in_progress')}
                  disabled={actionLoading}
                >
                  <Text style={styles.actionBtnText}>🔧 Start Working</Text>
                </TouchableOpacity>
              )}
              {complaint.status === 'in_progress' && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: Colors.success }]}
                  onPress={() => handleStatusUpdate('resolved')}
                  disabled={actionLoading}
                >
                  <Text style={styles.actionBtnText}>✅ Mark as Resolved</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Issue Photo */}
          {complaint.image_url ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Issue Photo</Text>
              <Image source={{ uri: complaint.image_url }} style={styles.photo} resizeMode="cover" />
            </View>
          ) : null}

          {/* Proof of Completion */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Proof of Completion</Text>
            {complaint.proof_image_url ? (
              <>
                <View style={styles.proofUploadedRow}>
                  <Text style={styles.proofUploadedText}>✓ Proof already uploaded</Text>
                </View>
                <Image source={{ uri: complaint.proof_image_url }} style={styles.photo} resizeMode="cover" />
              </>
            ) : proofPhoto ? (
              <>
                <Image source={{ uri: proofPhoto.uri }} style={styles.photo} resizeMode="cover" />
                <TouchableOpacity onPress={handlePickProof}>
                  <Text style={styles.retakeText}>🔄 Retake Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, uploadingProof && styles.btnDisabled]}
                  onPress={handleUploadProof}
                  disabled={uploadingProof}
                >
                  <Text style={styles.actionBtnText}>{uploadingProof ? 'Uploading…' : '⬆️ Upload Proof'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.photoBtn} onPress={handlePickProof}>
                <Text style={styles.photoBtnIcon}>📷</Text>
                <Text style={styles.photoBtnText}>Take Proof Photo</Text>
                <Text style={styles.photoBtnHint}>Tap to open camera</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Notes */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notes ({comments.length})</Text>
            {comments.length === 0 && <Text style={styles.empty}>No notes yet.</Text>}
            {comments.map(c => (
              <View key={c.id} style={[styles.commentItem, c.is_official && styles.officialComment]}>
                {c.is_official && <Text style={styles.officialLabel}>OFFICIAL UPDATE</Text>}
                <Text style={styles.commentAuthor}>{c.author_name}</Text>
                <Text style={styles.commentText}>{c.text}</Text>
                <Text style={styles.commentDate}>{new Date(c.created_at).toLocaleString()}</Text>
              </View>
            ))}
            <Text style={styles.addNoteLabel}>Add Note</Text>
            <TextInput
              style={styles.textarea}
              value={comment}
              onChangeText={setComment}
              placeholder="Write a note about this issue…"
              placeholderTextColor={Colors.textLight}
              multiline numberOfLines={3} textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.actionBtn, (!comment.trim() || actionLoading) && styles.btnDisabled]}
              onPress={handleAddComment}
              disabled={actionLoading || !comment.trim()}
            >
              <Text style={styles.actionBtnText}>Add Note</Text>
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

  actionsCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.sm,
  },
  sectionTitle: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  actionBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  actionBtnText: { color: Colors.white, fontSize: Fonts.sizes.md, fontWeight: '700' },

  photo: { width: '100%', height: 220, borderRadius: Radius.md, marginTop: Spacing.sm },
  proofUploadedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  proofUploadedText: { color: Colors.success, fontWeight: '700', fontSize: Fonts.sizes.md },
  photoBtn: {
    borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed',
    borderRadius: Radius.md, padding: Spacing.xl, alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
  },
  photoBtnIcon: { fontSize: 36, marginBottom: Spacing.sm },
  photoBtnText: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.secondary },
  photoBtnHint: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 4 },
  retakeText: { color: Colors.primary, fontSize: Fonts.sizes.sm, textAlign: 'center', marginVertical: Spacing.sm, fontWeight: '600' },

  addNoteLabel: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
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
  empty: { textAlign: 'center', color: Colors.textSecondary, marginVertical: Spacing.sm },
});