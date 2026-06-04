import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Grid, Card, CardContent, CardActionArea, CardActions,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Alert, CircularProgress, LinearProgress,
  Paper, Tabs, Tab, ListSubheader, Divider, IconButton, Tooltip,
} from '@mui/material';
import { Add, FolderSpecial, Star, PlayArrow, Delete, Edit, CalendarToday, Person } from '@mui/icons-material';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';

const FRAMEWORK_COLORS = {
  NIST_CSF_2:      '#1565c0',
  NIST_800_171_R3: '#283593',
  ISO_27001_2022:  '#1b5e20',
  SOC2:            '#4a148c',
  HIPAA:           '#b71c1c',
};

const ASMT_FRAMEWORK_COLORS = {
  ESSENTIAL_EIGHT: '#24483E',
  CIS:             '#8e44ad',
  AESCSF:          '#b7410e',
  AESCSF_V1:       '#8b2500',
  CUSTOM:          '#7f8c8d',
};

const ASMT_FRAMEWORK_LABELS = {
  ESSENTIAL_EIGHT: 'Essential Eight',
  CIS:             'CIS Controls v8',
  AESCSF:          'AESCSF 2023',
  AESCSF_V1:       'AESCSF v1',
  CUSTOM:          'Custom',
};

const ASMT_STATUS_COLOR = {
  DRAFT:       'default',
  IN_PROGRESS: 'warning',
  COMPLETED:   'success',
  ARCHIVED:    'default',
};

const ASMT_BLANK = { title: '', template: '', engagement: '', assessor: '', grc_consultant: '', start_date: '', end_date: '', notes: '', baseline: '' };

const FRAMEWORK_VENDOR_GROUPS = [
  { vendor: 'NIST',   keys: ['NIST_CSF_2', 'NIST_800_171_R3'] },
  { vendor: 'ISO/IEC',keys: ['ISO_27001_2022'] },
  { vendor: 'AICPA',  keys: ['SOC2'] },
  { vendor: 'HHS',    keys: ['HIPAA'] },
];

const STATUS_CONFIG = {
  ACTIVE:    { label: 'Active',    color: 'success' },
  COMPLETED: { label: 'Completed', color: 'info'    },
  ARCHIVED:  { label: 'Archived',  color: 'default' },
};

const STATUS_TABS = ['ALL', 'ACTIVE', 'COMPLETED', 'ARCHIVED'];

const BLANK_FORM = {
  title:       '',
  description: '',
  framework:   '',
  target_date: '',
  org:         '',
};

export default function GrcProjects() {
  const navigate   = useNavigate();
  const { user }   = useAuthStore();
  const isClient   = user?.role === 'CLIENT';
  const canCreate  = ['ADMIN', 'SUPERADMIN', 'PENTESTER', 'PROJECT_MANAGER', 'GRC_CONSULTANT'].includes(user?.role);

  // GRC Projects state
  const [projects,   setProjects]   = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [orgs,       setOrgs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [tabIndex,   setTabIndex]   = useState(0);
  const [createDlg,  setCreateDlg]  = useState(false);
  const [form,       setForm]       = useState(BLANK_FORM);
  const [formErr,    setFormErr]    = useState('');
  const [saving,     setSaving]     = useState(false);

  // Assessments state
  const [assessments,    setAssessments]    = useState([]);
  const [asmtTemplates,  setAsmtTemplates]  = useState([]);
  const [asmtEngagements,setAsmtEngagements]= useState([]);
  const [asmtMembers,    setAsmtMembers]    = useState([]);
  const [asmtCreateDlg,  setAsmtCreateDlg]  = useState(false);
  const [asmtForm,       setAsmtForm]       = useState(ASMT_BLANK);
  const [asmtSaving,     setAsmtSaving]     = useState(false);
  const [asmtFormErr,    setAsmtFormErr]    = useState('');
  const [asmtDeleteDlg,  setAsmtDeleteDlg]  = useState(null);

  // Edit state — GRC Projects
  const [editProjectDlg,   setEditProjectDlg]   = useState(null);
  const [editProjectForm,  setEditProjectForm]   = useState({ title: '', description: '', target_date: '' });
  const [editProjectSaving,setEditProjectSaving] = useState(false);
  const [editProjectErr,   setEditProjectErr]    = useState('');

  // Edit state — Assessments
  const [editAsmtDlg,   setEditAsmtDlg]   = useState(null);
  const [editAsmtForm,  setEditAsmtForm]   = useState(ASMT_BLANK);
  const [editAsmtSaving,setEditAsmtSaving] = useState(false);
  const [editAsmtErr,   setEditAsmtErr]    = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pRes, fRes, aRes, tRes, eRes] = await Promise.all([
        api.get('/grc/projects/'),
        api.get('/grc/frameworks/'),
        api.get('/assessments/list/'),
        api.get('/assessments/templates/'),
        api.get('/engagements/'),
      ]);
      setProjects(pRes.data.results ?? pRes.data);
      setFrameworks(fRes.data.results ?? fRes.data);
      setAssessments(aRes.data.results ?? aRes.data);
      setAsmtTemplates(tRes.data.results ?? tRes.data);
      setAsmtEngagements(eRes.data.results ?? eRes.data);
      if (canCreate) {
        try {
          const oRes = await api.get('/organizations/');
          setOrgs(oRes.data.results ?? oRes.data);
        } catch { /* non-fatal */ }
        try {
          const mRes = await api.get('/auth/users/');
          setAsmtMembers(mRes.data.results ?? mRes.data);
        } catch { /* non-fatal */ }
      }
    } catch {
      setError('Failed to load GRC data.');
    }
    setLoading(false);
  }, [canCreate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async () => {
    if (!form.title.trim()) { setFormErr('Title is required.'); return; }
    if (!form.framework)    { setFormErr('Framework is required.'); return; }
    setSaving(true);
    setFormErr('');
    try {
      const payload = {
        title:       form.title.trim(),
        description: form.description.trim(),
        framework:   form.framework,
        target_date: form.target_date || null,
      };
      if (form.org) payload.organization = form.org;
      const res = await api.post('/grc/projects/', payload);
      setCreateDlg(false);
      setForm(BLANK_FORM);
      navigate(`/grc/${res.data.id}`);
    } catch (e) {
      setFormErr(e.response?.data?.error || e.response?.data?.detail || 'Failed to create project.');
    }
    setSaving(false);
  };

  const openCreate = () => { setForm(BLANK_FORM); setFormErr(''); setCreateDlg(true); };

  const openEditProject = (p, e) => {
    e.stopPropagation();
    setEditProjectForm({ title: p.title, description: p.description || '', target_date: p.target_date || '' });
    setEditProjectErr('');
    setEditProjectDlg(p);
  };

  const handleEditProject = async () => {
    if (!editProjectForm.title.trim()) { setEditProjectErr('Title is required.'); return; }
    setEditProjectSaving(true);
    setEditProjectErr('');
    try {
      const res = await api.patch(`/grc/projects/${editProjectDlg.id}/`, {
        title:       editProjectForm.title.trim(),
        description: editProjectForm.description.trim(),
        target_date: editProjectForm.target_date || null,
      });
      setProjects(prev => prev.map(p => p.id === editProjectDlg.id ? { ...p, ...res.data } : p));
      setEditProjectDlg(null);
    } catch (e) {
      setEditProjectErr(e.response?.data?.error || 'Failed to update project.');
    }
    setEditProjectSaving(false);
  };

  const openEditAsmt = (a, e) => {
    e.stopPropagation();
    setEditAsmtForm({
      title:          a.title,
      template:       a.template || '',
      engagement:     a.engagement || '',
      grc_consultant: a.grc_consultant || '',
      start_date:     a.start_date || '',
      end_date:       a.end_date || '',
      notes:          a.notes || '',
      baseline:       '',
    });
    setEditAsmtErr('');
    setEditAsmtDlg(a);
  };

  const handleEditAsmt = async () => {
    if (!editAsmtForm.title.trim()) { setEditAsmtErr('Title is required.'); return; }
    setEditAsmtSaving(true);
    setEditAsmtErr('');
    try {
      const res = await api.patch(`/assessments/list/${editAsmtDlg.id}/`, {
        title:          editAsmtForm.title.trim(),
        engagement:     editAsmtForm.engagement     || null,
        grc_consultant: editAsmtForm.grc_consultant || null,
        start_date:     editAsmtForm.start_date     || null,
        end_date:       editAsmtForm.end_date        || null,
        notes:          editAsmtForm.notes,
      });
      setAssessments(prev => prev.map(a => a.id === editAsmtDlg.id ? { ...a, ...res.data } : a));
      setEditAsmtDlg(null);
    } catch (e) {
      setEditAsmtErr(e.response?.data?.error || 'Failed to update assessment.');
    }
    setEditAsmtSaving(false);
  };

  const handleCreateAssessment = async () => {
    if (!asmtForm.title || !asmtForm.template) { setAsmtFormErr('Title and template are required.'); return; }
    setAsmtSaving(true); setAsmtFormErr('');
    try {
      const res = await api.post('/assessments/list/', {
        title:          asmtForm.title,
        template:       asmtForm.template,
        engagement:     asmtForm.engagement     || null,
        assessor:       asmtForm.assessor       || null,
        grc_consultant: asmtForm.grc_consultant || null,
        start_date:     asmtForm.start_date     || null,
        end_date:       asmtForm.end_date       || null,
        notes:          asmtForm.notes,
        baseline:       asmtForm.baseline       || null,
      });
      setAsmtCreateDlg(false);
      setAsmtForm(ASMT_BLANK);
      navigate(`/assessments/${res.data.id}`);
    } catch (e) {
      setAsmtFormErr(e.response?.data?.error || 'Failed to create assessment.');
    }
    setAsmtSaving(false);
  };

  const handleDeleteAssessment = async () => {
    if (!asmtDeleteDlg) return;
    try {
      await api.delete(`/assessments/list/${asmtDeleteDlg.id}/`);
      setAsmtDeleteDlg(null);
      setAssessments(prev => prev.filter(a => a.id !== asmtDeleteDlg.id));
    } catch {
      setError('Failed to delete assessment.');
    }
  };

  const asmtScoreColor = (score) => {
    if (score === null || score === undefined) return '#999';
    if (score >= 75) return '#27ae60';
    if (score >= 50) return '#f39c12';
    return '#c0392b';
  };

  const activeTab = STATUS_TABS[tabIndex];
  const displayed = projects.filter(p => activeTab === 'ALL' ? true : p.status === activeTab);

  const pctColor = (v) => v >= 80 ? '#27ae60' : v >= 40 ? '#f39c12' : '#3498db';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>GRC</Typography>
          <Typography variant="body2" color="text.secondary">
            Governance, Risk &amp; Compliance — projects, audits and compliance assessments
          </Typography>
        </Box>
        {canCreate && (
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}
            sx={{ bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>
            New Project
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>GRC Projects</Typography>

      {/* Status filter tabs */}
      <Paper sx={{ mb: 2 }} variant="outlined">
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          sx={{ px: 1, '& .MuiTab-root': { minWidth: 90, fontSize: '0.82rem' } }}
        >
          {STATUS_TABS.map((t, i) => {
            const count = t === 'ALL'
              ? projects.length
              : projects.filter(p => p.status === t).length;
            return (
              <Tab
                key={t}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {t === 'ALL' ? 'All' : STATUS_CONFIG[t]?.label ?? t}
                    <Chip label={count} size="small"
                      sx={{ height: 18, fontSize: '0.65rem', minWidth: 22, cursor: 'pointer' }} />
                  </Box>
                }
              />
            );
          })}
        </Tabs>
      </Paper>

      {/* Content */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>
      ) : displayed.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
          <FolderSpecial sx={{ fontSize: 56, color: '#e0e0e0', mb: 1 }} />
          <Typography variant="h6" gutterBottom>No projects found</Typography>
          <Typography variant="body2">
            {user?.role === 'CLIENT'
              ? 'No GRC projects have been shared with you yet.'
              : activeTab === 'ALL'
              ? 'Create a project to start tracking compliance controls.'
              : `No ${STATUS_CONFIG[activeTab]?.label ?? activeTab} projects.`}
          </Typography>
          {canCreate && activeTab === 'ALL' && (
            <Button variant="outlined" startIcon={<Add />} onClick={openCreate}
              sx={{ mt: 2, borderColor: '#1565c0', color: '#1565c0' }}>
              New Project
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2}>
          {displayed.map((p) => {
            const progress    = p.stats?.pct ?? 0;
            const progColor   = pctColor(progress);
            const fwColor     = FRAMEWORK_COLORS[p.framework_key] ?? '#546e7a';
            const statusCfg   = STATUS_CONFIG[p.status] ?? { label: p.status, color: 'default' };
            return (
              <Grid item xs={12} sm={6} lg={4} key={p.id}>
                <Card sx={{
                  height: '100%', display: 'flex', flexDirection: 'column',
                  border: '1px solid #e0e0e0', transition: 'box-shadow 0.15s, border-color 0.15s',
                  '&:hover': { boxShadow: 4, borderColor: fwColor },
                }}>
                  <CardActionArea onClick={() => navigate(`/grc/${p.id}`)}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.25 }}>
                        <Chip label={p.framework_name ?? p.framework_key} size="small"
                          sx={{ bgcolor: fwColor, color: '#fff', fontWeight: 700, fontSize: '0.62rem', maxWidth: 160 }} />
                        <Chip label={statusCfg.label} size="small" color={statusCfg.color}
                          variant="outlined" sx={{ fontWeight: 600, fontSize: '0.68rem' }} />
                      </Box>

                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5, lineHeight: 1.35 }}>
                        {p.title}
                      </Typography>

                      {p.target_date && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                          Target: {new Date(p.target_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Typography>
                      )}

                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.25 }}>
                        {p.stats?.total ?? 0} controls
                        {p.stats?.implemented != null ? ` · ${p.stats.implemented} implemented` : ''}
                      </Typography>

                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                          <Typography variant="caption" color="text.secondary">Completion</Typography>
                          <Typography variant="caption" fontWeight={700} sx={{ color: progColor }}>
                            {progress}%
                          </Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={progress}
                          sx={{ height: 6, borderRadius: 3, bgcolor: '#e8eaf6',
                            '& .MuiLinearProgress-bar': { bgcolor: progColor, borderRadius: 3 } }} />
                      </Box>

                      <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {p.stats?.in_progress > 0 && (
                          <Chip label={`${p.stats.in_progress} in progress`} size="small"
                            sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#e3f2fd', color: '#1565c0' }} />
                        )}
                        {p.stats?.not_started > 0 && (
                          <Chip label={`${p.stats.not_started} not started`} size="small"
                            sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#f5f5f5', color: '#9e9e9e' }} />
                        )}
                      </Box>
                    </CardContent>
                  </CardActionArea>
                  {canCreate && (
                    <CardActions sx={{ justifyContent: 'flex-end', pt: 0, pb: 0.5, px: 1 }}>
                      <Tooltip title="Edit project">
                        <IconButton size="small" onClick={(e) => openEditProject(p, e)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  )}
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* ── Compliance Assessments Section ── */}
      <Divider sx={{ my: 4 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Compliance Assessments</Typography>
          <Typography variant="body2" color="text.secondary">
            Essential Eight, CIS Controls, AESCSF questionnaires
          </Typography>
        </Box>
        {canCreate && (
          <Button variant="contained" startIcon={<Add />}
            onClick={() => { setAsmtForm(ASMT_BLANK); setAsmtFormErr(''); setAsmtCreateDlg(true); }}
            sx={{ bgcolor: '#24483E' }}>
            New Assessment
          </Button>
        )}
      </Box>

      {assessments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <Typography variant="h6">No assessments yet</Typography>
          <Typography variant="body2">
            {isClient ? 'No assessments have been shared with you yet.' : 'Create one to start a compliance questionnaire.'}
          </Typography>
          {canCreate && (
            <Button variant="outlined" startIcon={<Add />} sx={{ mt: 2 }}
              onClick={() => { setAsmtForm(ASMT_BLANK); setAsmtFormErr(''); setAsmtCreateDlg(true); }}>
              New Assessment
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2}>
          {assessments.map(a => (
            <Grid item xs={12} sm={6} lg={4} key={a.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', '&:hover': { boxShadow: 4 } }}>
                <CardActionArea onClick={() => navigate(`/assessments/${a.id}`)} sx={{ flexGrow: 1 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip label={ASMT_FRAMEWORK_LABELS[a.framework] || a.framework} size="small"
                          sx={{ bgcolor: ASMT_FRAMEWORK_COLORS[a.framework] || '#999', color: '#fff', fontWeight: 600, fontSize: '0.65rem' }} />
                        {a.is_baseline && (
                          <Chip icon={<Star sx={{ fontSize: '12px !important' }} />} label="Baseline" size="small"
                            sx={{ bgcolor: '#c9a84c', color: '#fff', fontWeight: 600, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <Chip label={a.status_display} size="small" color={ASMT_STATUS_COLOR[a.status]} variant="outlined" />
                    </Box>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 1, mb: 0.5 }}>{a.title}</Typography>
                    {a.engagement_name && (
                      <Typography variant="caption" color="text.secondary" display="block">Engagement: {a.engagement_name}</Typography>
                    )}
                    {a.grc_consultant_name && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                        <Person sx={{ fontSize: 12, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">{a.grc_consultant_name}</Typography>
                      </Box>
                    )}
                    {a.start_date && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                        <CalendarToday sx={{ fontSize: 12, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">{a.start_date} → {a.end_date || '—'}</Typography>
                      </Box>
                    )}
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      {a.response_count} responses · {new Date(a.created_at).toLocaleDateString()}
                    </Typography>
                    {a.score !== null && a.score !== undefined ? (
                      <Box sx={{ mt: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                          <Typography variant="caption" color="text.secondary">Score</Typography>
                          <Typography variant="caption" fontWeight={700} sx={{ color: asmtScoreColor(a.score) }}>{a.score}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={a.score}
                          sx={{ height: 6, borderRadius: 3, bgcolor: '#e0e0e0',
                            '& .MuiLinearProgress-bar': { bgcolor: asmtScoreColor(a.score) } }} />
                      </Box>
                    ) : (
                      <Box sx={{ mt: 1.5 }}>
                        <LinearProgress variant="determinate" value={0} sx={{ height: 6, borderRadius: 3, bgcolor: '#e0e0e0' }} />
                        <Typography variant="caption" color="text.secondary">Not scored yet</Typography>
                      </Box>
                    )}
                  </CardContent>
                </CardActionArea>
                <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                  <Tooltip title="Open assessment">
                    <IconButton size="small" onClick={() => navigate(`/assessments/${a.id}`)}>
                      <PlayArrow fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {canCreate && (
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={(e) => openEditAsmt(a, e)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canCreate && (
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => setAsmtDeleteDlg(a)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Assessment Create Dialog */}
      <Dialog open={asmtCreateDlg} onClose={() => setAsmtCreateDlg(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Assessment</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="Title" value={asmtForm.title} onChange={e => setAsmtForm(p => ({ ...p, title: e.target.value }))}
            fullWidth size="small" required placeholder="e.g. ACME Corp Essential Eight 2026" />
          <TextField label="Template" value={asmtForm.template} onChange={e => setAsmtForm(p => ({ ...p, template: e.target.value }))}
            select fullWidth size="small" required>
            <MenuItem value="">— Select framework —</MenuItem>
            {asmtTemplates.map(t => (
              <MenuItem key={t.id} value={t.id}>
                <Box>
                  <Typography variant="body2">{t.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{t.question_count} questions</Typography>
                </Box>
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Engagement (optional)" value={asmtForm.engagement}
            onChange={e => setAsmtForm(p => ({ ...p, engagement: e.target.value }))} select fullWidth size="small">
            <MenuItem value="">— None —</MenuItem>
            {asmtEngagements.map(e => <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
          </TextField>
          <TextField label="GRC Consultant" value={asmtForm.grc_consultant}
            onChange={e => setAsmtForm(p => ({ ...p, grc_consultant: e.target.value }))} select fullWidth size="small"
            helperText="Assigns this assessment to a GRC Consultant and schedules it in the calendar">
            <MenuItem value="">— Unassigned —</MenuItem>
            {asmtMembers.filter(m => ['GRC_CONSULTANT','ADMIN','SUPERADMIN'].includes(m.role)).map(m => (
              <MenuItem key={m.id} value={m.id}>{m.first_name} {m.last_name}
                {m.role === 'GRC_CONSULTANT' && <Typography component="span" variant="caption" sx={{ ml: 1, color: '#7c3aed' }}>GRC</Typography>}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField label="Start Date" type="date" value={asmtForm.start_date}
              onChange={e => setAsmtForm(p => ({ ...p, start_date: e.target.value }))}
              size="small" fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="End Date" type="date" value={asmtForm.end_date}
              onChange={e => setAsmtForm(p => ({ ...p, end_date: e.target.value }))}
              size="small" fullWidth InputLabelProps={{ shrink: true }} />
          </Box>
          <TextField label="Notes" value={asmtForm.notes} onChange={e => setAsmtForm(p => ({ ...p, notes: e.target.value }))}
            fullWidth size="small" multiline rows={2} />
          {asmtFormErr && <Alert severity="error">{asmtFormErr}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAsmtCreateDlg(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateAssessment} disabled={asmtSaving} sx={{ bgcolor: '#24483E' }}>
            {asmtSaving ? 'Creating…' : 'Create & Open'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assessment Delete Confirm */}
      <Dialog open={!!asmtDeleteDlg} onClose={() => setAsmtDeleteDlg(null)} maxWidth="xs">
        <DialogTitle>Delete Assessment</DialogTitle>
        <DialogContent>
          <Typography>Delete <strong>{asmtDeleteDlg?.title}</strong>? All responses will be lost.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAsmtDeleteDlg(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteAssessment}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Edit GRC Project Dialog */}
      <Dialog open={!!editProjectDlg} onClose={() => setEditProjectDlg(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1, borderBottom: '3px solid #1565c0' }}>Edit GRC Project</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '20px !important' }}>
          <TextField
            label="Project Title" value={editProjectForm.title} required fullWidth size="small"
            onChange={(e) => setEditProjectForm(p => ({ ...p, title: e.target.value }))}
          />
          <TextField
            label="Description (optional)" value={editProjectForm.description} fullWidth size="small" multiline rows={2}
            onChange={(e) => setEditProjectForm(p => ({ ...p, description: e.target.value }))}
          />
          <TextField
            label="Target Completion Date (optional)" value={editProjectForm.target_date} type="date"
            fullWidth size="small" InputLabelProps={{ shrink: true }}
            onChange={(e) => setEditProjectForm(p => ({ ...p, target_date: e.target.value }))}
          />
          {editProjectErr && <Alert severity="error">{editProjectErr}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditProjectDlg(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditProject} disabled={editProjectSaving}
            sx={{ bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>
            {editProjectSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Assessment Dialog */}
      <Dialog open={!!editAsmtDlg} onClose={() => setEditAsmtDlg(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Assessment</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="Title" value={editAsmtForm.title} required fullWidth size="small"
            onChange={e => setEditAsmtForm(p => ({ ...p, title: e.target.value }))} />
          <TextField label="Engagement (optional)" value={editAsmtForm.engagement}
            onChange={e => setEditAsmtForm(p => ({ ...p, engagement: e.target.value }))} select fullWidth size="small">
            <MenuItem value="">— None —</MenuItem>
            {asmtEngagements.map(e => <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
          </TextField>
          <TextField label="GRC Consultant" value={editAsmtForm.grc_consultant}
            onChange={e => setEditAsmtForm(p => ({ ...p, grc_consultant: e.target.value }))} select fullWidth size="small">
            <MenuItem value="">— Unassigned —</MenuItem>
            {asmtMembers.filter(m => ['GRC_CONSULTANT','ADMIN','SUPERADMIN'].includes(m.role)).map(m => (
              <MenuItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField label="Start Date" type="date" value={editAsmtForm.start_date}
              onChange={e => setEditAsmtForm(p => ({ ...p, start_date: e.target.value }))}
              size="small" fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="End Date" type="date" value={editAsmtForm.end_date}
              onChange={e => setEditAsmtForm(p => ({ ...p, end_date: e.target.value }))}
              size="small" fullWidth InputLabelProps={{ shrink: true }} />
          </Box>
          <TextField label="Notes" value={editAsmtForm.notes}
            onChange={e => setEditAsmtForm(p => ({ ...p, notes: e.target.value }))}
            fullWidth size="small" multiline rows={2} />
          {editAsmtErr && <Alert severity="error">{editAsmtErr}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditAsmtDlg(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditAsmt} disabled={editAsmtSaving} sx={{ bgcolor: '#24483E' }}>
            {editAsmtSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create GRC Project Dialog */}
      <Dialog open={createDlg} onClose={() => setCreateDlg(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1, borderBottom: '3px solid #1565c0' }}>New GRC Project</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '20px !important' }}>
          <TextField
            label="Project Title" value={form.title} required fullWidth size="small"
            onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="e.g. ACME Corp NIST CSF 2025 Assessment"
          />
          <TextField
            label="Framework" value={form.framework} select fullWidth size="small" required
            onChange={(e) => setForm(p => ({ ...p, framework: e.target.value }))}
          >
            <MenuItem value="">— Select framework —</MenuItem>
            {FRAMEWORK_VENDOR_GROUPS.flatMap(({ vendor, keys }) => {
              const group = frameworks.filter(f => keys.includes(f.key));
              if (!group.length) return [];
              return [
                <ListSubheader key={vendor} sx={{
                  fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em',
                  color: 'text.disabled', lineHeight: '28px', bgcolor: 'background.paper',
                  textTransform: 'uppercase',
                }}>
                  {vendor}
                </ListSubheader>,
                ...group.map(f => (
                  <MenuItem key={f.id} value={f.id} sx={{ pl: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                        bgcolor: FRAMEWORK_COLORS[f.key] ?? '#546e7a' }} />
                      <Box>
                        <Typography variant="body2">{f.name}</Typography>
                        {f.version && (
                          <Typography variant="caption" color="text.secondary">
                            v{f.version} · {f.control_count} controls
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </MenuItem>
                )),
              ];
            })}
          </TextField>
          <TextField
            label="Description (optional)" value={form.description} fullWidth size="small" multiline rows={2}
            onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Brief scope or purpose of this project…"
          />
          <TextField
            label="Target Completion Date (optional)" value={form.target_date} type="date"
            fullWidth size="small" InputLabelProps={{ shrink: true }}
            onChange={(e) => setForm(p => ({ ...p, target_date: e.target.value }))}
          />
          {orgs.length > 0 && (
            <TextField
              label="Organisation (optional)" value={form.org} select fullWidth size="small"
              onChange={(e) => setForm(p => ({ ...p, org: e.target.value }))}
            >
              <MenuItem value="">— Default —</MenuItem>
              {orgs.map(o => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
            </TextField>
          )}
          {formErr && <Alert severity="error">{formErr}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateDlg(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}
            sx={{ bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>
            {saving ? 'Creating…' : 'Create & Open'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
