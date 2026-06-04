import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, TextField, InputAdornment, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Alert, MenuItem, Select, FormControl, InputLabel,
  Divider, Grid,
} from '@mui/material';
import { Add, Search, Edit, Delete, Business, OpenInNew } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import api from '../utils/api';

const emptyForm = {
  name: '', description: '', phone: '', website: '', address: '',
  contact_first_name: '', contact_last_name: '', contact_email: '',
  contact_phone: '', contact_job_title: '',
};

const Organizations = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [editOrg, setEditOrg] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/organizations/');
      setOrganizations(res.data.results || res.data);
    } catch {
      setError('Failed to load organizations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrganizations(); }, [fetchOrganizations]);

  const filtered = useMemo(() => {
    return organizations.filter(org => {
      const matchSearch = !search ||
        org.name.toLowerCase().includes(search.toLowerCase()) ||
        (org.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (org.primary_contact?.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (org.primary_contact?.name || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && org.is_active) ||
        (statusFilter === 'inactive' && !org.is_active);
      return matchSearch && matchStatus;
    });
  }, [organizations, search, statusFilter]);

  const handleOpen = (org = null) => {
    if (org) {
      setEditOrg(org);
      setFormData({
        name: org.name || '', description: org.description || '',
        phone: org.phone || '', website: org.website || '', address: org.address || '',
        contact_first_name: org.primary_contact?.name?.split(' ')[0] || '',
        contact_last_name: org.primary_contact?.name?.split(' ').slice(1).join(' ') || '',
        contact_email: org.primary_contact?.email || '',
        contact_phone: org.primary_contact?.phone || '',
        contact_job_title: org.primary_contact?.job_title || '',
      });
    } else {
      setEditOrg(null);
      setFormData(emptyForm);
    }
    setOpenDialog(true);
  };

  const handleClose = () => { setOpenDialog(false); setEditOrg(null); setFormData(emptyForm); };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!formData.name.trim()) { enqueueSnackbar('Organization name is required', { variant: 'error' }); return; }
    setSubmitting(true);
    try {
      if (editOrg) {
        await api.patch(`/organizations/${editOrg.id}/`, {
          name: formData.name, description: formData.description,
          phone: formData.phone, website: formData.website, address: formData.address,
        });
        enqueueSnackbar('Organization updated', { variant: 'success' });
      } else {
        await api.post('/organizations/', formData);
        enqueueSnackbar('Organization created', { variant: 'success' });
      }
      handleClose();
      fetchOrganizations();
    } catch (err) {
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Failed to save organization';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (org) => {
    try {
      await api.delete(`/organizations/${org.id}/`);
      enqueueSnackbar('Organization deleted', { variant: 'success' });
      setDeleteConfirm(null);
      fetchOrganizations();
    } catch {
      enqueueSnackbar('Failed to delete organization', { variant: 'error' });
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Organizations</Typography>
          <Typography variant="body1" color="text.secondary">
            {organizations.length} total · {filtered.length} shown
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}
          sx={{ backgroundColor: theme.palette.primary.main }}>
          New Organization
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Search + Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search by name, contact, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ flexGrow: 1, minWidth: 240 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f7f5' }}>
              <TableCell sx={{ fontWeight: 600 }}>Organization</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Primary Contact</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">Engagements</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">Users</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Business sx={{ fontSize: 40, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                  <Typography variant="body2" color="text.secondary">
                    {search || statusFilter !== 'all' ? 'No organizations match your filters' : 'No organizations yet'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((org) => (
                <TableRow
                  key={org.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/organizations/${org.id}`)}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{
                        width: 32, height: 32, borderRadius: 1,
                        backgroundColor: theme.palette.primary.main,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Business sx={{ color: '#fff', fontSize: 16 }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{org.name}</Typography>
                        {org.description && (
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 240, display: 'block' }}>
                            {org.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {org.primary_contact ? (
                      <Box>
                        <Typography variant="body2">{org.primary_contact.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{org.primary_contact.email}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{org.primary_contact?.phone || org.phone || '—'}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={500}>{org.engagement_count ?? 0}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={500}>{org.user_count ?? 0}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={org.is_active ? 'Active' : 'Inactive'}
                      size="small"
                      color={org.is_active ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" onClick={() => navigate(`/organizations/${org.id}`)}>
                      <OpenInNew fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleOpen(org)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteConfirm(org)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create / Edit Dialog */}
      <Dialog open={openDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editOrg ? 'Edit Organization' : 'New Organization'}</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1, mb: 0.5 }}>Organization Details</Typography>
          <TextField fullWidth label="Organization Name *" name="name" value={formData.name} onChange={handleChange} margin="dense" />
          <TextField fullWidth label="Description" name="description" value={formData.description} onChange={handleChange} margin="dense" multiline rows={2} />
          <TextField fullWidth label="Phone" name="phone" value={formData.phone} onChange={handleChange} margin="dense" />
          <TextField fullWidth label="Website" name="website" value={formData.website} onChange={handleChange} margin="dense" />
          <TextField fullWidth label="Address" name="address" value={formData.address} onChange={handleChange} margin="dense" multiline rows={2} />
          {!editOrg && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Primary Contact</Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <TextField fullWidth label="First Name" name="contact_first_name" value={formData.contact_first_name} onChange={handleChange} margin="dense" />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="Last Name" name="contact_last_name" value={formData.contact_last_name} onChange={handleChange} margin="dense" />
                </Grid>
              </Grid>
              <TextField fullWidth label="Email" name="contact_email" type="email" value={formData.contact_email} onChange={handleChange} margin="dense" />
              <TextField fullWidth label="Phone" name="contact_phone" value={formData.contact_phone} onChange={handleChange} margin="dense" />
              <TextField fullWidth label="Job Title" name="contact_job_title" value={formData.contact_job_title} onChange={handleChange} margin="dense" />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}
            sx={{ backgroundColor: theme.palette.primary.main }}>
            {submitting ? <CircularProgress size={20} /> : editOrg ? 'Save Changes' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Organization</DialogTitle>
        <DialogContent>
          <Typography>Delete <strong>{deleteConfirm?.name}</strong>? This will also delete all associated engagements and findings.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => handleDelete(deleteConfirm)}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Organizations;
