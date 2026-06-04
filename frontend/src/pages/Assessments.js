import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Grid, Card, CardContent, CardActionArea,
  CardActions, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Alert, CircularProgress, LinearProgress,
  IconButton, Tooltip,
} from '@mui/material';
import { Add, PlayArrow, Delete, Star, CalendarToday, Person, Business } from '@mui/icons-material';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';

const FRAMEWORK_COLORS = {
  ESSENTIAL_EIGHT: '#24483E',
  CIS:             '#8e44ad',
  AESCSF:          '#b7410e',
  AESCSF_V1:       '#8b2500',
  CUSTOM:          '#7f8c8d',
};

const FRAMEWORK_LABELS = {
  ESSENTIAL_EIGHT: 'Essential Eight (ACSC)',
  CIS:             'CIS Controls v8',
  AESCSF:          'AESCSF 2023 (v2)',
  AESCSF_V1:       'AESCSF v1',
  CUSTOM:          'Custom',
};

const STATUS_COLOR = {
  DRAFT:       'default',
  IN_PROGRESS: 'warning',
  COMPLETED:   'success',
  ARCHIVED:    'default',
};

const BLANK = { title: '', template: '', engagement: '', assessor: '', grc_consultant: '', start_date: '', end_date: '', notes: '', baseline: '' };

export default function Assessments() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isClient = user?.role === 'CLIENT';

  const [assessments, setAssessments]   = useState([]);
  const [templates,   setTemplates]     = useState([]);
  const [engagements, setEngagements]   = useState([]);
  const [members,     setMembers]       = useState([]);
  const [loading,     setLoading]       = useState(true);
  const [error,       setError]         = useState('');
  const [createDlg,   setCreateDlg]     = useState(false);
  const [form,        setForm]          = useState(BLANK);
  const [saving,      setSaving]        = useState(false);
  const [formErr,     setFormErr]       = useState('');
  const [deleteDlg,   setDeleteDlg]     = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [aRes, tRes, eRes] = await Promise.all([
        api.get('/assessments/list/'),
        api.get('/assessments/templates/'),
        api.get('/engagements/'),
      ]);
      setAssessments(aRes.data.results || aRes.data);
      setTemplates(tRes.data.results || tRes.data);
      setEngagements(eRes.data.results || eRes.data);
      try {
        const mRes = await api.get('/auth/users/');
        setMembers(mRes.data.results || mRes.data);
      } catch {}
    } catch {
      setError('Failed to load assessments.');
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.template) {
      setFormErr('Title and template are required.');
      return;
    }
    setSaving(true);
    setFormErr('');
    try {
      const res = await api.post('/assessments/list/', {
        title:          form.title,
        template:       form.template,
        engagement:     form.engagement     || null,
        assessor:       form.assessor       || null,
        grc_consultant: form.grc_consultant || null,
        start_date:     form.start_date     || null,
        end_date:       form.end_date       || null,
        notes:          form.notes,
        baseline:       form.baseline       || null,
      });
      setCreateDlg(false);
      setForm(BLANK);
      navigate(`/assessments/${res.data.id}`);
    } catch (e) {
      setFormErr(e.response?.data?.error || 'Failed to create assessment.');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/assessments/list/${deleteDlg.id}/`);
      setDeleteDlg(null);
      fetchAll();
    } catch {
      setError('Failed to delete assessment.');
    }
  };

  const templateName = (id) => templates.find(t => t.id === id)?.name || '';

  const scoreColor = (score) => {
    if (score === null || score === undefined) return '#999';
    if (score >= 75) return '#27ae60';
    if (score >= 50) return '#f39c12';
    return '#c0392b';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Assessments</Typography>
          <Typography variant="body2" color="text.secondary">
            Compliance questionnaires — Essential Eight, Gap Analysis, CIS Health Check
          </Typography>
        </Box>
        {!isClient && (
          <Button variant="contained" startIcon={<Add />} onClick={() => { setForm(BLANK); setFormErr(''); setCreateDlg(true); }}
            sx={{ bgcolor: '#24483E' }}>
            New Assessment
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : assessments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Typography variant="h6">No assessments yet</Typography>
          <Typography variant="body2">
            {isClient ? 'No assessments have been shared with you yet.' : 'Create one to start a compliance questionnaire.'}
          </Typography>
          {!isClient && <Button variant="outlined" startIcon={<Add />} onClick={() => setCreateDlg(true)} sx={{ mt: 2 }}>New Assessment</Button>}
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
                        <Chip
                          label={FRAMEWORK_LABELS[a.framework] || a.framework}
                          size="small"
                          sx={{ bgcolor: FRAMEWORK_COLORS[a.framework] || '#999', color: '#fff', fontWeight: 600, fontSize: '0.65rem' }}
                        />
                        {a.is_baseline && (
                          <Chip icon={<Star sx={{ fontSize: '12px !important' }} />} label="Baseline" size="small"
                            sx={{ bgcolor: '#c9a84c', color: '#fff', fontWeight: 600, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <Chip label={a.status_display} size="small" color={STATUS_COLOR[a.status]} variant="outlined" />
                    </Box>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 1, mb: 0.5 }}>{a.title}</Typography>
                    {a.engagement_name && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Engagement: {a.engagement_name}
                      </Typography>
                    )}
                    {a.baseline_title && (
                      <Typography variant="caption" display="block" sx={{ color: '#c9a84c' }}>
                        vs Baseline: {a.baseline_title}
                      </Typography>
                    )}
                    {a.grc_consultant_name && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                        <Person sx={{ fontSize: 12, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          {a.grc_consultant_name}
                        </Typography>
                      </Box>
                    )}
                    {a.start_date && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                        <CalendarToday sx={{ fontSize: 12, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          {a.start_date} → {a.end_date || '—'}
                        </Typography>
                      </Box>
                    )}
                    {a.assessor_name && !a.grc_consultant_name && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Assessor: {a.assessor_name}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      {a.response_count} responses · {new Date(a.created_at).toLocaleDateString()}
                    </Typography>

                    {a.score !== null && a.score !== undefined ? (
                      <Box sx={{ mt: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                          <Typography variant="caption" color="text.secondary">Score</Typography>
                          <Typography variant="caption" fontWeight={700} sx={{ color: scoreColor(a.score) }}>
                            {a.score}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={a.score}
                          sx={{ height: 6, borderRadius: 3, bgcolor: '#e0e0e0',
                            '& .MuiLinearProgress-bar': { bgcolor: scoreColor(a.score) } }}
                        />
                      </Box>
                    ) : (
                      <Box sx={{ mt: 1.5 }}>
                        <LinearProgress variant="determinate" value={0}
                          sx={{ height: 6, borderRadius: 3, bgcolor: '#e0e0e0' }} />
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
                  {!isClient && (
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => setDeleteDlg(a)}>
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

      {/* Create Dialog */}
      <Dialog open={createDlg} onClose={() => setCreateDlg(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Assessment</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            fullWidth size="small" required placeholder="e.g. ACME Corp Essential Eight 2026" />
          <TextField label="Template" value={form.template} onChange={e => setForm(p => ({ ...p, template: e.target.value }))}
            select fullWidth size="small" required>
            <MenuItem value="">— Select framework —</MenuItem>
            {templates.map(t => (
              <MenuItem key={t.id} value={t.id}>
                <Box>
                  <Typography variant="body2">{t.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{t.question_count} questions</Typography>
                </Box>
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Engagement (optional)" value={form.engagement}
            onChange={e => setForm(p => ({ ...p, engagement: e.target.value }))} select fullWidth size="small">
            <MenuItem value="">— None —</MenuItem>
            {engagements.map(e => <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
          </TextField>
          <TextField label="GRC Consultant" value={form.grc_consultant}
            onChange={e => setForm(p => ({ ...p, grc_consultant: e.target.value }))} select fullWidth size="small"
            helperText="Assigns this assessment to a GRC Consultant and schedules it in the calendar">
            <MenuItem value="">— Unassigned —</MenuItem>
            {members.filter(m => m.role === 'GRC_CONSULTANT' || m.role === 'ADMIN' || m.role === 'SUPERADMIN').map(m => (
              <MenuItem key={m.id} value={m.id}>{m.first_name} {m.last_name}
                {m.role === 'GRC_CONSULTANT' && <Typography component="span" variant="caption" sx={{ ml: 1, color: '#7c3aed' }}>GRC</Typography>}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField label="Start Date" type="date" value={form.start_date}
              onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
              size="small" fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="End Date" type="date" value={form.end_date}
              onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
              size="small" fullWidth InputLabelProps={{ shrink: true }} />
          </Box>
          <TextField label="Compare against baseline (optional)" value={form.baseline}
            onChange={e => setForm(p => ({ ...p, baseline: e.target.value }))} select fullWidth size="small"
            helperText="Link this assessment to a completed baseline for comparison reporting">
            <MenuItem value="">— None (standalone) —</MenuItem>
            {assessments.filter(a => a.is_baseline && (!form.template || a.template === parseInt(form.template))).map(a => (
              <MenuItem key={a.id} value={a.id}>{a.title} ({a.score !== null ? `${a.score}%` : 'not scored'})</MenuItem>
            ))}
          </TextField>
          <TextField label="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            fullWidth size="small" multiline rows={2} />
          {formErr && <Alert severity="error">{formErr}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDlg(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving} sx={{ bgcolor: '#24483E' }}>
            {saving ? 'Creating…' : 'Create & Open'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteDlg} onClose={() => setDeleteDlg(null)} maxWidth="xs">
        <DialogTitle>Delete Assessment</DialogTitle>
        <DialogContent>
          <Typography>Delete <strong>{deleteDlg?.title}</strong>? All responses will be lost.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDlg(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
