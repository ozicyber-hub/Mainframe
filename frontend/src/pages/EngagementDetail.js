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

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error || !engagement) return <Alert severity="error">{error || 'Engagement not found'}</Alert>;

  return (
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
          <Button variant="contained" startIcon={<Add />} onClick={openReportDialog}
            sx={{ backgroundColor: theme.palette.primary.main }}>
            New Report
          </Button>
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
  );
};

export default EngagementDetail;
