import { createTheme } from '@mui/material/styles';

const OZICYBER_GREEN = '#24483E';
const OZICYBER_GOLD  = '#FFF1AA';

const sharedTypography = {
  fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
  h1: { fontWeight: 600 }, h2: { fontWeight: 600 }, h3: { fontWeight: 600 },
  h4: { fontWeight: 600 }, h5: { fontWeight: 600 }, h6: { fontWeight: 600 },
  button: { textTransform: 'none', fontWeight: 500 },
};

const sharedComponents = {
  MuiButton: {
    styleOverrides: {
      root: { borderRadius: 8 },
      contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
    },
  },
  MuiTextField: {
    styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 8 } } },
  },
  MuiChip: { styleOverrides: { root: { borderRadius: 4 } } },
  MuiDrawer: { styleOverrides: { paper: { borderRight: 'none' } } },
};

export function createAppTheme(mode = 'light', primaryColor = OZICYBER_GREEN, secondaryColor = OZICYBER_GOLD) {
  const isDark = mode === 'dark';
  return createTheme({
    palette: {
      mode,
      primary:   { main: primaryColor,   contrastText: '#ffffff' },
      secondary: { main: secondaryColor, contrastText: primaryColor },
      background: {
        default: isDark ? '#121212' : '#f5f7f5',
        paper:   isDark ? '#1e1e1e' : '#ffffff',
      },
      success: { main: '#2e7d32' },
      warning: { main: '#ed6c02' },
      error:   { main: '#d32f2f' },
      info:    { main: '#1976d2' },
    },
    typography: sharedTypography,
    shape: { borderRadius: 8 },
    components: {
      ...sharedComponents,
      MuiPaper: {
        styleOverrides: {
          root: {
            boxShadow: isDark
              ? '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.5)'
              : '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
            color: isDark ? '#ffffff' : 'inherit',
          },
        },
      },
    },
  });
}

export default createAppTheme('light');

// Severity colors for findings
export const severityColors = {
  CRITICAL: { bg: '#ffebee', text: '#c62828', border: '#ef9a9a' },
  HIGH: { bg: '#fff3e0', text: '#e65100', border: '#ffcc80' },
  MEDIUM: { bg: '#fff8e1', text: '#f57f17', border: '#ffe082' },
  LOW: { bg: '#f3e5f5', text: '#6a1b9a', border: '#ce93d8' },
  INFORMATIONAL: { bg: '#e3f2fd', text: '#1565c0', border: '#90caf9' },
};

// Status colors
export const statusColors = {
  DRAFT: { bg: '#f5f5f5', text: '#616161' },
  OPEN: { bg: '#e3f2fd', text: '#1976d2' },
  IN_REVIEW: { bg: '#fff3e0', text: '#f57f17' },
  PUBLISHED: { bg: '#e8f5e9', text: '#2e7d32' },
  REMEDIATED: { bg: '#e0f2f1', text: '#00796b' },
  FALSE_POSITIVE: { bg: '#fafafa', text: '#9e9e9e' },
  ACCEPTED_RISK: { bg: '#fce4ec', text: '#c2185b' },
};
