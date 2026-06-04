import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, CardActionArea, Grid,
  Chip, CircularProgress, Alert, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, InputLabel, FormControl,
  Avatar, Divider,
} from '@mui/material';
import {
  Add, ArrowBack, CalendarToday, Person, Description, Delete,
  Edit, Close, Group,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { usePageBreadcrumbs } from '../components/MainLayout';

const STATUS_COLORS = {
  PLANNING: 'default', ACTIVE: 'success', REPORTING: 'warning',
  REVIEW: 'info', COMPLETED: 'success', ON_HOLD: 'warning', CANCELLED: 'error',
};

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

const ENGAGEMENT_STATUS_OPTIONS = [
  { value: 'PLANNING', label: 'Placeholder' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'REPORTING', label: 'Reporting' },
  { value: 'REVIEW', label: 'Client Review' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ON_HOLD', label: 'Delayed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const EngagementDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuthStore();
  const isClient = user?.role === 'CLIENT';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  const [engagement, setEngagement] = useState(null);
  const [reports, setReports] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportDialog, setReportDialog] = useState(false);
  const [reportForm, setReportForm] = useState({ title: '', version: '1.0', template: '' });
  const [submitting, setSubmitting] = useState(false);
  const [allMembers, setAllMembers] = useState([]);
  const [teamDlg, setTeamDlg] = useState(false);
  const [teamSaving, setTeamSaving] = useState(false);
  const [addMemberId, setAddMemberId] = useState('');
  const [editDlg, setEditDlg] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Delete this report? This cannot be undone.')) return;
    try {
      await api.delete(`/reports/${reportId}/`);
      setReports(prev => prev.filter(r => r.id !== reportId));
      enqueueSnackbar('Report deleted', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete report', { variant: 'error' });
    }
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const calls = [
        api.get(`/engagements/${id}/`),
        api.get(`/reports/?engagement=${id}`),
        api.get('/reports/templates/'),
      ];
      if (!isClient) calls.push(api.get('/auth/users/'));
      const [engRes, reportsRes, templatesRes, membersRes] = await Promise.all(calls);
      setEngagement(engRes.data);
      setReports(reportsRes.data.results || reportsRes.data);
      setTemplates(templatesRes.data.results || templatesRes.data);
      if (membersRes) {
        setAllMembers((membersRes.data.results || membersRes.data).filter(m => m.role !== 'CLIENT'));
      }
    } catch {
      setError('Failed to load engagement.');
    } finally {
      setLoading(false);
    }
  }, [id, isClient]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const orgId = engagement?.organization;
  const breadcrumbs = useMemo(() => {
    if (!engagement) return [];
    const items = [];
    if (!isClient) items.push({ label: 'Organizations', to: '/organizations' });
    if (!isClient && engagement.organization_name) {
      items.push({ label: engagement.organization_name, to: `/organizations/${engagement.organization}` });
    }
    items.push({ label: engagement.name });
    return items;
  }, [engagement, isClient]);
  usePageBreadcrumbs(breadcrumbs);

  const openReportDialog = () => {
    setReportForm({
      title: engagement ? `${engagement.name} — Penetration Test Report` : '',
      version: `1.${reports.length}`,
      template: '',
    });
    setReportDialog(true);
  };

  const handleCreateReport = async () => {
    if (!reportForm.title.trim()) {
      enqueueSnackbar('Report title is required', { variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/reports/', {
        engagement: parseInt(id),
        title: reportForm.title,
        version: reportForm.version,
        template: reportForm.template || null,
      });
      enqueueSnackbar('Report created', { variant: 'success' });
      setReportDialog(false);
      navigate(`/reports/${res.data.id}`);
    } catch (err) {
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Failed to create report';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveTeamMember = async (memberId) => {
    setTeamSaving(true);
    try {
      const updated = (engagement.team_members || []).filter(id => id !== memberId);
      const res = await api.patch(`/engagements/${engagement.id}/`, { team_members: updated });
      setEngagement(res.data);
      enqueueSnackbar('Team member removed', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to update team', { variant: 'error' });
    }
    setTeamSaving(false);
  };

  const handleAddTeamMember = async () => {
    if (!addMemberId) return;
    setTeamSaving(true);
    try {
      const current = engagement.team_members || [];
      if (!current.includes(parseInt(addMemberId))) {
        const res = await api.patch(`/engagements/${engagement.id}/`, {
          team_members: [...current, parseInt(addMemberId)],
        });
        setEngagement(res.data);
      }
      setAddMemberId('');
      enqueueSnackbar('Team member added', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to update team', { variant: 'error' });
    }
    setTeamSaving(false);
  };

  const handleChangeLead = async (newLeadId) => {
    if (!newLeadId) return;
    setTeamSaving(true);
    try {
      const res = await api.patch(`/engagements/${engagement.id}/`, {
        lead_pentester: parseInt(newLeadId),
      });
      setEngagement(res.data);
      enqueueSnackbar('Lead pentester updated', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to update lead', { variant: 'error' });
    }
    setTeamSaving(false);
  };

  const handleChangeProjectManager = async (newManagerId) => {
    setTeamSaving(true);
    try {
      const res = await api.patch(`/engagements/${engagement.id}/`, {
        project_manager: newManagerId ? parseInt(newManagerId, 10) : null,
      });
      setEngagement(res.data);
      enqueueSnackbar(newManagerId ? 'Project manager updated' : 'Project manager removed', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to update project manager', { variant: 'error' });
    }
    setTeamSaving(false);
  };

  const handleUnassignLead = async () => {
    setTeamSaving(true);
    try {
      const res = await api.patch(`/engagements/${engagement.id}/`, { lead_pentester: null });
      setEngagement(res.data);
      enqueueSnackbar('Lead pentester unassigned', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to unassign lead', { variant: 'error' });
    }
    setTeamSaving(false);
  };

  const openEditDialog = () => {
    setEditForm({
      name: engagement.name || '',
      description: engagement.description || '',
      engagement_type: engagement.engagement_type || '',
      status: engagement.status || 'PLANNING',
      start_date: engagement.start_date ? dayjs(engagement.start_date) : null,
      end_date: engagement.end_date ? dayjs(engagement.end_date) : null,
      report_due_date: engagement.report_due_date ? dayjs(engagement.report_due_date) : null,
      lead_pentester: engagement.lead_pentester || '',
      project_manager: engagement.project_manager || '',
      scope: engagement.scope || '',
      out_of_scope: engagement.out_of_scope || '',
      objectives: engagement.objectives || '',
    });
    setEditDlg(true);
  };

  const handleSaveEngagement = async () => {
    if (!editForm?.name?.trim() || !editForm.engagement_type || !editForm.start_date || !editForm.end_date) {
      enqueueSnackbar('Name, type, start date, and end date are required', { variant: 'error' });
      return;
    }
    setEditSaving(true);
    try {
      const res = await api.patch(`/engagements/${engagement.id}/`, {
        ...editForm,
        start_date: dayjs(editForm.start_date).format('YYYY-MM-DD'),
        end_date: dayjs(editForm.end_date).format('YYYY-MM-DD'),
        report_due_date: editForm.report_due_date ? dayjs(editForm.report_due_date).format('YYYY-MM-DD') : null,
        lead_pentester: editForm.lead_pentester || null,
        project_manager: editForm.project_manager || null,
      });
      setEngagement(res.data);
      setEditDlg(false);
      enqueueSnackbar('Engagement updated', { variant: 'success' });
    } catch (err) {
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Failed to update engagement';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error || !engagement) return <Alert severity="error">{error || 'Engagement not found'}</Alert>;

  const pentesters = allMembers.filter(m => ['PENTESTER', 'ADMIN', 'SUPERADMIN'].includes(m.role));
  const managers = allMembers.filter(m => ['PROJECT_MANAGER', 'PENTESTER', 'ADMIN', 'SUPERADMIN'].includes(m.role));

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(isClient ? '/engagements' : `/organizations/${orgId}`)} size="small">
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight={700}>{engagement.name}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
              <Chip label={engagement.engagement_type_display || engagement.engagement_type} size="small" variant="outlined" />
              <Chip label={engagement.status_display || engagement.status} size="small"
                color={STATUS_COLORS[engagement.status] || 'default'} />
              {engagement.organization_name && (
                <Chip label={engagement.organization_name} size="small" variant="outlined" />
              )}
            </Box>
          </Box>
        </Box>
        {!isClient && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {isAdmin && (
              <Button variant="outlined" startIcon={<Edit />} onClick={openEditDialog}>
                Manage Engagement
              </Button>
            )}
            <Button variant="contained" startIcon={<Add />} onClick={openReportDialog}
              sx={{ backgroundColor: theme.palette.primary.main }}>
              New Report
            </Button>
          </Box>
        )}
      </Box>

      {/* Info Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { icon: <Person sx={{ fontSize: 16, color: 'text.secondary' }} />, label: 'Lead Pentester', value: engagement.lead_pentester_name || '—' },
          { icon: <Person sx={{ fontSize: 16, color: 'text.secondary' }} />, label: 'Project Manager', value: engagement.project_manager_name || '—' },
          { icon: <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />, label: 'Start Date', value: engagement.start_date || '—' },
          { icon: <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />, label: 'End Date', value: engagement.end_date || '—' },
        ].map((item) => (
          <Grid item xs={6} md={3} key={item.label}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  {item.icon}
                  <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                </Box>
                <Typography variant="body1" fontWeight={600}>{item.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Scope */}
      {engagement.scope && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Scope</Typography>
            <Typography variant="body2">{engagement.scope}</Typography>
          </CardContent>
        </Card>
      )}

      {/* Team */}
      {!isClient && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Group sx={{ fontSize: 20, color: 'text.secondary' }} />
                <Typography variant="subtitle1" fontWeight={700}>Team</Typography>
              </Box>
              {isAdmin && (
                <Button size="small" startIcon={<Edit />} onClick={() => setTeamDlg(true)}>Manage</Button>
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>LEAD PENTESTER</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                {engagement.lead_pentester_name ? (
                  <>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: theme.palette.primary.main, fontSize: '0.65rem' }}>
                      {engagement.lead_pentester_name[0]}
                    </Avatar>
                    <Typography variant="body2" fontWeight={600}>{engagement.lead_pentester_name}</Typography>
                    {isAdmin && (
                      <Tooltip title="Unassign lead">
                        <IconButton size="small" onClick={handleUnassignLead} disabled={teamSaving}>
                          <Close fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">— Unassigned</Typography>
                )}
              </Box>
            </Box>

            {engagement.project_manager_name && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>PROJECT MANAGER</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: '#2980b9', fontSize: '0.65rem' }}>
                    {engagement.project_manager_name[0]}
                  </Avatar>
                  <Typography variant="body2" fontWeight={600}>{engagement.project_manager_name}</Typography>
                </Box>
              </Box>
            )}

            {engagement.team_members_details?.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>TEAM MEMBERS</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.75 }}>
                  {engagement.team_members_details.map(m => (
                    <Chip
                      key={m.id}
                      label={`${m.first_name} ${m.last_name}`}
                      size="small"
                      avatar={<Avatar sx={{ bgcolor: theme.palette.primary.main, fontSize: '0.55rem' }}>{m.first_name?.[0]}</Avatar>}
                      onDelete={isAdmin ? () => handleRemoveTeamMember(m.id) : undefined}
                      deleteIcon={isAdmin ? <Close sx={{ fontSize: '14px !important' }} /> : undefined}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {!engagement.lead_pentester_name && !engagement.project_manager_name && !engagement.team_members_details?.length && (
              <Typography variant="body2" color="text.secondary">No team assigned yet.</Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reports */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" fontWeight={600}>Reports ({reports.length})</Typography>
          {!isClient && <Button variant="outlined" startIcon={<Add />} onClick={openReportDialog}>New Report</Button>}
        </Box>

        {reports.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Description sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No reports yet</Typography>
              <Typography variant="body2" color="text.disabled" mb={3}>
                {isClient ? 'No reports have been published for this engagement yet.' : 'Create a report to begin documenting your findings.'}
              </Typography>
              {!isClient && (
                <Button variant="contained" startIcon={<Add />} onClick={openReportDialog}
                  sx={{ backgroundColor: theme.palette.primary.main }}>
                  Create Report
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {reports.map((report) => (
              <Grid item xs={12} md={6} key={report.id}>
                <Card>
                  <CardActionArea onClick={() => navigate(`/reports/${report.id}`)}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" fontWeight={600}>{report.title}</Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                            <Chip label={`v${report.version}`} size="small" variant="outlined" />
                            <Chip label={report.is_draft ? 'Draft' : 'Published'} size="small"
                              color={report.is_draft ? 'default' : 'success'} />
                            <Chip label={`${report.findings_count ?? 0} findings`} size="small" variant="outlined" />
                          </Box>
                        </Box>
                        <Description sx={{ color: 'text.disabled', mt: 0.5 }} />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                  {!isClient && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1, pb: 0.5 }}>
                      <IconButton size="small" color="error"
                        onClick={e => { e.stopPropagation(); handleDeleteReport(report.id); }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Team Management Dialog */}
      <Dialog open={teamDlg} onClose={() => setTeamDlg(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Manage Team</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Lead Pentester</InputLabel>
            <Select
              value={engagement.lead_pentester || ''}
              label="Lead Pentester"
              onChange={(e) => e.target.value ? handleChangeLead(e.target.value) : handleUnassignLead()}
              disabled={teamSaving}
            >
              <MenuItem value=""><em>No lead pentester</em></MenuItem>
              {pentesters.map(m => (
                <MenuItem key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.email})</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Project Manager</InputLabel>
            <Select
              value={engagement.project_manager || ''}
              label="Project Manager"
              onChange={(e) => handleChangeProjectManager(e.target.value)}
              disabled={teamSaving}
            >
              <MenuItem value=""><em>No project manager</em></MenuItem>
              {managers.map(m => (
                <MenuItem key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.email})</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider />

          <Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Additional Team Members</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Add team member</InputLabel>
                <Select
                  value={addMemberId}
                  label="Add team member"
                  onChange={(e) => setAddMemberId(e.target.value)}
                  disabled={teamSaving}
                >
                  <MenuItem value=""><em>Select team member</em></MenuItem>
                  {pentesters
                    .filter(m =>
                      !(engagement.team_members || []).some(id => Number(id) === Number(m.id)) &&
                      Number(engagement.lead_pentester || 0) !== Number(m.id)
                    )
                    .map(m => (
                      <MenuItem key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.email})</MenuItem>
                    ))}
                </Select>
              </FormControl>
              <Button variant="contained" onClick={handleAddTeamMember} disabled={!addMemberId || teamSaving}>
                Add
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {engagement.team_members_details?.length ? engagement.team_members_details.map(m => (
                <Chip
                  key={m.id}
                  label={`${m.first_name} ${m.last_name}`}
                  onDelete={() => handleRemoveTeamMember(m.id)}
                  disabled={teamSaving}
                />
              )) : (
                <Typography variant="body2" color="text.secondary">No additional team members.</Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamDlg(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Engagement Dialog */}
      <Dialog open={editDlg} onClose={() => setEditDlg(false)} maxWidth="md" fullWidth>
        <DialogTitle>Manage Engagement Settings</DialogTitle>
        {editForm && (
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField fullWidth label="Project Title *" value={editForm.name}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Description" value={editForm.description}
                  onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} multiline rows={2} />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Project Type *</InputLabel>
                  <Select value={editForm.engagement_type} label="Project Type *"
                    onChange={e => setEditForm(p => ({ ...p, engagement_type: e.target.value }))}>
                    {ENGAGEMENT_TYPES.map(t => (
                      <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select value={editForm.status} label="Status"
                    onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                    {ENGAGEMENT_STATUS_OPTIONS.map(s => (
                      <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <DatePicker label="Start Date *" value={editForm.start_date}
                  onChange={val => setEditForm(p => ({ ...p, start_date: val }))}
                  slotProps={{ textField: { fullWidth: true } }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <DatePicker label="End Date *" value={editForm.end_date}
                  onChange={val => setEditForm(p => ({ ...p, end_date: val }))}
                  slotProps={{ textField: { fullWidth: true } }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <DatePicker label="Report Due Date" value={editForm.report_due_date}
                  onChange={val => setEditForm(p => ({ ...p, report_due_date: val }))}
                  slotProps={{ textField: { fullWidth: true } }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Lead Pentester</InputLabel>
                  <Select value={editForm.lead_pentester} label="Lead Pentester"
                    onChange={e => setEditForm(p => ({ ...p, lead_pentester: e.target.value }))}>
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
                  <Select value={editForm.project_manager} label="Project Manager"
                    onChange={e => setEditForm(p => ({ ...p, project_manager: e.target.value }))}>
                    <MenuItem value=""><em>None</em></MenuItem>
                    {managers.map(u => (
                      <MenuItem key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Scope" value={editForm.scope}
                  onChange={e => setEditForm(p => ({ ...p, scope: e.target.value }))}
                  multiline rows={3} />
              </Grid>
            </Grid>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setEditDlg(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEngagement} disabled={editSaving}
            sx={{ backgroundColor: theme.palette.primary.main }}>
            {editSaving ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Report Dialog */}
      <Dialog open={reportDialog} onClose={() => setReportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Report — {engagement.name}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Template (optional)</InputLabel>
            <Select value={reportForm.template}
              onChange={(e) => setReportForm({ ...reportForm, template: e.target.value })}
              label="Template (optional)">
              <MenuItem value=""><em>No template — blank report</em></MenuItem>
              {templates.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField fullWidth label="Report Title *" value={reportForm.title} margin="dense"
            onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })} />
          <TextField fullWidth label="Version" value={reportForm.version} margin="dense"
            onChange={(e) => setReportForm({ ...reportForm, version: e.target.value })}
            placeholder="e.g. 1.0" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReportDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateReport} disabled={submitting}
            sx={{ backgroundColor: theme.palette.primary.main }}>
            {submitting ? <CircularProgress size={20} /> : 'Create Report'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </LocalizationProvider>
  );
};

export default EngagementDetail;
