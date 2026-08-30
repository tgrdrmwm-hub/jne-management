import { supabase } from '../lib/supabase';

export const authService = {
  // Login menggunakan Supabase Auth
  async login(email, password) {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Username atau password salah.');
    }

    // Ambil detail profile dari public.users (karena id di tabel users berelasi dengan auth.users.id)
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('id, username, name, role')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profileData) {
      throw new Error('Data profil tidak ditemukan.');
    }

    const user = { 
      id: profileData.id, 
      username: profileData.username, 
      name: profileData.name, 
      role: profileData.role 
    };
    
    // Kita tetap pakai localStorage agar sejalan dengan redux state awal
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  },

  // Logout dari Supabase Auth
  async logout() {
    await supabase.auth.signOut();
    localStorage.removeItem('user');
  },

  // Ganti Password
  async updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw new Error(error.message);
    return data;
  },

  // Mendapatkan sesi / user saat ini
  async getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      localStorage.removeItem('user');
      return null;
    }
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // [Hanya untuk Development] Membuat Mock Users ke Auth
  async seedUsers(mockUsers) {
    let successCount = 0;
    
    for (const u of mockUsers) {
      const email = u.email;
      const { data, error } = await supabase.auth.signUp({
        email,
        password: u.password,
        options: {
          data: {
            username: email.split('@')[0],
            name: u.name,
            role: u.role
          }
        }
      });
      
      // Mengabaikan error "User already registered" agar bisa di-run berulang kali
      if (!error) {
        successCount++;
      } else if (error.message.includes('already registered')) {
        successCount++;
      }
    }
    
    return successCount;
  }
};
