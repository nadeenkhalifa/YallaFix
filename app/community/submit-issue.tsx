import { useEffect, useState } from 'react';
import {
  Alert, Image, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { issuesAPI, categoriesAPI, locationsAPI } from '@/services/api';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

interface Category { id: string; name: string; description: string | null; }
interface Location { id: string; name: string; building: string | null; }

export default function SubmitIssueScreen() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [roomNumber, setRoomNumber] = useState('');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showCats, setShowCats] = useState(false);
  const [showLocs, setShowLocs] = useState(false);

  useEffect(() => {
    categoriesAPI.getAll().then(d => setCategories(d.categories)).catch(() => {});
    locationsAPI.getAll().then(d => setLocations(d.locations)).catch(() => {});
  }, []);

  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Camera access is needed to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'] as any,
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhoto(result.assets[0]);
    }
  }

  async function handleSubmit() {
    if (!description.trim()) { Alert.alert('Required', 'Please describe the issue.'); return; }
    if (!selectedCategory) { Alert.alert('Required', 'Please select a category.'); return; }
    if (!selectedLocation) { Alert.alert('Required', 'Please select a location.'); return; }
    if (!photo) { Alert.alert('Photo Required', 'Please take a photo of the issue.'); return; }
    setLoading(true);
    try {
      await issuesAPI.submit({
        description: description.trim(),
        category_id: selectedCategory.id,
        location_id: selectedLocation.id,
        room_number: roomNumber.trim() || null,
        photo: { uri: photo.uri, type: photo.mimeType ?? 'image/jpeg', name: photo.fileName ?? 'photo.jpg' },
      });
      Alert.alert('✅ Submitted!', 'Your complaint has been submitted successfully.', [
        { text: 'OK', onPress: () => router.replace('/community/my-issues') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Dark Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Complaint</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={styles.content}>
          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={styles.textarea}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the issue in detail…"
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.label}>Category *</Text>
            <TouchableOpacity
              style={[styles.picker, selectedCategory && styles.pickerSelected]}
              onPress={() => { setShowCats(!showCats); setShowLocs(false); }}
            >
              <Text style={selectedCategory ? styles.pickerValue : styles.pickerPlaceholder}>
                {selectedCategory ? selectedCategory.name : 'Select a category…'}
              </Text>
              <Text style={styles.pickerArrow}>{showCats ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showCats && (
              <ScrollView style={styles.dropdown} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {categories.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.dropdownItem, selectedCategory?.id === c.id && styles.dropdownItemActive]}
                    onPress={() => { setSelectedCategory(c); setShowCats(false); }}
                  >
                    <Text style={[styles.dropdownText, selectedCategory?.id === c.id && styles.dropdownTextActive]}>
                      {c.name}
                    </Text>
                    {c.description ? <Text style={styles.dropdownSub}>{c.description}</Text> : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.label}>Location *</Text>
            <TouchableOpacity
              style={[styles.picker, selectedLocation && styles.pickerSelected]}
              onPress={() => { setShowLocs(!showLocs); setShowCats(false); }}
            >
              <Text style={selectedLocation ? styles.pickerValue : styles.pickerPlaceholder}>
                {selectedLocation ? selectedLocation.name : 'Select a location…'}
              </Text>
              <Text style={styles.pickerArrow}>{showLocs ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showLocs && (
              <ScrollView style={styles.dropdown} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {locations.map(l => (
                  <TouchableOpacity
                    key={l.id}
                    style={[styles.dropdownItem, selectedLocation?.id === l.id && styles.dropdownItemActive]}
                    onPress={() => { setSelectedLocation(l); setShowLocs(false); }}
                  >
                    <View style={styles.dropdownRow}>
                      <Text style={[styles.dropdownText, selectedLocation?.id === l.id && styles.dropdownTextActive]}>
                        {l.name}
                      </Text>
                      {l.building ? (
                        <View style={styles.buildingTag}>
                          <Text style={styles.buildingTagText}>Bldg {l.building}</Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Room Number */}
          <View style={styles.section}>
            <Text style={styles.label}>Room Number <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              value={roomNumber}
              onChangeText={setRoomNumber}
              placeholder="e.g. 305, Lab 2, A-101…"
              placeholderTextColor={Colors.textLight}
            />
          </View>

          {/* Photo */}
          <View style={styles.section}>
            <Text style={styles.label}>Photo *</Text>
            <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
              {photo ? (
                <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoIcon}>📷</Text>
                  <Text style={styles.photoBtnText}>Take Photo of Issue</Text>
                  <Text style={styles.photoHint}>Required — tap to open camera</Text>
                </View>
              )}
            </TouchableOpacity>
            {photo && (
              <TouchableOpacity onPress={handleTakePhoto}>
                <Text style={styles.retakeText}>🔄 Retake Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitText}>{loading ? 'Submitting…' : 'Submit Complaint'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md,
    backgroundColor: Colors.secondary,
  },
  back: { color: Colors.accent, fontSize: Fonts.sizes.md, fontWeight: '600' },
  headerTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.white },

  content: { padding: Spacing.md, paddingBottom: 40 },
  section: { marginBottom: Spacing.md },
  label: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  optional: { fontWeight: '400', color: Colors.textSecondary },

  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 13,
    fontSize: Fonts.sizes.md, color: Colors.text, backgroundColor: Colors.surface,
  },
  textarea: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: Fonts.sizes.md, color: Colors.text, backgroundColor: Colors.surface,
    height: 110,
  },

  picker: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 13,
    backgroundColor: Colors.surface,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerSelected: { borderColor: Colors.primary },
  pickerValue: { fontSize: Fonts.sizes.md, color: Colors.text, fontWeight: '600' },
  pickerPlaceholder: { fontSize: Fonts.sizes.md, color: Colors.textLight },
  pickerArrow: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },

  dropdown: {
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.md,
    backgroundColor: Colors.surface, marginTop: 4, maxHeight: 240,
  },
  dropdownItem: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownItemActive: { backgroundColor: Colors.primary + '12' },
  dropdownText: { fontSize: Fonts.sizes.md, color: Colors.text },
  dropdownTextActive: { color: Colors.primary, fontWeight: '700' },
  dropdownSub: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
  dropdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buildingTag: { backgroundColor: Colors.secondary, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  buildingTagText: { color: Colors.white, fontSize: Fonts.sizes.xs, fontWeight: '700' },

  photoBtn: {
    borderRadius: Radius.md, overflow: 'hidden',
    borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed',
  },
  photoPlaceholder: { alignItems: 'center', padding: Spacing.xl, backgroundColor: Colors.surfaceAlt },
  photoIcon: { fontSize: 40, marginBottom: Spacing.sm },
  photoBtnText: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.secondary },
  photoHint: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 4 },
  photoPreview: { width: '100%', height: 220 },
  retakeText: { color: Colors.primary, fontSize: Fonts.sizes.sm, textAlign: 'center', marginTop: Spacing.sm, fontWeight: '600' },

  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 15, alignItems: 'center', marginTop: Spacing.sm,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: Colors.white, fontSize: Fonts.sizes.md, fontWeight: '700' },
});