import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import AuthLayout from '../layouts/AuthLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Absensi from '../pages/Absensi';
import Laporan from '../pages/Laporan';
import Staff from '../pages/Staff';
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
        path: 'staff',
        element: <Staff />,
      },
    ],
  },
]);
