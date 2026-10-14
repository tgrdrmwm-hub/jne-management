import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import AuthLayout from '../layouts/AuthLayout';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Absensi from '../pages/Absensi';
import Laporan from '../pages/Laporan';
import LaporanHarian from '../pages/LaporanHarian';
import LaporanStaff from '../pages/LaporanStaff';
import Staff from '../pages/Staff';
import Poin from '../pages/Poin';
import Kalender from '../pages/Kalender';
import Omset from '../pages/Omset';
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
    path: '/register',
    element: <AuthLayout />,
    children: [
      {
        path: '',
        element: <Register />,
      },
    ],
  },
  {
    path: '/signup',
    element: <Navigate to="/register" replace />,
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
        path: 'presensi',
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
      {
        path: 'kalender',
        element: <Kalender />,
      },
      {
        path: 'omset',
        element: <Omset />,
      },
    ],
  },
]);
