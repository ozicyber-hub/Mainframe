import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add, Delete, Edit, Refresh } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import api from '../utils/api';

const emptyForm = {
  name: '',
  slug: '',
  primary_domain: '',
  plan: 'PRO',
  status: 'TRIAL',
  primary_contact_name: '',
  primary_contact_email: '',
  subscription_started_at: '',
  subscription_renews_at: '',
  max_users: 10,
  max_organizations: 25,
  notes: '',
};

const statusColor = {
  TRIAL: 'warning',
  ACTIVE: 'success',
  PAUSED: 'default',
  CANCELLED: 'error',
};

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export default function TenanciesAdmin() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/tenants/');
      setTenants(res.data.results || res.data);
    } catch {
      enqueueSnackbar('Failed to load tenancies', { variant: 'error' });
    }
    setLoading(false);
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const setField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'name' && !editingTenant ? { slug: slugify(value) } : {}),
    }));
  };

  const openCreate = () => {
    setEditingTenant(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (tenant) => {
    setEditingTenant(tenant);
    setForm({
      name: tenant.name || '',
      slug: tenant.slug || '',
      primary_domain: tenant.primary_domain || '',
      plan: tenant.plan || 'PRO',
      status: tenant.status || 'TRIAL',
      primary_contact_name: tenant.primary_contact_name || '',
      primary_contact_email: tenant.primary_contact_email || '',
      subscription_started_at: tenant.subscription_started_at || '',
      subscription_renews_at: tenant.subscription_renews_at || '',
      max_users: tenant.max_users || 10,
      max_organizations: tenant.max_organizations || 25,
      notes: tenant.notes || '',
    });
    setDialogOpen(true);
  };

  const saveTenant = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      enqueueSnackbar('Tenant name and slug are required', { variant: 'warning' });
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      slug: slugify(form.slug),
      max_users: Number(form.max_users) || 0,
      max_organizations: Number(form.max_organizations) || 0,
      subscription_started_at: form.subscription_started_at || null,
      subscription_renews_at: form.subscription_renews_at || null,
    };

    try {
      if (editingTenant) {
        await api.patch(`/tenants/${editingTenant.id}/`, payload);
        enqueueSnackbar('Tenancy updated', { variant: 'success' });
      } else {
        await api.post('/tenants/', payload);
        enqueueSnackbar('Tenancy created', { variant: 'success' });
      }
      setDialogOpen(false);
      loadTenants();
    } catch (err) {
      const data = err.response?.data;
      const msg = data ? Object.values(data).flat().join(' ') : 'Failed to save tenancy';
      enqueueSnackbar(msg, { variant: 'error' });
    }
    setSaving(false);
  };

  const deleteTenant = async () => {
    try {
      await api.delete(`/tenants/${deleteConfirm.id}/`);
      enqueueSnackbar('Tenancy deleted', { variant: 'success' });
      setDeleteConfirm(null);
      loadTenants();
    } catch {
      enqueueSnackbar('Failed to delete tenancy', { variant: 'error' });
    }
  };

  const activeCount = tenants.filter((tenant) => tenant.status === 'ACTIVE').length;
  const trialCount = tenants.filter((tenant) => tenant.status === 'TRIAL').length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>OziCyber Platform Tenancies</Typography>
          <Typography variant="body2" color="text.secondary">
            SaaS customer tenants. These sit above the client organisations each customer creates inside Mainframe.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={loadTenants}>Refresh</Button>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate} sx={{ bgcolor: theme.palette.primary.main }}>
            Add Tenancy
          </Button>
        </Box>
      </Box>

      <Alert severity="warning" sx={{ mb: 2 }}>
        This is an OziCyber-only platform control. It is protected by Django superuser access and should not be granted to client tenant admins.
      </Alert>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined"><CardContent><Typography variant="h5" fontWeight={700}>{tenants.length}</Typography><Typography variant="caption" color="text.secondary">Total tenancies</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined"><CardContent><Typography variant="h5" fontWeight={700}>{activeCount}</Typography><Typography variant="caption" color="text.secondary">Active tenancies</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined"><CardContent><Typography variant="h5" fontWeight={700}>{trialCount}</Typography><Typography variant="caption" color="text.secondary">Trial tenancies</Typography></CardContent></Card>
        </Grid>
      </Grid>

      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>Tenant</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tenant URL</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Plan</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Renewal</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Limits</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                      No tenancies yet. Create your first Mainframe customer tenancy.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : tenants.map((tenant) => (
                <TableRow key={tenant.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>{tenant.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{tenant.primary_contact_email || tenant.slug}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{tenant.tenant_url}</Typography>
                  </TableCell>
                  <TableCell><Chip label={tenant.plan} size="small" variant="outlined" /></TableCell>
                  <TableCell><Chip label={tenant.status} size="small" color={statusColor[tenant.status] || 'default'} /></TableCell>
                  <TableCell><Typography variant="body2">{tenant.subscription_renews_at || '-'}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {tenant.max_users} users / {tenant.max_organizations} orgs
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit tenancy"><IconButton size="small" onClick={() => openEdit(tenant)}><Edit fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Delete tenancy"><IconButton size="small" color="error" onClick={() => setDeleteConfirm(tenant)}><Delete fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingTenant ? 'Edit Tenancy' : 'Add Tenancy'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth required size="small" label="Tenant name" value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth required size="small" label="Tenant slug" value={form.slug} onChange={(e) => setField('slug', e.target.value)} helperText={`${slugify(form.slug || 'client')}.mainframe.ozicyber.com.au`} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Custom primary domain (optional)" value={form.primary_domain} onChange={(e) => setField('primary_domain', e.target.value)} placeholder="client.mainframe.ozicyber.com.au" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Plan</InputLabel>
                <Select label="Plan" value={form.plan} onChange={(e) => setField('plan', e.target.value)}>
                  <MenuItem value="INDIVIDUAL">Individual</MenuItem>
                  <MenuItem value="PRO">Pro</MenuItem>
                  <MenuItem value="ENTERPRISE">Enterprise</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                  <MenuItem value="TRIAL">Trial</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="PAUSED">Paused</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Primary contact name" value={form.primary_contact_name} onChange={(e) => setField('primary_contact_name', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Primary contact email" type="email" value={form.primary_contact_email} onChange={(e) => setField('primary_contact_email', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Subscription started" type="date" value={form.subscription_started_at} onChange={(e) => setField('subscription_started_at', e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Renews at" type="date" value={form.subscription_renews_at} onChange={(e) => setField('subscription_renews_at', e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Max users" type="number" value={form.max_users} onChange={(e) => setField('max_users', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Max internal organisations" type="number" value={form.max_organizations} onChange={(e) => setField('max_organizations', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" multiline rows={3} label="Internal notes" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveTenant} disabled={saving} sx={{ bgcolor: theme.palette.primary.main }}>
            {saving ? 'Saving...' : 'Save Tenancy'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete tenancy?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This removes the SaaS tenancy registry entry for <strong>{deleteConfirm?.name}</strong>. It does not remove any future tenant data partitions.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={deleteTenant}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
