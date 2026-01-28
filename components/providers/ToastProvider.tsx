'use client';

import { Toaster } from 'sonner';

export default function ToastProvider() {
  return (
    <Toaster
      position="bottom-center"
      offset={80} // Above bottom nav
      toastOptions={{
        style: {
          background: '#27272a', // zinc-800
          color: '#fff',
          border: '1px solid #3f3f46', // zinc-700
          borderRadius: '12px',
          padding: '12px 16px', // Match card padding
        },
        className: 'font-sans',
      }}
      visibleToasts={3}
      duration={3000}
    />
  );
}
