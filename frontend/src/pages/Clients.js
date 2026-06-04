import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Chip, IconButton, Grid,
  MenuItem, Alert, CircularProgress, Avatar, Tooltip, Stack,
} from '@mui/material';
import { Add, Edit, Delete, Email, Refresh, Info, Search } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import api from '../utils/api';

const ROLE_OPTIONS = [
  { value: 'CLIENT',          label: 'Client Portal User',   color: '#7f8c8d' },
  { value: 'PENTESTER',       label: 'Penetration Tester',   color: '#2980b9' },
  { value: 'GRC_CONSULTANT',  label: 'GRC Consultant',       color: '#0f766e' },
  { value: 'PROJECT_MANAGER', label: 'Project Manager',      color: '#8e44ad' },
  { value: 'ADMIN',           label: 'Admin',                color: '#24483E' },
];

const BLANK_FORM = {
  first_name: '', last_name: '', email: '',
  phone: '', role: 'CLIENT', organization: '',
};

const FILTERABLE_ROLES = [
  { value: 'ALL', label: 'All roles' },
  { value: 'PENTESTER', label: 'Penetration Testers' },
  { value: 'GRC_CONSULTANT', label: 'GRC Consultants' },
  { value: 'PROJECT_MANAGER', label: 'Project Managers' },
  { value: 'CLIENT', label: 'Client Team' },
];

const RoleChip = ({ role }) => {
  const opt = ROLE_OPTIONS.find(r => r.value === role);
  return (
    <Chip
      label={opt?.label || role}
      size="small"
      sx={{
        bgcolor: opt ? `${opt.color}20` : '#f5f5f5',
        color: opt?.color || '#555',
        border: `1px solid ${opt?.color || '#ddd'}`,
        fontWeight: 600,
        fontSize: '0.65rem',
      }}
    />
  );
};

const Clients = () => {
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [createDlg, setCreateDlg] = useState(false);
  const [editDlg, setEditDlg] = useState(null);
  const [deleteDlg, setDeleteDlg] = useState(null);
  const [formData, setFormData] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [orgFilter, setOrgFilter] = useState('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, oRes] = await Promise.all([
        api.get('/auth/users/'),
        api.get('/organizations/'),
      ]);
      setUsers((uRes.data.results || uRes.data || []).filter(u => u.role !== undefined));
      setOrganizations(oRes.data.results || oRes.data || []);
    } catch {
      setError('Failed to load users.');
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setFormData(BLANK_FORM);
    setFormErr('');
    setCreateDlg(true);
  };

  const openEdit = (user) => {
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone || '',
      role: user.role || 'CLIENT',
      organization: user.organization || '',
    });
    setFormErr('');
    setEditDlg(user);
  };

  const handleCreate = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      setFormErr('First name, last name and email are required.');
      return;
    }
    setSaving(true);
    setFormErr('');
    try {
      await api.post('/auth/users/', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        organization: formData.organization || null,
      });
      setCreateDlg(false);
      setSuccess(`${ROLE_OPTIONS.find(r => r.value === formData.role)?.label || formData.role} account created successfully.`);
      fetchData();
    } catch (e) {
      const data = e.response?.data;
      setFormErr(data?.email?.[0] || data?.error || JSON.stringify(data) || 'Failed to create account.');
    }
    setSaving(false);
  };

  const handleEdit = async () => {
    setSaving(true);
    setFormErr('');
    try {
      await api.patch(`/auth/users/${editDlg.id}/`, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        role: formData.role,
        organization: formData.organization || null,
      });
      setEditDlg(null);
      setSuccess('User updated.');
      fetchData();
    } catch (e) {
      setFormErr(e.response?.data?.error || 'Failed to update user.');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/auth/users/${deleteDlg.id}/`);
      setDeleteDlg(null);
      setSuccess('User account removed.');
      fetchData();
    } catch {
      setError('Failed to delete user.');
    }
  };

  const orgName = (id) => organizations.find(o => o.id === id)?.name || '-';

  const visibleUsers = users.filter(u => !['ADMIN', 'SUPERADMIN'].includes(u.role)).filter(u => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [
      u.first_name,
      u.last_name,
      u.email,
      u.phone,
      orgName(u.organization),
      ROLE_OPTIONS.find(r => r.value === u.role)?.label,
    ].some(value => String(value || '').toLowerCase().includes(term));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesOrg = orgFilter === 'ALL' || String(u.organization || '') === String(orgFilter);
    return matchesSearch && matchesRole && matchesOrg;
  });

  const categoryGroups = [
    {
      title: 'Testers and Consultants',
      description: 'Technical delivery users including penetration testers and GRC consultants.',
      rows: visibleUsers.filter(u => ['PENTESTER', 'GRC_CONSULTANT'].includes(u.role)),
      empty: 'No testers or consultants match the current filters.',
    },
    {
      title: 'Project Manager',
      description: 'Project managers coordinating client delivery and reporting.',
      rows: visibleUsers.filter(u => u.role === 'PROJECT_MANAGER'),
      empty: 'No project managers match the current filters.',
    },
    {
      title: 'Client Team',
      description: 'Client portal users who can access their organisation findings, reports and evidence.',
      rows: visibleUsers.filter(u => u.role === 'CLIENT'),
      empty: 'No client team members match the current filters.',
    },
  ];

  const renderTable = (rows, empty) => (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>User</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Organization</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                {empty}
              </TableCell>
            </TableRow>
          )}
          {rows.map((u) => (
            <TableRow key={u.id} hover>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar src={u.avatar} sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main, fontSize: '0.75rem' }}>
                    {u.first_name?.[0]}{u.last_name?.[0]}
                  </Avatar>
                  <Typography variant="body2" fontWeight={500}>
                    {u.first_name} {u.last_name}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell><RoleChip role={u.role} /></TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {u.email}
                  <Tooltip title="Send email">
                    <IconButton size="small" component="a" href={`mailto:${u.email}`}><Email fontSize="small" /></IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
              <TableCell>{u.phone || '-'}</TableCell>
              <TableCell>{orgName(u.organization)}</TableCell>
              <TableCell>
                <Chip
                  label={u.is_verified ? 'Verified' : 'Pending'}
                  size="small"
                  color={u.is_verified ? 'success' : 'warning'}
                  variant="outlined"
                />
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(u)}><Edit fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteDlg(u)}><Delete fontSize="small" /></IconButton></Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Team &amp; Clients</Typography>
          <Typography variant="body2" color="text.secondary">Manage portal accounts, grouped by client and delivery role</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh"><IconButton onClick={fetchData}><Refresh /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            Add User
          </Button>
        </Box>
      </Box>

      <Alert severity="info" icon={<Info />} sx={{ mb: 2 }}>
        Admin users are managed in Admin Portal RBAC. This page is for client-facing teams and delivery users.
      </Alert>

      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, phone, role or client"
            size="small"
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: <Search fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
          <TextField
            select
            size="small"
            label="Role"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            sx={{ minWidth: 210 }}
          >
            {FILTERABLE_ROLES.map(role => (
              <MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Client"
            value={orgFilter}
            onChange={e => setOrgFilter(e.target.value)}
            sx={{ minWidth: 240 }}
          >
            <MenuItem value="ALL">All clients</MenuItem>
            {organizations.map(o => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
          </TextField>
        </Stack>
      </Paper>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {categoryGroups.map(group => (
            <Box key={group.title}>
              <Box sx={{ mb: 1 }}>
                <Typography variant="h6" fontWeight={700}>{group.title}</Typography>
                <Typography variant="body2" color="text.secondary">{group.description}</Typography>
              </Box>
              {renderTable(group.rows, group.empty)}
            </Box>
          ))}
        </Box>
      )}

      <Dialog open={createDlg} onClose={() => setCreateDlg(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create User Account</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField label="Role" value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                select fullWidth size="small" required>
                {ROLE_OPTIONS.map(r => (
                  <MenuItem key={r.value} value={r.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: r.color }} />
                      {r.label}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField label="First Name" value={formData.first_name} onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))} fullWidth size="small" required />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Last Name" value={formData.last_name} onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))} fullWidth size="small" required />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Email" type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} fullWidth size="small" required />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Phone" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} fullWidth size="small" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Organization" value={formData.organization} onChange={e => setFormData(p => ({ ...p, organization: e.target.value }))}
                select fullWidth size="small">
                <MenuItem value="">- None -</MenuItem>
                {organizations.map(o => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
          {formErr && <Alert severity="error" sx={{ mt: 1.5 }}>{formErr}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDlg(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating...' : 'Create Account'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editDlg} onClose={() => setEditDlg(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField label="Role" value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                select fullWidth size="small">
                {ROLE_OPTIONS.map(r => (
                  <MenuItem key={r.value} value={r.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: r.color }} />
                      {r.label}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField label="First Name" value={formData.first_name} onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))} fullWidth size="small" />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Last Name" value={formData.last_name} onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))} fullWidth size="small" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Phone" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} fullWidth size="small" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Organization" value={formData.organization} onChange={e => setFormData(p => ({ ...p, organization: e.target.value }))}
                select fullWidth size="small">
                <MenuItem value="">- None -</MenuItem>
                {organizations.map(o => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
          {formErr && <Alert severity="error" sx={{ mt: 1.5 }}>{formErr}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDlg(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleEdit} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteDlg} onClose={() => setDeleteDlg(null)} maxWidth="xs">
        <DialogTitle>Remove User Account</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteDlg?.first_name} {deleteDlg?.last_name}</strong> ({deleteDlg?.email})?
            This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDlg(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Clients;
