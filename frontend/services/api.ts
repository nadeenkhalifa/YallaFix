import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.1.4:3000/api';

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('token');
}

async function request(method: string, path: string, body?: object): Promise<any> {
  const token = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function uploadForm(method: string, path: string, formData: FormData): Promise<any> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const authAPI = {
  login: (email: string, password: string) =>
    request('POST', '/auth/login', { email, password }),

  register: (name: string, email: string, password: string, role: string) =>
    request('POST', '/auth/register', { name, email, password, role }),

  logout: () => request('POST', '/auth/logout'),

  forgotPassword: (email: string) =>
    request('POST', '/auth/passwordReset/forgotPassword', { email }),
};

export const issuesAPI = {
  getMy: () => request('GET', '/complaints/my'),

  getAssigned: () => request('GET', '/complaints/assigned'),

  getAll: () => request('GET', '/complaints'),

  getById: (id: string) => request('GET', `/complaints/${id}`),

  submit: async (data: {
    description: string;
    category_id: string | null;
    location_id: string;
    room_number: string | null;
    photo: { uri: string; type: string; name: string };
  }) => {
    const formData = new FormData();
    formData.append('description', data.description);
    formData.append('location_id', data.location_id);
    if (data.category_id) formData.append('category_id', data.category_id);
    if (data.room_number) formData.append('room_number', data.room_number);
    formData.append('photo', { uri: data.photo.uri, type: data.photo.type, name: data.photo.name } as any);
    return uploadForm('POST', '/complaints', formData);
  },

  confirm: (id: string) => request('POST', `/complaints/${id}/confirm`),

  unconfirm: (id: string) => request('DELETE', `/complaints/${id}/confirm`),

  addComment: (id: string, comment: string) =>
    request('POST', `/complaints/${id}/comments`, { comment }),

  assign: (id: string, workerId: string) =>
    request('PUT', `/complaints/${id}/assign`, { worker_id: workerId }),

  updateStatus: (id: string, status: string) =>
    request('PUT', `/complaints/${id}/status`, { status }),

  merge: (id: string, parentId: string) =>
    request('POST', `/complaints/${id}/merge`, { parent_id: parentId }),

  close: (id: string) => request('PUT', `/complaints/${id}/close`),

  delete: (id: string) => request('DELETE', `/complaints/${id}`),

  uploadProof: async (id: string, photo: { uri: string; type: string; name: string }) => {
    const formData = new FormData();
    formData.append('photo', { uri: photo.uri, type: photo.type, name: photo.name } as any);
    return uploadForm('POST', `/complaints/${id}/proof`, formData);
  },
};

export const notificationsAPI = {
  getAll: () => request('GET', '/notifications'),
  markRead: (id: string) => request('PATCH', `/notifications/${id}/read`),
  markAllRead: () => request('PATCH', '/notifications/read-all'),
};

export const managerAPI = {
  getWorkers: () => request('GET', '/manager/workers'),
};

export const categoriesAPI = {
  getAll: () => request('GET', '/admin/categories'),
  create: (name: string) => request('POST', '/admin/categories', { name }),
  update: (id: string, name: string) => request('PUT', `/admin/categories/${id}`, { name }),
  delete: (id: string) => request('DELETE', `/admin/categories/${id}`),
};

export const locationsAPI = {
  getAll: () => request('GET', '/admin/locations'),
  create: (name: string) => request('POST', '/admin/locations', { name }),
  update: (id: string, name: string) => request('PUT', `/admin/locations/${id}`, { name }),
  delete: (id: string) => request('DELETE', `/admin/locations/${id}`),
};

export const adminAPI = {
  getUsers: () => request('GET', '/admin/users'),
  createUser: (name: string, email: string, password: string, role: string) =>
    request('POST', '/admin/users', { name, email, password, role }),
  setStatus: (id: string, is_active: boolean) =>
    request('PUT', `/admin/users/${id}/status`, { is_active }),
  setRole: (id: string, role: string) =>
    request('PUT', `/admin/users/${id}/role`, { role }),
  resetPassword: (id: string, new_password: string) =>
    request('POST', `/admin/users/${id}/reset-password`, { new_password }),
  getActivityLogs: () => request('GET', '/admin/activity-logs'),
};
