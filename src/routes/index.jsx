import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import AuthLayout from '../layouts/AuthLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Absensi from '../pages/Absensi';
import Laporan from '../pages/Laporan';
import LaporanHarian from '../pages/LaporanHarian';
import LaporanStaff from '../pages/LaporanStaff';
import Staff from '../pages/Staff';
import Poin from '../pages/Poin';
import ProtectedRoute from './ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout />,
    children: [
      {
        path: '',
        element: <Login />,
      },
    ],
  },
  {
    path: '/',
    element: <ProtectedRoute><AdminLayout /></ProtectedRoute>,
    children: [
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'absensi',
        element: <Absensi />,
      },
      {
        path: 'laporan',
        element: <Laporan />,
      },
      {
        path: 'laporan-harian',
        element: <LaporanHarian />,
      },
      {
        path: 'laporan-staff',
        element: <LaporanStaff />,
      },
      {
        path: 'staff',
        element: <Staff />,
      },
      {
        path: 'poin',
        element: <Poin />,
      },
    ],
  },
]);
