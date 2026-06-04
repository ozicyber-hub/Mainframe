import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Divider,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { useSnackbar } from 'notistack';
import { useTheme } from '@mui/material/styles';
import api from '../utils/api';

const Login = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const login = useAuthStore((state) => state.login);

  const [formData, setFormData]     = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const googleBtnRef = useRef(null);

  // MFA step state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken,    setMfaToken]    = useState('');
  const [mfaCode,     setMfaCode]     = useState('');

  // Load SSO config and Google Identity Services on mount
  useEffect(() => {
    api.get('/auth/sso-providers/').then(r => {
      const { google } = r.data;
      if (google?.enabled && google?.client_id) {
        setGoogleClientId(google.client_id);
        loadGoogleSSO(google.client_id);
      }
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadGoogleSSO = (clientId) => {
    if (document.getElementById('gis-script')) return;
    const script = document.createElement('script');
    script.id  = 'gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => initGoogleButton(clientId);
    document.head.appendChild(script);
  };

  const initGoogleButton = (clientId) => {
    if (!window.google || !googleBtnRef.current) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback:  handleGoogleCredential,
    });
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: 'outline', size: 'large', width: 340, text: 'continue_with',
    });
  };

  // Re-init button if ref becomes available after script already loaded
  useEffect(() => {
    if (googleClientId && window.google && googleBtnRef.current) {
      initGoogleButton(googleClientId);
    }
  }); // runs every render but is idempotent once rendered

  const handleGoogleCredential = async ({ credential }) => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/google-login/', { credential });
      localStorage.setItem('access_token',  data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user',          JSON.stringify(data.user));
      useAuthStore.getState().initialize();
      enqueueSnackbar('Signed in with Google!', { variant: 'success' });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const result = await login(formData.email, formData.password);
      if (result?.mfa_required) {
        setMfaToken(result.mfa_token);
        setMfaRequired(true);
        setIsLoading(false);
        return;
      }
      enqueueSnackbar('Welcome back!', { variant: 'success' });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const { data } = await import('../utils/api').then(m => m.default.post('/auth/mfa/verify/', {
        mfa_token: mfaToken,
        code:      mfaCode,
      }));
      // Store tokens and user like normal login
      localStorage.setItem('access_token',  data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user',          JSON.stringify(data.user));
      useAuthStore.getState().initialize();
      enqueueSnackbar('Welcome back!', { variant: 'success' });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid authentication code.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f7f5',
        backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #1a3a2f 100%)`,
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 420,
          mx: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Logo */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Box
              sx={{
                width: 60,
                height: 60,
                backgroundColor: theme.palette.primary.main,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  backgroundColor: theme.palette.secondary.main,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography
                  variant="h4"
                  fontWeight={700}
                  color={theme.palette.primary.main}
                >
                  O
                </Typography>
              </Box>
            </Box>
            <Typography variant="h4" fontWeight={700} color={theme.palette.primary.main}>
              MainFrame
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Penetration Testing Portal
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {mfaRequired ? (
            /* ── MFA step ── */
            <form onSubmit={handleMfaSubmit}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Enter the 6-digit code from your authenticator app.
              </Alert>
              <TextField
                fullWidth label="Authentication Code" type="text"
                value={mfaCode} onChange={e => { setMfaCode(e.target.value.replace(/\D/g,'')); setError(''); }}
                margin="normal" required autoComplete="one-time-code"
                inputProps={{ maxLength: 6, style: { letterSpacing: '0.3em', fontSize: '1.4rem', textAlign: 'center' } }}
                placeholder="000000"
              />
              <Button type="submit" fullWidth variant="contained" size="large" disabled={isLoading || mfaCode.length < 6}
                sx={{ py: 1.5, mt: 2, mb: 1, backgroundColor: theme.palette.primary.main }}>
                {isLoading ? <CircularProgress size={24} /> : 'Verify'}
              </Button>
              <Button fullWidth size="small" onClick={() => { setMfaRequired(false); setMfaCode(''); setError(''); }}>
                ← Back to login
              </Button>
            </form>
          ) : (
            /* ── Credentials step ── */
            <>
              <form onSubmit={handleSubmit}>
                <TextField fullWidth label="Email" name="email" type="email"
                  value={formData.email} onChange={handleChange} margin="normal" required autoComplete="email" />
                <TextField fullWidth label="Password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password} onChange={handleChange} margin="normal" required autoComplete="current-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button color="primary" size="small" onClick={() => navigate('/forgot-password')}>
                    Forgot password?
                  </Button>
                </Box>
                <Button type="submit" fullWidth variant="contained" size="large" disabled={isLoading}
                  sx={{ py: 1.5, mb: 2, backgroundColor: theme.palette.primary.main,
                    '&:hover': { backgroundColor: theme.palette.primary.dark } }}>
                  {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
                </Button>
              </form>

              {googleClientId && (
                <>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="body2" color="text.secondary">OR</Typography>
                  </Divider>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <div ref={googleBtnRef} />
                  </Box>
                </>
              )}

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Don't have an account?{' '}
                  <Button color="primary" size="small" onClick={() => navigate('/register')}>
                    Contact Admin
                  </Button>
                </Typography>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
