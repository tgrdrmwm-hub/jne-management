/**
 * Global Anti-Double-Click Protection
 * Mencegah eksekusi ganda pada SEMUA tombol (button, input[type=submit], SweetAlert, dll.)
 * saat pengguna melakukan klik cepat dua kali berturut-turut (double-click).
 */

const DOUBLE_CLICK_THRESHOLD_MS = 650;
let lastClickedElement = null;
let lastClickTimestamp = 0;

export const initAntiDoubleClick = () => {
  if (typeof window === 'undefined') return;

  // Pasang listener di fase Capture (true) agar mencegat event sebelum handler React dijalankan
  window.addEventListener(
    'click',
    (event) => {
      // Cari elemen terdekat yang berfungsi sebagai tombol atau pemicu submit
      const button = event.target.closest(
        'button, [role="button"], input[type="submit"], input[type="button"], a.btn, .swal2-confirm, .swal2-cancel'
      );

      if (!button) return;

      // Jika tombol secara khusus mengizinkan double-click cepat (misal counter +/-)
      if (button.dataset.allowDoubleClick === 'true') {
        return;
      }

      const now = Date.now();
      const isSameButton = button === lastClickedElement;
      const elapsed = now - lastClickTimestamp;

      // Jika tombol yang sama diklik lagi dalam rentang waktu < 650ms
      if (isSameButton && elapsed < DOUBLE_CLICK_THRESHOLD_MS) {
        // Blokir event kedua sepenuhnya
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }

      // Catat elemen dan waktu klik pertama
      lastClickedElement = button;
      lastClickTimestamp = now;

      // Amankan tombol dengan menonaktifkan pointer-events selama jeda ambang batas
      const originalPointerEvents = button.style.pointerEvents;
      button.style.pointerEvents = 'none';

      setTimeout(() => {
        if (button) {
          button.style.pointerEvents = originalPointerEvents;
        }
        if (lastClickedElement === button) {
          lastClickedElement = null;
        }
      }, DOUBLE_CLICK_THRESHOLD_MS);
    },
    true // Capture phase: mencegat sebelum event sampai ke React listener
  );
};
