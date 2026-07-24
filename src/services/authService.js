import { supabase } from '../lib/supabase';

export const authService = {
  // Login — cek username + password dari tabel users
  async login(username, password) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, name, role, password')
      .eq('username', username)
      .single();

    if (error || !data) {
      throw new Error('Username atau password salah.');
    }

    // Cek password (plain text untuk development)
    if (data.password !== password) {
      throw new Error('Username atau password salah.');
    }

    // Return user tanpa password
    const user = { id: data.id, username: data.username, name: data.name, role: data.role };
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  },

  // Logout
  logout() {
    localStorage.removeItem('user');
  },

  // Get current user dari localStorage
  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
};
