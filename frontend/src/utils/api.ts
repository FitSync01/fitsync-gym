import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

class ApiClient {
  private token: string | null = null;

  async setToken(token: string) {
    this.token = token;
    await AsyncStorage.setItem('access_token', token);
  }

  async getToken(): Promise<string | null> {
    if (!this.token) {
      this.token = await AsyncStorage.getItem('access_token');
    }
    return this.token;
  }

  async clearToken() {
    this.token = null;
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('refresh_token');
  }

  async request(path: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    if (res.status === 401) {
      await this.clearToken();
      throw new Error('Unauthorized');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const detail = err.detail;
      if (typeof detail === 'string') throw new Error(detail);
      if (Array.isArray(detail)) throw new Error(detail.map((e: any) => e.msg || JSON.stringify(e)).join(' '));
      throw new Error(`Error ${res.status}`);
    }
    return res.json();
  }

  get(path: string) { return this.request(path); }
  post(path: string, data?: any) { return this.request(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }); }
  put(path: string, data?: any) { return this.request(path, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }); }
  del(path: string) { return this.request(path, { method: 'DELETE' }); }
}

export const api = new ApiClient();
