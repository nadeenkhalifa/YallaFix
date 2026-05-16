import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { adminAPI, categoriesAPI, locationsAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type Tab = 'users' | 'categories' | 'locations' | 'logs';

const ROLES = ['Community Member', 'Facility Manager', 'Worker', 'Admin'];

interface User { id: string; name: string; email: string; role: string; is_active: boolean; }
interface Item { id: string; name: string; }
interface Log { id: string; action: string; entity_type: string | null; entity_id: number | null; details: string | null; user_name: string | null; user_role: string | null; created_at: string; }

export default function AdminDashboard() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Item[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [addUserModal, setAddUserModal] = useState(false);
  const [roleModal, setRoleModal] = useState<User | null>(null);
  const [resetModal, setResetModal] = useState<User | null>(null);
  const [addItemModal, setAddItemModal] = useState<'category' | 'location' | null>(null);
  const [editItemModal, setEditItemModal] = useState<{ type: 'category' | 'location'; item: Item } | null>(null);

  // Form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Community Member');
  const [newItemName, setNewItemName] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [u, c, l, g] = await Promise.all([
        adminAPI.getUsers(),
        categoriesAPI.getAll(),
        locationsAPI.getAll(),
        adminAPI.getActivityLogs(),
      ]);
      setUsers(u.users);
      setCategories(c.categories);
      setLocations(l.locations);
      setLogs(g.logs);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // --- Users ---
  async function handleAddUser() {
    if (!newName || !newEmail || !newPassword) { Alert.alert('Required', 'Fill in all fields'); return; }
    setSaving(true);
    try {
      const data = await adminAPI.createUser(newName, newEmail, newPassword, newRole);
      setUsers(prev => [data.user, ...prev]);
      setAddUserModal(false);
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('Community Member');
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  }

  async function handleToggleStatus(u: User) {
    try {
      const data = await adminAPI.setStatus(u.id, !u.is_active);
      setUsers(prev => prev.map(x => x.id === u.id ? data.user : x));
    } catch (err: any) { Alert.alert('Error', err.message); }
  }

  async function handleSetRole(u: User, role: string) {
    try {
      const data = await adminAPI.setRole(u.id, role);
      setUsers(prev => prev.map(x => x.id === u.id ? data.user : x));
      setRoleModal(null);
    } catch (err: any) { Alert.alert('Error', err.message); }
  }

  async function handleResetPassword() {
    if (!resetModal || !resetPassword || resetPassword.length < 6) {
      Alert.alert('Required', 'Password must be at least 6 characters'); return;
    }
    setSaving(true);
    try {
      await adminAPI.resetPassword(resetModal.id, resetPassword);
      Alert.alert('Done', 'Password reset successfully');
      setResetModal(null); setResetPassword('');
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  }

  // --- Categories / Locations ---
  async function handleAddItem() {
    if (!newItemName.trim()) { Alert.alert('Required', 'Enter a name'); return; }
    setSaving(true);
    try {
      if (addItemModal === 'category') {
        const data = await categoriesAPI.create(newItemName.trim());
        setCategories(prev => [...prev, data.category].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        const data = await locationsAPI.create(newItemName.trim());
        setLocations(prev => [...prev, data.location].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setAddItemModal(null); setNewItemName('');
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  }

  async function handleEditItem() {
    if (!editItemModal || !newItemName.trim()) return;
    setSaving(true);
    try {
      if (editItemModal.type === 'category') {
        const data = await categoriesAPI.update(editItemModal.item.id, newItemName.trim());
        setCategories(prev => prev.map(c => c.id === editItemModal.item.id ? data.category : c));
      } else {
        const data = await locationsAPI.update(editItemModal.item.id, newItemName.trim());
        setLocations(prev => prev.map(l => l.id === editItemModal.item.id ? data.location : l));
      }
      setEditItemModal(null); setNewItemName('');
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteItem(type: 'category' | 'location', item: Item) {
    Alert.alert('Delete', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          if (type === 'category') {
            await categoriesAPI.delete(item.id);
            setCategories(prev => prev.filter(c => c.id !== item.id));
          } else {
            await locationsAPI.delete(item.id);
            setLocations(prev => prev.filter(l => l.id !== item.id));
          }
        } catch (err: any) { Alert.alert('Error', err.message); }
      }},
    ]);
  }

  function renderUser({ item }: { item: User }) {
    return (
      <View style={styles.listRow}>
        <View style={styles.listRowInfo}>
          <Text style={styles.listRowTitle}>{item.name}</Text>
          <Text style={styles.listRowSub}>{item.email}</Text>
          <Text style={styles.listRowSub}>{item.role}</Text>
        </View>
        <View style={styles.listRowActions}>
          <TouchableOpacity style={styles.chipBtn} onPress={() => { setRoleModal(item); }}>
            <Text style={styles.chipBtnText}>Role</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chipBtn} onPress={() => { setResetModal(item); }}>
            <Text style={styles.chipBtnText}>Reset PW</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chipBtn, item.is_active ? styles.chipBtnDanger : styles.chipBtnSuccess]}
            onPress={() => handleToggleStatus(item)}
          >
            <Text style={styles.chipBtnText}>{item.is_active ? 'Deactivate' : 'Activate'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderItem(type: 'category' | 'location') {
    const data = type === 'category' ? categories : locations;
    return ({ item }: { item: Item }) => (
      <View style={styles.listRow}>
        <Text style={[styles.listRowTitle, { flex: 1 }]}>{item.name}</Text>
        <View style={styles.listRowActions}>
          <TouchableOpacity style={styles.chipBtn} onPress={() => { setNewItemName(item.name); setEditItemModal({ type, item }); }}>
            <Text style={styles.chipBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chipBtn, styles.chipBtnDanger]} onPress={() => handleDeleteItem(type, item)}>
            <Text style={styles.chipBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderLog({ item }: { item: Log }) {
    return (
      <View style={styles.logRow}>
        <Text style={styles.logAction}>{item.action.replace(/_/g, ' ')}</Text>
        <Text style={styles.logMeta}>
          {item.user_name || 'System'} · {item.entity_type} #{item.entity_id}
          {item.details ? ` · ${item.details}` : ''}
        </Text>
        <Text style={styles.logDate}>{new Date(item.created_at).toLocaleString()}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Admin Panel</Text>
          <Text style={styles.subheading}>Hello, {user?.name}</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(['users', 'categories', 'locations', 'logs'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'logs' ? 'Activity' : t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.center} />
      ) : (
        <>
          {tab === 'users' && (
            <>
              <TouchableOpacity style={styles.addBtn} onPress={() => setAddUserModal(true)}>
                <Text style={styles.addBtnText}>+ Add User</Text>
              </TouchableOpacity>
              <FlatList
                data={users}
                keyExtractor={u => u.id}
                renderItem={renderUser}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} />}
                ListEmptyComponent={<Text style={styles.empty}>No users found.</Text>}
              />
            </>
          )}

          {tab === 'categories' && (
            <>
              <TouchableOpacity style={styles.addBtn} onPress={() => { setNewItemName(''); setAddItemModal('category'); }}>
                <Text style={styles.addBtnText}>+ Add Category</Text>
              </TouchableOpacity>
              <FlatList
                data={categories}
                keyExtractor={c => c.id}
                renderItem={renderItem('category')}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.empty}>No categories yet.</Text>}
              />
            </>
          )}

          {tab === 'locations' && (
            <>
              <TouchableOpacity style={styles.addBtn} onPress={() => { setNewItemName(''); setAddItemModal('location'); }}>
                <Text style={styles.addBtnText}>+ Add Location</Text>
              </TouchableOpacity>
              <FlatList
                data={locations}
                keyExtractor={l => l.id}
                renderItem={renderItem('location')}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.empty}>No locations yet.</Text>}
              />
            </>
          )}

          {tab === 'logs' && (
            <FlatList
              data={logs}
              keyExtractor={l => l.id}
              renderItem={renderLog}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} />}
              ListEmptyComponent={<Text style={styles.empty}>No activity yet.</Text>}
            />
          )}
        </>
      )}

      {/* Add User Modal */}
      <Modal visible={addUserModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Add New User</Text>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Name" placeholderTextColor={Colors.textLight} />
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput style={styles.input} value={newEmail} onChangeText={setNewEmail} placeholder="email@example.com" placeholderTextColor={Colors.textLight} autoCapitalize="none" keyboardType="email-address" />
            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="Min 6 characters" placeholderTextColor={Colors.textLight} secureTextEntry />
            <Text style={styles.fieldLabel}>Role</Text>
            <View style={styles.roleRow}>
              {ROLES.map(r => (
                <TouchableOpacity key={r} style={[styles.roleChip, newRole === r && styles.roleChipActive]} onPress={() => setNewRole(r)}>
                  <Text style={[styles.roleChipText, newRole === r && styles.roleChipTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.modalBtn, saving && styles.modalBtnDisabled]} onPress={handleAddUser} disabled={saving}>
              <Text style={styles.modalBtnText}>{saving ? 'Creating…' : 'Create User'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddUserModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Role Modal */}
      <Modal visible={!!roleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Change Role for {roleModal?.name}</Text>
            {ROLES.map(r => (
              <TouchableOpacity key={r} style={[styles.listItem, roleModal?.role === r && styles.listItemActive]} onPress={() => roleModal && handleSetRole(roleModal, r)}>
                <Text style={[styles.listItemText, roleModal?.role === r && styles.listItemTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setRoleModal(null)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reset Password Modal */}
      <Modal visible={!!resetModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Reset Password for {resetModal?.name}</Text>
            <TextInput
              style={styles.input}
              value={resetPassword}
              onChangeText={setResetPassword}
              placeholder="New password (min 6 chars)"
              placeholderTextColor={Colors.textLight}
              secureTextEntry
            />
            <TouchableOpacity style={[styles.modalBtn, saving && styles.modalBtnDisabled]} onPress={handleResetPassword} disabled={saving}>
              <Text style={styles.modalBtnText}>{saving ? 'Resetting…' : 'Reset Password'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setResetModal(null); setResetPassword(''); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Item Modal */}
      <Modal visible={!!addItemModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add {addItemModal === 'category' ? 'Category' : 'Location'}</Text>
            <TextInput
              style={styles.input}
              value={newItemName}
              onChangeText={setNewItemName}
              placeholder="Name"
              placeholderTextColor={Colors.textLight}
            />
            <TouchableOpacity style={[styles.modalBtn, saving && styles.modalBtnDisabled]} onPress={handleAddItem} disabled={saving}>
              <Text style={styles.modalBtnText}>{saving ? 'Saving…' : 'Add'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setAddItemModal(null); setNewItemName(''); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal visible={!!editItemModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit {editItemModal?.type === 'category' ? 'Category' : 'Location'}</Text>
            <TextInput
              style={styles.input}
              value={newItemName}
              onChangeText={setNewItemName}
              placeholder="Name"
              placeholderTextColor={Colors.textLight}
            />
            <TouchableOpacity style={[styles.modalBtn, saving && styles.modalBtnDisabled]} onPress={handleEditItem} disabled={saving}>
              <Text style={styles.modalBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditItemModal(null); setNewItemName(''); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.lg, paddingTop: Spacing.xl + Spacing.lg,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  heading: { fontSize: Fonts.sizes.xl, fontWeight: 'bold', color: Colors.text },
  subheading: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
  logoutText: { color: Colors.primary, fontSize: Fonts.sizes.sm, fontWeight: '600' },
  tabs: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, padding: Spacing.sm, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: Colors.primary },
  addBtn: { margin: Spacing.md, backgroundColor: Colors.primary, borderRadius: Radius.sm, padding: Spacing.sm, alignItems: 'center' },
  addBtnText: { color: Colors.white, fontWeight: '700', fontSize: Fonts.sizes.md },
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  listRow: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center',
  },
  listRowInfo: { flex: 1 },
  listRowTitle: { fontSize: Fonts.sizes.md, fontWeight: '600', color: Colors.text },
  listRowSub: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
  listRowActions: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 160 },
  chipBtn: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4, marginTop: 2 },
  chipBtnDanger: { backgroundColor: Colors.error },
  chipBtnSuccess: { backgroundColor: Colors.success },
  chipBtnText: { color: Colors.white, fontSize: Fonts.sizes.xs, fontWeight: '600' },
  logRow: {
    backgroundColor: Colors.surface, borderRadius: Radius.sm, padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  logAction: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.text, textTransform: 'capitalize' },
  logMeta: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
  logDate: { fontSize: Fonts.sizes.xs, color: Colors.textLight, marginTop: 2 },
  center: { flex: 1, alignSelf: 'center' },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.xl },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg },
  modalTitle: { fontSize: Fonts.sizes.lg, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.md },
  fieldLabel: { fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.text, marginBottom: Spacing.xs, marginTop: Spacing.sm },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    padding: Spacing.sm, fontSize: Fonts.sizes.md, color: Colors.text,
    backgroundColor: Colors.white, marginBottom: Spacing.sm,
  },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.md },
  roleChip: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  roleChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleChipText: { fontSize: Fonts.sizes.sm, color: Colors.text },
  roleChipTextActive: { color: Colors.white, fontWeight: '600' },
  modalBtn: { backgroundColor: Colors.primary, borderRadius: Radius.sm, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  modalBtnDisabled: { opacity: 0.6 },
  modalBtnText: { color: Colors.white, fontWeight: '700', fontSize: Fonts.sizes.md },
  cancelBtn: { padding: Spacing.md, alignItems: 'center' },
  cancelBtnText: { color: Colors.textSecondary, fontSize: Fonts.sizes.md },
  listItem: { padding: Spacing.md, borderRadius: Radius.sm, marginBottom: Spacing.xs, backgroundColor: Colors.surfaceAlt },
  listItemActive: { backgroundColor: Colors.primary },
  listItemText: { fontSize: Fonts.sizes.md, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  listItemTextActive: { color: Colors.white },
});
