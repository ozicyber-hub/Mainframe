import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider, closeSnackbar } from 'notistack';
import { createAppTheme } from './theme';
import { useAuthStore } from './store/authStore';
import { useBrandingStore } from './store/brandingStore';

// Suppress the harmless ResizeObserver loop notification in dev mode
const _oe = window.onerror;
window.onerror = (msg, ...args) => {
  if (typeof msg === 'string' && msg.includes('ResizeObserver loop')) return true;
  return _oe ? _oe(msg, ...args) : false;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

const ThemedApp = () => {
  const darkMode = useAuthStore(s => s.darkMode);
  const { primaryColor, secondaryColor } = useBrandingStore();
  const theme = useMemo(
    () => createAppTheme(darkMode ? 'dark' : 'light', primaryColor, secondaryColor),
    [darkMode, primaryColor, secondaryColor],
  );
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        action={(snackbarId) => (
          <IconButton size="small" color="inherit" onClick={() => closeSnackbar(snackbarId)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      >
        <App />
      </SnackbarProvider>
    </ThemeProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemedApp />
    </QueryClientProvider>
  </React.StrictMode>
);
