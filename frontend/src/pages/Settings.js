import React, { useState, useRef } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button, Switch,
  FormControlLabel, Divider, Avatar, IconButton, Alert,
  CircularProgress, Chip, Tooltip,
} from '@mui/material';
import { CloudUpload, DarkMode, LightMode, Save, Lock, Notifications, Shield, QrCode } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAuthStore } from '../store/authStore';
import { useSnackbar } from 'notistack';
import api from '../utils/api';

const NOTIF_DEFAULTS = {
  new_findings: true,
  finding_updates: true,
  report_published: true,
  in_app: true,
  task_assigned: true,
  slot_request_update: true,
};

const Settings = () => {
  const theme = useTheme();
  const { user, updateUser, darkMode, toggleDarkMode } = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();

  // Profile state
  const [profile, setProfile] = useState({
    first_name: user?.first_name || '',
    last_name:  user?.last_name  || '',
    phone:      user?.phone      || '',
  });
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [avatarFile,    setAvatarFile]    = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const avatarInputRef = useRef(null);

  // Password state
  const [passwords, setPasswords] = useState({
    current_password: '', new_password: '', new_password_confirm: '',
  });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError,  setPwError]  = useState('');

  // MFA state
  const [mfaData,       setMfaData]       = useState(null);
  const [mfaLoading,    setMfaLoading]    = useState(false);
  const [mfaCode,       setMfaCode]       = useState('');
  const [mfaError,      setMfaError]      = useState('');
  const [mfaEnabled,    setMfaEnabled]    = useState(user?.mfa_enabled || false);
  const [mfaSetupOpen,  setMfaSetupOpen]  = useState(false);

  const loadMfaSetup = async () => {
    setMfaLoading(true);
    setMfaError('');
    try {
      const res = await api.get('/auth/mfa/setup/');
      setMfaData(res.data);
      setMfaSetupOpen(true);
    } catch { setMfaError('Failed to load MFA setup.'); }
    setMfaLoading(false);
  };

  const handleMfaEnable = async () => {
    setMfaError('');
    try {
      await api.post('/auth/mfa/enable/', { code: mfaCode });
      setMfaEnabled(true);
      setMfaSetupOpen(false);
      setMfaCode('');
      enqueueSnackbar('MFA enabled!', { variant: 'success' });
    } catch (e) { setMfaError(e.response?.data?.error || 'Invalid code.'); }
  };

  const handleMfaDisable = async () => {
    setMfaError('');
    if (!mfaCode) { setMfaError('Enter your current TOTP code to disable MFA.'); return; }
    try {
      await api.post('/auth/mfa/disable/', { code: mfaCode });
      setMfaEnabled(false);
      setMfaCode('');
      enqueueSnackbar('MFA disabled.', { variant: 'info' });
    } catch (e) { setMfaError(e.response?.data?.error || 'Invalid code.'); }
  };

  // Notification prefs (localStorage persisted)
  const [notif, setNotif] = useState(() => {
    try { return { ...NOTIF_DEFAULTS, ...JSON.parse(localStorage.getItem('notifPrefs') || '{}') }; }
    catch { return NOTIF_DEFAULTS; }
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      enqueueSnackbar('Image must be under 2 MB', { variant: 'warning' });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleProfileSave = async () => {
    setProfileSaving(true);
    try {
      const fd = new FormData();
      fd.append('first_name', profile.first_name);
      fd.append('last_name',  profile.last_name);
      fd.append('phone',      profile.phone);
      if (avatarFile) fd.append('avatar', avatarFile);

      const res = await api.patch('/auth/profile/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      setAvatarFile(null);
      enqueueSnackbar('Profile updated', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(e.response?.data?.error || 'Failed to update profile', { variant: 'error' });
    }
    setProfileSaving(false);
  };

  const handlePasswordChange = async () => {
    setPwError('');
    if (!passwords.current_password || !passwords.new_password || !passwords.new_password_confirm) {
      setPwError('All fields are required.');
      return;
    }
    if (passwords.new_password !== passwords.new_password_confirm) {
      setPwError('New passwords do not match.');
      return;
    }
    if (passwords.new_password.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    setPwSaving(true);
    try {
      await api.post('/auth/change-password/', passwords);
      setPasswords({ current_password: '', new_password: '', new_password_confirm: '' });
      enqueueSnackbar('Password updated', { variant: 'success' });
    } catch (e) {
      const data = e.response?.data;
      setPwError(data?.current_password || data?.error || 'Failed to update password.');
    }
    setPwSaving(false);
  };

  const handleNotifToggle = (key) => {
    const updated = { ...notif, [key]: !notif[key] };
    setNotif(updated);
    localStorage.setItem('notifPrefs', JSON.stringify(updated));
  };

  const avatarSrc = avatarPreview || user?.avatar;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Settings</Typography>
        <Typography variant="body2" color="text.secondary">Manage your profile, security and preferences</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Profile */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Profile Information</Typography>
            <Divider sx={{ mb: 2 }} />

            {/* Avatar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={avatarSrc}
                  sx={{ width: 80, height: 80, bgcolor: theme.palette.primary.main, fontSize: '1.5rem' }}
                >
                  {!avatarSrc && `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`}
                </Avatar>
                <Tooltip title="Upload photo">
                  <IconButton
                    size="small"
                    onClick={() => avatarInputRef.current?.click()}
                    sx={{
                      position: 'absolute', bottom: -4, right: -4,
                      bgcolor: theme.palette.primary.main, color: '#fff',
                      width: 26, height: 26,
                      '&:hover': { bgcolor: theme.palette.primary.dark },
                    }}
                  >
                    <CloudUpload sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
                <input
                  ref={avatarInputRef}
                  type="file"
                  hidden
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleAvatarChange}
                />
              </Box>
              <Box>
                <Button size="small" variant="outlined" startIcon={<CloudUpload />}
                  onClick={() => avatarInputRef.current?.click()}>
                  Change Photo
                </Button>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  JPG, PNG, GIF or WebP · Max 2 MB
                </Typography>
                {avatarFile && (
                  <Chip label={avatarFile.name} size="small" onDelete={() => { setAvatarFile(null); setAvatarPreview(user?.avatar || null); }} sx={{ mt: 0.5, fontSize: '0.65rem' }} />
                )}
              </Box>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField fullWidth label="First Name" size="small" value={profile.first_name}
                  onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Last Name" size="small" value={profile.last_name}
                  onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Email" size="small" value={user?.email || ''} disabled
                  helperText="Email cannot be changed" />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Phone" size="small" value={profile.phone}
                  onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">Role:</Typography>
                  <Chip label={user?.role_display || user?.role} size="small"
                    sx={{ bgcolor: theme.palette.primary.main, color: '#fff' }} />
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" startIcon={profileSaving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                  onClick={handleProfileSave} disabled={profileSaving}
                  sx={{ bgcolor: theme.palette.primary.main }}>
                  {profileSaving ? 'Saving…' : 'Save Profile'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Security */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              <Lock sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />
              Change Password
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {pwError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPwError('')}>{pwError}</Alert>}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField fullWidth label="Current Password" type="password" size="small"
                  value={passwords.current_password}
                  onChange={e => setPasswords(p => ({ ...p, current_password: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="New Password" type="password" size="small"
                  value={passwords.new_password}
                  onChange={e => setPasswords(p => ({ ...p, new_password: e.target.value }))}
                  helperText="Minimum 8 characters" />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Confirm New Password" type="password" size="small"
                  value={passwords.new_password_confirm}
                  onChange={e => setPasswords(p => ({ ...p, new_password_confirm: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" onClick={handlePasswordChange} disabled={pwSaving}
                  startIcon={pwSaving ? <CircularProgress size={16} color="inherit" /> : <Lock />}
                  sx={{ bgcolor: theme.palette.primary.main }}>
                  {pwSaving ? 'Updating…' : 'Update Password'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Appearance */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              {darkMode ? <DarkMode sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} /> : <LightMode sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />}
              Appearance
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5,
              border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box>
                <Typography variant="body2" fontWeight={500}>Dark Mode</Typography>
                <Typography variant="caption" color="text.secondary">
                  {darkMode ? 'Dark theme active — easy on the eyes at night' : 'Light theme active'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LightMode sx={{ fontSize: 16, color: darkMode ? 'text.disabled' : 'warning.main' }} />
                <Switch checked={darkMode} onChange={toggleDarkMode} color="primary" />
                <DarkMode sx={{ fontSize: 16, color: darkMode ? 'primary.main' : 'text.disabled' }} />
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* MFA */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              <Shield sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />
              Two-Factor Authentication
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, p: 1.5,
              border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  TOTP Authenticator {mfaEnabled && <Chip label="Active" size="small" color="success" sx={{ ml: 1, height: 18 }} />}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {mfaEnabled ? 'MFA is enabled. Your account requires a code on every login.' : 'Add an extra layer of security with Google Authenticator or similar.'}
                </Typography>
              </Box>
            </Box>

            {mfaError && <Alert severity="error" onClose={() => setMfaError('')} sx={{ mb: 1.5 }}>{mfaError}</Alert>}

            {!mfaEnabled ? (
              <Button variant="outlined" startIcon={mfaLoading ? <CircularProgress size={16} /> : <QrCode />}
                onClick={loadMfaSetup} disabled={mfaLoading}>
                Set Up MFA
              </Button>
            ) : (
              <Box>
                <TextField label="TOTP Code to disable" size="small" value={mfaCode}
                  onChange={e => { setMfaCode(e.target.value.replace(/\D/g,'')); setMfaError(''); }}
                  inputProps={{ maxLength: 6 }} sx={{ mr: 1, width: 180 }} />
                <Button variant="outlined" color="error" onClick={handleMfaDisable}
                  disabled={mfaCode.length < 6}>
                  Disable MFA
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Notifications */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              <Notifications sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />
              Notification Preferences
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={0.5}>
              {[
                ['new_findings',         'New findings added to engagements'],
                ['finding_updates',      'Finding status updates'],
                ['report_published',     'Report published or ready for review'],
                ['task_assigned',        'Task assigned to me'],
                ['slot_request_update',  'Time slot request approved or rejected'],
                ['in_app',               'In-app notifications'],
              ].map(([key, label]) => (
                <Grid item xs={12} key={key}>
                  <FormControlLabel
                    control={<Switch checked={notif[key]} onChange={() => handleNotifToggle(key)} size="small" />}
                    label={<Typography variant="body2">{label}</Typography>}
                  />
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* MFA Setup Dialog */}
      {mfaSetupOpen && mfaData && (
        <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Paper sx={{ p: 3, maxWidth: 400, width: '90%', borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Set Up Authenticator App</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Scan this QR code with Google Authenticator, Authy, or any TOTP app.
            </Typography>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <img src={mfaData.qr_code} alt="QR Code" style={{ width: 200, height: 200, border: '4px solid #24483E', borderRadius: 8 }} />
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2, wordBreak: 'break-all', textAlign: 'center' }}>
              Manual entry key: <strong>{mfaData.secret}</strong>
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>Enter the 6-digit code to confirm setup:</Typography>
            <TextField fullWidth size="small" label="Verification Code" value={mfaCode}
              onChange={e => { setMfaCode(e.target.value.replace(/\D/g,'')); setMfaError(''); }}
              inputProps={{ maxLength: 6, style: { letterSpacing: '0.3em', fontSize: '1.2rem', textAlign: 'center' } }}
              placeholder="000000" sx={{ mb: 1 }} />
            {mfaError && <Alert severity="error" sx={{ mb: 1 }}>{mfaError}</Alert>}
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={() => { setMfaSetupOpen(false); setMfaCode(''); setMfaError(''); }}>Cancel</Button>
              <Button variant="contained" onClick={handleMfaEnable} disabled={mfaCode.length < 6}
                sx={{ bgcolor: '#24483E' }}>Enable MFA</Button>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default Settings;
