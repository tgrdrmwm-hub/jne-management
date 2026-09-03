import { supabase } from '../lib/supabase';
import { aktivitasService } from './aktivitasService';

export const staffService = {
  async getStaffList() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });
      
    if (error) {
      throw new Error(error.message);
    }
    
    return data || [];
  },

  async createStaff(staffData) {
    // For simple demo, we will use signUp. Note: This might log the admin out in real Supabase, 
    // but for UI completeness we provide the flow. 
    // Ideally use supabase.auth.admin.createUser with service_role key.
    const { data, error } = await supabase.auth.signUp({
      email: `${staffData.username}@umaratax.com`,
      password: staffData.password || '123456',
      options: {
        data: {
          username: staffData.username,
          name: staffData.name,
          role: staffData.role
        }
      }
    });

    if (error) throw new Error(error.message);
    
    // Ambil info admin/developer saat ini dari localStorage
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    await aktivitasService.logActivity({
      user_id: currentUser.id || null,
      title: 'User Baru Ditambahkan',
      description: `${staffData.name} ditambahkan sebagai ${staffData.role}`,
      type: 'user'
    });

    return data;
  },

  async updateStaff(id, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw new Error(error.message);
    
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    await aktivitasService.logActivity({
      user_id: currentUser.id || null,
      title: 'Update Data User',
      description: `Data untuk ${updates.name || 'User'} telah diperbarui`,
      type: 'user'
    });
    
    return data;
  },

  async deleteStaff(id) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    await aktivitasService.logActivity({
      user_id: currentUser.id || null,
      title: 'User Dihapus',
      description: `Seorang user telah dihapus dari sistem`,
      type: 'user'
    });
    
    return true;
  }
};
