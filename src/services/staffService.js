import { supabase } from '../lib/supabase';

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
  }
};
