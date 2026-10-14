import { supabase } from '../lib/supabase';
import { emailReminderService } from './emailReminderService';

export const authService = {
  // Login menggunakan Supabase Auth (Mendukung Email atau Username)
  async login(emailOrUsername, password) {
    let emailToUse = (emailOrUsername || '').trim();

    // Jika user menginput username tanpa domain @, gunakan format @umaratax.com
    if (!emailToUse.includes('@')) {
      const cleanUsername = emailToUse.toLowerCase();
      // Cek apakah ada email pribadi terdaftar untuk username ini di tabel users
      const { data: userRow } = await supabase
        .from('users')
        .select('username, email_pribadi')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (userRow?.email_pribadi && userRow.email_pribadi.includes('@')) {
        // Coba login dulu dengan format @umaratax.com, jika gagal login UI akan memberikan feedback
        emailToUse = `${cleanUsername}@umaratax.com`;
      } else {
        emailToUse = `${cleanUsername}@umaratax.com`;
      }
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Email/Username atau password salah.');
    }

    // Ambil detail profile dari public.users (karena id di tabel users berelasi dengan auth.users.id)
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('id, username, name, role')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profileData) {
      throw new Error('Data profil tidak ditemukan di database.');
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

  // Register / Pendaftaran Pengguna Baru (Password Default: 123456, Role Default: Staff)
  async register({ name, username, emailPribadi, phone = '' }) {
    const cleanUsername = (username || '').replace(/@umaratax\.com$/i, '').replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase().trim();

    if (!cleanUsername) {
      throw new Error('Username tidak valid atau hanya mengandung simbol.');
    }

    if (cleanUsername.length < 3) {
      throw new Error('Username minimal terdiri dari 3 karakter.');
    }

    if (!emailPribadi || !emailPribadi.includes('@')) {
      throw new Error('Email pribadi wajib diisi untuk pengiriman kredensial dan verifikasi akun.');
    }

    const cleanEmailPribadi = emailPribadi.trim().toLowerCase();
    const authEmail = `${cleanUsername}@umaratax.com`;
    const defaultPassword = '123456';
    const defaultRole = 'Staff';

    // 1. Cek apakah username sudah ada di tabel public.users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (existingUser) {
      throw new Error(`Username "${cleanUsername}" sudah digunakan. Silakan gunakan username lain.`);
    }

    // 2. Mendaftarkan user ke Supabase Auth dengan password default 123456
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: authEmail,
      password: defaultPassword,
      options: {
        data: {
          username: cleanUsername,
          name: name.trim(),
          role: defaultRole,
        },
      },
    });

    if (authError) {
      if (authError.message?.toLowerCase().includes('already registered')) {
        throw new Error(`Username/Email "${cleanUsername}" sudah terdaftar di sistem auth.`);
      }
      throw new Error(authError.message || 'Gagal melakukan pendaftaran akun.');
    }

    const authUserId = authData?.user?.id;
    if (!authUserId) {
      throw new Error('Tidak dapat memperoleh ID user dari server autentikasi.');
    }

    // 3. Sinkronisasi ke tabel public.users
    // Beri jeda sejenak untuk trigger Postgres
    await new Promise((r) => setTimeout(r, 600));

    const { data: inDb } = await supabase
      .from('users')
      .select('id, username, name, role')
      .eq('id', authUserId)
      .maybeSingle();

    let finalUser = inDb;

    // Jika trigger belum memasukkan data, insert langsung menggunakan authUserId
    if (!finalUser) {
      const { data: insertedUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUserId,
          username: cleanUsername,
          name: name.trim(),
          role: defaultRole,
          poin: 0,
          no_telepon: phone.trim() || null,
          email_pribadi: cleanEmailPribadi,
        })
        .select('id, username, name, role')
        .single();

      if (insertError) {
        console.warn('Fallback user insert warning:', insertError.message);
        finalUser = {
          id: authUserId,
          username: cleanUsername,
          name: name.trim(),
          role: defaultRole,
        };
      } else {
        finalUser = insertedUser;
      }
    } else {
      await supabase.from('users').update({
        no_telepon: phone.trim() || null,
        email_pribadi: cleanEmailPribadi,
      }).eq('id', authUserId);
    }

    // 4. Pastikan sesi pendaftaran di-logout agar user login pertama kali dengan password default 123456
    await supabase.auth.signOut();
    localStorage.removeItem('user');

    // 5. Kirim email kredensial ke email pribadi via MailerSend
    let emailSent = false;
    try {
      const sendRes = await emailReminderService.sendNewAccountCredentials({
        name: name.trim(),
        username: cleanUsername,
        emailPribadi: cleanEmailPribadi,
        defaultPassword,
      });
      emailSent = sendRes?.ok || false;
    } catch (mailErr) {
      console.warn('Gagal mengirim email kredensial:', mailErr);
    }

    return {
      username: cleanUsername,
      name: name.trim(),
      emailPribadi: cleanEmailPribadi,
      defaultPassword,
      role: defaultRole,
      emailSent,
    };
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
