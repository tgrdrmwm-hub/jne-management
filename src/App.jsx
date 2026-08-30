import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { supabase } from './lib/supabase';
import { logout } from './store/authSlice';

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Verifikasi sesi saat aplikasi dimuat
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        dispatch(logout());
      }
    });

    // Dengarkan perubahan status autentikasi (misal: token kedaluwarsa)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        dispatch(logout());
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [dispatch]);

  return <RouterProvider router={router} />;
}

export default App;
