import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, CardActionArea, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, InputLabel, FormControl, Chip, CircularProgress,
  Alert, IconButton, Divider, Tooltip,
} from '@mui/material';
import {
  Add, ArrowBack, Business, CalendarToday, Person, Edit,
  Assessment, CheckCircle, Schedule, Cancel,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import api from '../utils/api';
import { usePageBreadcrumbs } from '../components/MainLayout';

const ENGAGEMENT_TYPES = [
  { value: 'WEB_APP', label: 'Web Application Penetration Test' },
  { value: 'MOBILE_APP', label: 'Mobile Application Penetration Test' },
  { value: 'NETWORK', label: 'Network Infrastructure Penetration Test' },
  { value: 'API', label: 'API Penetration Test' },
  { value: 'CLOUD', label: 'Cloud Infrastructure Penetration Test' },
  { value: 'SOCIAL', label: 'Social Engineering Assessment' },
  { value: 'PHYSICAL', label: 'Physical Security Assessment' },
  { value: 'RED_TEAM', label: 'Red Team Exercise' },
  { value: 'WIRELESS', label: 'Wireless Security Assessment' },
  { value: 'THICK_CLIENT', label: 'Thick Client Application Test' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_COLORS = {
  PLANNING: 'default',
  ACTIVE: 'success',
  REPORTING: 'warning',
  REVIEW: 'info',
  COMPLETED: 'success',
  ON_HOLD: 'warning',
  CANCELLED: 'error',
};

const ENGAGEMENT_STATUS_OPTIONS = [
  { value: 'PLANNING', label: 'Placeholder' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'REPORTING', label: 'Reporting' },
  { value: 'REVIEW', label: 'Client Review' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ON_HOLD', label: 'Delayed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const emptyEngagement = {
  name: '',
  description: '',
  engagement_type: '',
  status: 'PLANNING',
  start_date: null,
  end_date: null,
  report_due_date: null,
  lead_pentester: '',
  project_manager: '',
  scope: '',
};

const OrganizationDetail = () => {
  const theme = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [org, setOrg] = useState(null);
  const [engagements, setEngagements] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState(emptyEngagement);
  const [submitting, setSubmitting] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editData, setEditData] = useState(emptyEngagement);
  const [editId, setEditId] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [orgRes, engRes, usersRes] = await Promise.all([
        api.get(`/organizations/${id}/`),
        api.get(`/engagements/?organization=${id}`),
        api.get('/auth/users/'),
      ]);
      setOrg(orgRes.data);
      setEngagements(engRes.data.results || engRes.data);
      setUsers(usersRes.data.results || usersRes.data);
    } catch (err) {
      setError('Failed to load organization details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const breadcrumbs = useMemo(() => [
    { label: 'Organizations', to: '/organizations' },
    ...(org ? [{ label: org.name }] : []),
  ], [org]);
  usePageBreadcrumbs(breadcrumbs);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.engagement_type || !formData.start_date || !formData.end_date) {
      enqueueSnackbar('Name, type, start date, and end date are required', { variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        organization: parseInt(id),
        start_date: dayjs(formData.start_date).format('YYYY-MM-DD'),
        end_date: dayjs(formData.end_date).format('YYYY-MM-DD'),
        report_due_date: formData.report_due_date ? dayjs(formData.report_due_date).format('YYYY-MM-DD') : null,
        lead_pentester: formData.lead_pentester || null,
        project_manager: formData.project_manager || null,
      };
      const res = await api.post('/engagements/', payload);
      enqueueSnackbar('Engagement created', { variant: 'success' });
      setOpenDialog(false);
      setFormData(emptyEngagement);
      navigate(`/engagements/${res.data.id}`);
    } catch (err) {
      const msg = err.response?.data
        ? Object.values(err.response.data).flat().join(' ')
        : 'Failed to create engagement';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (eng, e) => {
    e.stopPropagation();
    setEditId(eng.id);
    setEditData({
      name:             eng.name || '',
      description:      eng.description || '',
      engagement_type:  eng.engagement_type || '',
      status:           eng.status || 'PLANNING',
      start_date:       eng.start_date ? dayjs(eng.start_date) : null,
      end_date:         eng.end_date   ? dayjs(eng.end_date)   : null,
      report_due_date:  eng.report_due_date ? dayjs(eng.report_due_date) : null,
      lead_pentester:   eng.lead_pentester  || '',
      project_manager:  eng.project_manager || '',
      scope:            eng.scope || '',
    });
    setEditDialog(true);
  };

  const handleEditSubmit = async () => {
    if (!editData.name.trim() || !editData.engagement_type || !editData.start_date || !editData.end_date) {
      enqueueSnackbar('Name, type, start date, and end date are required', { variant: 'error' });
      return;
    }
    setEditSubmitting(true);
    try {
      await api.patch(`/engagements/${editId}/`, {
        ...editData,
        start_date:      dayjs(editData.start_date).format('YYYY-MM-DD'),
        end_date:        dayjs(editData.end_date).format('YYYY-MM-DD'),
        report_due_date: editData.report_due_date ? dayjs(editData.report_due_date).format('YYYY-MM-DD') : null,
        lead_pentester:  editData.lead_pentester  || null,
        project_manager: editData.project_manager || null,
      });
      enqueueSnackbar('Engagement updated', { variant: 'success' });
      setEditDialog(false);
      fetchAll();
    } catch (err) {
      const msg = err.response?.data
        ? Object.values(err.response.data).flat().join(' ')
        : 'Failed to update engagement';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setEditSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !org) {
    return <Alert severity="error">{error || 'Organization not found'}</Alert>;
  }

  const pentesters = users.filter(u => ['PENTESTER', 'ADMIN', 'SUPERADMIN'].includes(u.role));
  const managers = users.filter(u => ['PROJECT_MANAGER', 'PENTESTER', 'ADMIN', 'SUPERADMIN'].includes(u.role));

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/organizations')} size="small">
              <ArrowBack />
            </IconButton>
            <Box
              sx={{
                width: 56, height: 56, borderRadius: 2,
                backgroundColor: theme.palette.primary.main,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Business sx={{ color: '#fff', fontSize: 32 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={700}>{org.name}</Typography>
              <Typography variant="body2" color="text.secondary">{org.description}</Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
            sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }}
          >
            New Engagement
          </Button>
        </Box>

        {/* Org Info Cards */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {org.primary_contact && (
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">Primary Contact</Typography>
                  <Typography variant="subtitle1" fontWeight={600}>{org.primary_contact.name}</Typography>
                  {org.primary_contact.job_title && (
                    <Typography variant="body2" color="text.secondary">{org.primary_contact.job_title}</Typography>
                  )}
                  {org.primary_contact.email && (
                    <Typography variant="body2">{org.primary_contact.email}</Typography>
                  )}
                  {org.primary_contact.phone && (
                    <Typography variant="body2">{org.primary_contact.phone}</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}
          <Grid item xs={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" fontWeight={700} color="primary">{org.engagement_count ?? engagements.length}</Typography>
                <Typography variant="body2" color="text.secondary">Engagements</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" fontWeight={700} color="primary">{org.user_count ?? 0}</Typography>
                <Typography variant="body2" color="text.secondary">Users</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Engagements */}
        <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>Engagements</Typography>

        {engagements.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Assessment sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No engagements yet</Typography>
              <Typography variant="body2" color="text.disabled" mb={3}>
                Create a new engagement to start a penetration testing project
              </Typography>
              <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}
                sx={{ backgroundColor: theme.palette.primary.main }}>
                New Engagement
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {engagements.map((eng) => (
              <Grid item xs={12} key={eng.id}>
                <Card sx={{ display: 'flex', alignItems: 'stretch' }}>
                  <CardActionArea onClick={() => navigate(`/engagements/${eng.id}`)} sx={{ flex: 1 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={600}>{eng.name}</Typography>
                            <Typography variant="body2" color="text.secondary">{eng.engagement_type_display}</Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            label={eng.status_display || eng.status}
                            size="small"
                            color={STATUS_COLORS[eng.status] || 'default'}
                          />
                          {eng.lead_pentester_name && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Person sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">{eng.lead_pentester_name}</Typography>
                            </Box>
                          )}
                          {eng.start_date && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {eng.start_date} — {eng.end_date}
                              </Typography>
                            </Box>
                          )}
                          <Chip label={`${eng.findings_count ?? 0} findings`} size="small" variant="outlined" />
                          {(eng.critical_findings_count > 0) && (
                            <Chip label={`${eng.critical_findings_count} critical`} size="small" color="error" />
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                  <Box sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
                    <Tooltip title="Edit engagement">
                      <IconButton size="small" onClick={(e) => openEditDialog(eng, e)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* New Engagement Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>New Engagement — {org.name}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField fullWidth label="Project Title *" name="name" value={formData.name}
                  onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Description" name="description" value={formData.description}
                  onChange={handleChange} multiline rows={2} />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Project Type *</InputLabel>
                  <Select name="engagement_type" value={formData.engagement_type}
                    onChange={handleChange} label="Project Type *">
                    {ENGAGEMENT_TYPES.map(t => (
                      <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select name="status" value={formData.status} onChange={handleChange} label="Status">
                    {ENGAGEMENT_STATUS_OPTIONS.map(s => (
                      <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <DatePicker
                  label="Start Date *"
                  value={formData.start_date}
                  onChange={(val) => setFormData({ ...formData, start_date: val })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <DatePicker
                  label="End Date *"
                  value={formData.end_date}
                  onChange={(val) => setFormData({ ...formData, end_date: val })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <DatePicker
                  label="Report Due Date"
                  value={formData.report_due_date}
                  onChange={(val) => setFormData({ ...formData, report_due_date: val })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Lead Pentester</InputLabel>
                  <Select name="lead_pentester" value={formData.lead_pentester}
                    onChange={handleChange} label="Lead Pentester">
                    <MenuItem value=""><em>None</em></MenuItem>
                    {pentesters.map(u => (
                      <MenuItem key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Project Manager</InputLabel>
                  <Select name="project_manager" value={formData.project_manager}
                    onChange={handleChange} label="Project Manager">
                    <MenuItem value=""><em>None</em></MenuItem>
                    {managers.map(u => (
                      <MenuItem key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Scope" name="scope" value={formData.scope}
                  onChange={handleChange} multiline rows={3}
                  placeholder="Describe in-scope targets and systems..." />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit} disabled={submitting}
              sx={{ backgroundColor: theme.palette.primary.main }}>
              {submitting ? <CircularProgress size={20} /> : 'Create Engagement'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Engagement Dialog */}
        <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Edit Engagement</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField fullWidth label="Project Title *" value={editData.name}
                  onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Description" value={editData.description}
                  onChange={e => setEditData(p => ({ ...p, description: e.target.value }))} multiline rows={2} />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Project Type *</InputLabel>
                  <Select value={editData.engagement_type} label="Project Type *"
                    onChange={e => setEditData(p => ({ ...p, engagement_type: e.target.value }))}>
                    {ENGAGEMENT_TYPES.map(t => (
                      <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select value={editData.status} label="Status"
                    onChange={e => setEditData(p => ({ ...p, status: e.target.value }))}>
                    {ENGAGEMENT_STATUS_OPTIONS.map(s => (
                      <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <DatePicker label="Start Date *" value={editData.start_date}
                  onChange={val => setEditData(p => ({ ...p, start_date: val }))}
                  slotProps={{ textField: { fullWidth: true } }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <DatePicker label="End Date *" value={editData.end_date}
                  onChange={val => setEditData(p => ({ ...p, end_date: val }))}
                  slotProps={{ textField: { fullWidth: true } }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <DatePicker label="Report Due Date" value={editData.report_due_date}
                  onChange={val => setEditData(p => ({ ...p, report_due_date: val }))}
                  slotProps={{ textField: { fullWidth: true } }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Lead Pentester</InputLabel>
                  <Select value={editData.lead_pentester} label="Lead Pentester"
                    onChange={e => setEditData(p => ({ ...p, lead_pentester: e.target.value }))}>
                    <MenuItem value=""><em>None</em></MenuItem>
                    {pentesters.map(u => (
                      <MenuItem key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Project Manager</InputLabel>
                  <Select value={editData.project_manager} label="Project Manager"
                    onChange={e => setEditData(p => ({ ...p, project_manager: e.target.value }))}>
                    <MenuItem value=""><em>None</em></MenuItem>
                    {managers.map(u => (
                      <MenuItem key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Scope" value={editData.scope}
                  onChange={e => setEditData(p => ({ ...p, scope: e.target.value }))}
                  multiline rows={3} placeholder="Describe in-scope targets and systems..." />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleEditSubmit} disabled={editSubmitting}
              sx={{ backgroundColor: theme.palette.primary.main }}>
              {editSubmitting ? <CircularProgress size={20} /> : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default OrganizationDetail;
