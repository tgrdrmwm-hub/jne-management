import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import './index.css';
import App from './App.jsx';
import { initAntiDoubleClick } from './utils/antiDoubleClick';

// Aktifkan perlindungan global anti double-click di seluruh aplikasi
initAntiDoubleClick();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
