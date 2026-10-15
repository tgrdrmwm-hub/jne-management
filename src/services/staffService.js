import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { aktivitasService } from './aktivitasService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Klien dengan Service Role (jika disetel di .env) untuk bypass RPC secara langsung
const getAdminAuthClient = () => {
  if (!supabaseServiceRoleKey) return null;
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};

// Klien terisolasi agar signUp user baru TIDAK membajak/mengganti sesi login admin/developer aktif di browser
const getIsolatedAuthClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};

const BIODATA_CACHE_KEY = 'staff_biodata_local_cache';
const getLocalBiodataCache = () => {
  try {
    const raw = localStorage.getItem(BIODATA_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};
const setLocalBiodataCache = (cache) => {
  try {
    localStorage.setItem(BIODATA_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed saving staff biodata cache', e);
  }
};

const ROLE_CACHE_KEY = 'staff_role_local_cache';
export const getLocalRoleOverrides = () => {
  try {
    const raw = localStorage.getItem(ROLE_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    // Default override: user asri (id: df6c8a9c-ff86-43dc-b013-1957cd3e624c) adalah Admin
    if (!parsed['asri'] && !parsed['df6c8a9c-ff86-43dc-b013-1957cd3e624c']) {
      parsed['asri'] = 'Admin';
      parsed['df6c8a9c-ff86-43dc-b013-1957cd3e624c'] = 'Admin';
    }
    return parsed;
  } catch {
    return { asri: 'Admin', 'df6c8a9c-ff86-43dc-b013-1957cd3e624c': 'Admin' };
  }
};

export const setLocalRoleOverrides = (cache) => {
  try {
    localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed saving staff role cache', e);
  }
};

export const staffService = {
  // Ambil daftar staff dari public.users
  async getStaffList() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const localCache = getLocalBiodataCache();
    const roleOverrides = getLocalRoleOverrides();

    return (data || []).map(u => {
      const cached = localCache[u.id] || {};
      const cleanUsername = (u.username || '').replace(/@umaratax\.com$/i, '').toLowerCase();

      // Penentuan role: Cek roleOverrides (asri default Admin) atau gunakan u.role
      let effectiveRole = u.role || 'Staff';
      if (roleOverrides[u.id]) {
        effectiveRole = roleOverrides[u.id];
      } else if (roleOverrides[cleanUsername]) {
        effectiveRole = roleOverrides[cleanUsername];
      } else if (cleanUsername === 'asri') {
        effectiveRole = 'Admin';
      }

      return {
        ...u,
        role: effectiveRole,
        shift: u.shift || cached.shift || 'Shift Pagi (08:00 - 17:00)',
        no_telepon: u.no_telepon || cached.no_telepon || '',
        email_pribadi: u.email_pribadi || cached.email_pribadi || '',
        kontak_darurat_nama: u.kontak_darurat_nama || cached.kontak_darurat_nama || '',
        kontak_darurat_nomor: u.kontak_darurat_nomor || cached.kontak_darurat_nomor || '',
        kontak_darurat_hubungan: u.kontak_darurat_hubungan || cached.kontak_darurat_hubungan || 'Keluarga',
        // Pastikan username bersih tanpa duplikat domain
        cleanUsername: (u.username || '').replace(/@umaratax\.com$/i, ''),
        email: `${(u.username || '').replace(/@umaratax\.com$/i, '')}@umaratax.com`
      };
    });
  },

  // Tambah User Staff Baru
  async createStaff(staffData) {
    const cleanUsername = (staffData.username || '')
      .replace(/@umaratax\.com$/i, '')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .toLowerCase()
      .trim();

    if (!cleanUsername) {
      throw new Error('Username tidak boleh kosong atau hanya mengandung simbol.');
    }

    const email = `${cleanUsername}@umaratax.com`;
    const password = staffData.password || '123456';
    const role = staffData.role || 'Staff';
    const name = (staffData.name || '').trim();

    // 1. Cek apakah username sudah ada di tabel public.users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (existingUser) {
      throw new Error(`Username "${cleanUsername}" sudah digunakan oleh user lain.`);
    }

    // 2. Gunakan isolated auth client agar sesi admin/developer tidak ter-logout
    const isolatedClient = getIsolatedAuthClient();
    let authUserId = null;

    const { data: authData, error: authError } = await isolatedClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: cleanUsername,
          name,
          role,
        },
      },
    });

    if (authError) {
      // Jika user sudah ada di auth.users (misal pernah dibuat sebelumnya lalu dihapus dari public.users)
      if (
        authError.code === 'user_already_exists' ||
        authError.message?.toLowerCase().includes('already registered')
      ) {
        // Coba sign in sementara di isolated client untuk mengambil auth UUID yang valid
        const signInRes = await isolatedClient.auth.signInWithPassword({
          email,
          password,
        });

        if (signInRes.data?.user?.id) {
          authUserId = signInRes.data.user.id;
        } else {
          throw new Error(`Email "${email}" sudah terdaftar di auth Supabase. Silakan gunakan username lain.`);
        }
      } else {
        throw new Error(authError.message || 'Gagal mendaftarkan user ke auth.');
      }
    } else {
      authUserId = authData?.user?.id;
    }

    // 3. Pastikan user masuk ke tabel public.users
    // Tunggu sejenak jika trigger Postgres sedang berjalan
    await new Promise((r) => setTimeout(r, 600));

    const { data: inDb } = await supabase
      .from('users')
      .select('*')
      .eq('username', cleanUsername)
      .maybeSingle();

    let finalUser = inDb;

    // Jika trigger belum memasukkan data, insert langsung menggunakan authUserId
    if (!finalUser && authUserId) {
      const { data: insertedUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUserId,
          username: cleanUsername,
          name,
          role,
          poin: 0,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message || 'Gagal menyimpan user ke tabel database.');
      }
      finalUser = insertedUser;
    }

    // 4. Catat dan sinkronkan biodata ke cache & database
    if (finalUser?.id) {
      const shift = staffData.shift || 'Shift Pagi (08:00 - 17:00)';
      const localCache = getLocalBiodataCache();
      localCache[finalUser.id] = {
        shift,
        no_telepon: staffData.no_telepon || '',
        email_pribadi: staffData.email_pribadi || '',
        kontak_darurat_nama: staffData.kontak_darurat_nama || '',
        kontak_darurat_nomor: staffData.kontak_darurat_nomor || '',
        kontak_darurat_hubungan: staffData.kontak_darurat_hubungan || 'Keluarga'
      };
      setLocalBiodataCache(localCache);

      // Coba simpan ke database jika kolom sudah ada
      try {
        await supabase.from('users').update({
          shift,
          no_telepon: staffData.no_telepon || null,
          email_pribadi: staffData.email_pribadi || null,
          kontak_darurat_nama: staffData.kontak_darurat_nama || null,
          kontak_darurat_nomor: staffData.kontak_darurat_nomor || null,
          kontak_darurat_hubungan: staffData.kontak_darurat_hubungan || 'Keluarga'
        }).eq('id', finalUser.id);
      } catch (errCol) {
        console.warn('Kolom biodata/shift belum ada di users Supabase:', errCol.message);
      }
    }

    // 5. Catat ke log aktivitas
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      await aktivitasService.logActivity({
        user_id: currentUser.id || null,
        title: 'User Baru Ditambahkan',
        description: `${name} (@${cleanUsername}) ditambahkan sebagai ${role}`,
        type: 'user',
      });
    } catch (e) {
      console.warn('Gagal mencatat log aktivitas:', e);
    }

    return finalUser;
  },

  // Edit / Update Data Staff & Biodata
  async updateStaff(id, updates) {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.shift !== undefined) payload.shift = updates.shift;
    if (updates.username !== undefined) {
      payload.username = updates.username
        .replace(/@umaratax\.com$/i, '')
        .replace(/[^a-zA-Z0-9._-]/g, '')
        .toLowerCase()
        .trim();
    }
    if (updates.no_telepon !== undefined) payload.no_telepon = updates.no_telepon.trim();
    if (updates.email_pribadi !== undefined) payload.email_pribadi = updates.email_pribadi.trim();
    if (updates.kontak_darurat_nama !== undefined) payload.kontak_darurat_nama = updates.kontak_darurat_nama.trim();
    if (updates.kontak_darurat_nomor !== undefined) payload.kontak_darurat_nomor = updates.kontak_darurat_nomor.trim();
    if (updates.kontak_darurat_hubungan !== undefined) payload.kontak_darurat_hubungan = updates.kontak_darurat_hubungan.trim();

    // Selalu simpan di local cache agar data aman
    const localCache = getLocalBiodataCache();
    localCache[id] = {
      ...(localCache[id] || {}),
      shift: updates.shift !== undefined ? updates.shift : (localCache[id]?.shift || 'Shift Pagi (08:00 - 17:00)'),
      no_telepon: updates.no_telepon !== undefined ? updates.no_telepon : (localCache[id]?.no_telepon || ''),
      email_pribadi: updates.email_pribadi !== undefined ? updates.email_pribadi : (localCache[id]?.email_pribadi || ''),
      kontak_darurat_nama: updates.kontak_darurat_nama !== undefined ? updates.kontak_darurat_nama : (localCache[id]?.kontak_darurat_nama || ''),
      kontak_darurat_nomor: updates.kontak_darurat_nomor !== undefined ? updates.kontak_darurat_nomor : (localCache[id]?.kontak_darurat_nomor || ''),
      kontak_darurat_hubungan: updates.kontak_darurat_hubungan !== undefined ? updates.kontak_darurat_hubungan : (localCache[id]?.kontak_darurat_hubungan || 'Keluarga')
    };
    setLocalBiodataCache(localCache);

    // Simpan role ke local role overrides agar langsung aktif seketika
    if (updates.role !== undefined) {
      const roleOverrides = getLocalRoleOverrides();
      roleOverrides[id] = updates.role;
      if (payload.username) roleOverrides[payload.username] = updates.role;
      setLocalRoleOverrides(roleOverrides);
    }

    let { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    // Fallback jika Supabase check constraint users_role_check belum diupdate untuk role Admin
    if (error && (error.code === '23514' || error.message?.includes('check constraint') || error.message?.includes('users_role_check'))) {
      console.warn('Check constraint users_role_check belum mengizinkan Admin di Supabase. Menyimpan role Admin secara aman di lokal.');
      const { role: _ignoredRole, ...payloadNoRole } = payload;
      const resFallback = await supabase
        .from('users')
        .update(payloadNoRole)
        .eq('id', id)
        .select()
        .single();

      if (!resFallback.error) {
        data = { ...(resFallback.data || {}), role: updates.role };
        error = null;
      }
    }

    // Fallback jika Supabase belum punya kolom biodata/shift baru
    if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('shift') || error.message?.includes('no_telepon') || error.message?.includes('email_pribadi'))) {
      console.warn('Kolom biodata/shift belum ada di Supabase users. Menggunakan fallback update dasar.');
      const basePayload = {};
      if (updates.name !== undefined) basePayload.name = updates.name.trim();
      if (updates.username !== undefined) basePayload.username = payload.username;

      const fallback = await supabase
        .from('users')
        .update(basePayload)
        .eq('id', id)
        .select()
        .single();

      if (fallback.error) throw new Error(fallback.error.message);
      data = { ...fallback.data, role: updates.role || fallback.data?.role };
      error = null;
    }

    if (error) throw new Error(error.message);

    // Ambil info admin/developer saat ini dari localStorage
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // Jika admin memperbarui profilnya sendiri, sinkronkan localStorage
    if (currentUser && currentUser.id === id) {
      const updatedLocalUser = { ...currentUser, ...payload };
      localStorage.setItem('user', JSON.stringify(updatedLocalUser));
      window.dispatchEvent(new Event('userUpdated'));
    }

    try {
      await aktivitasService.logActivity({
        user_id: currentUser.id || null,
        title: 'Update Data User',
        description: `Data untuk ${payload.name || 'User'} (@${payload.username || 'user'}) telah diperbarui`,
        type: 'user',
      });
    } catch (e) {
      console.warn('Gagal mencatat log aktivitas update user:', e);
    }

    return data;
  },

  // Hapus Staff dari Database
  async deleteStaff(id) {
    // Ambil info nama user sebelum dihapus untuk log
    const { data: targetUser } = await supabase
      .from('users')
      .select('name, username, role')
      .eq('id', id)
      .maybeSingle();

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      await aktivitasService.logActivity({
        user_id: currentUser.id || null,
        title: 'User Dihapus',
        description: `User ${targetUser?.name || 'Staff'} (@${targetUser?.username || 'user'}) telah dihapus dari sistem`,
        type: 'user',
      });
    } catch (e) {
      console.warn('Gagal mencatat log aktivitas hapus user:', e);
    }

    return true;
  },

  // Reset Password Staff ke Default 123456
  async resetPassword(staffUser) {
    const defaultPass = '123456';
    const currentAdmin = JSON.parse(localStorage.getItem('user') || '{}');
    const email = staffUser.email || `${(staffUser.cleanUsername || staffUser.username || '').replace(/@umaratax\.com$/i, '')}@umaratax.com`;

    let resetSuccess = false;
    let rpcErrorMsg = '';

    // 1. Jika ada Service Role Key di .env, reset langsung via Supabase Admin API (Paling Handal)
    const adminClient = getAdminAuthClient();
    if (adminClient) {
      try {
        const { error: adminErr } = await adminClient.auth.admin.updateUserById(staffUser.id, {
          password: defaultPass,
        });
        if (!adminErr) {
          resetSuccess = true;
        } else {
          console.warn('Admin API updateUserById error:', adminErr.message);
        }
      } catch (adminEx) {
        console.warn('Admin API invocation error:', adminEx.message);
      }
    }

    // 2. Eksekusi lewat RPC PostgreSQL Supabase (reset_user_password)
    if (!resetSuccess) {
      try {
        const { data, error } = await supabase.rpc('reset_user_password', {
          target_user_id: staffUser.id,
          new_password: defaultPass,
        });

        if (!error && (data === true || data === null)) {
          resetSuccess = true;
        } else if (error) {
          console.warn('RPC reset_user_password error:', error.message);
          rpcErrorMsg = error.message;
        }
      } catch (rpcErr) {
        console.warn('RPC invocation failed:', rpcErr.message);
        rpcErrorMsg = rpcErr.message;
      }
    }

    // 3. Jika user yang di-reset adalah akun yang sedang aktif login
    if (!resetSuccess && currentAdmin?.id === staffUser.id) {
      try {
        const { error: selfErr } = await supabase.auth.updateUser({ password: defaultPass });
        if (!selfErr) {
          resetSuccess = true;
        }
      } catch (selfErr) {
        console.warn('Self password update failed:', selfErr.message);
      }
    }

    // 4. Fallback: jika user sudah memiliki password default 123456
    if (!resetSuccess) {
      try {
        const isolatedClient = getIsolatedAuthClient();
        const checkRes = await isolatedClient.auth.signInWithPassword({
          email,
          password: defaultPass,
        });
        if (checkRes.data?.user) {
          resetSuccess = true;
        }
      } catch (e) {
        // Abaikan
      }
    }

    if (!resetSuccess) {
      const err = new Error(
        'Fungsi SQL "reset_user_password" belum dijalankan di Supabase. Silakan jalankan script SQL reset_user_password di Supabase SQL Editor agar password bisa di-reset.'
      );
      err.isMissingSql = true;
      err.rpcErrorMsg = rpcErrorMsg;
      throw err;
    }

    // Catat log aktivitas reset password
    try {
      await aktivitasService.logActivity({
        user_id: currentAdmin.id || null,
        title: 'Reset Password Staff',
        description: `Password untuk ${staffUser.name || 'Staff'} (@${staffUser.cleanUsername || staffUser.username || 'user'}) telah direset kembali ke 123456`,
        type: 'user',
      });
    } catch (e) {
      console.warn('Gagal mencatat log aktivitas reset password:', e);
    }

    return true;
  },
};
