import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Chip, CircularProgress,
  IconButton, Tooltip, Collapse, TextField, LinearProgress,
  Alert, Divider,
} from '@mui/material';
import {
  CheckCircle, Cancel, UploadFile, AutoAwesome, HourglassEmpty,
  RadioButtonUnchecked, ExpandMore, ExpandLess, Warning,
  Refresh, Article, Gavel, VisibilityOff, Policy,
} from '@mui/icons-material';
import api from '../utils/api';

// ── Status / type config ─────────────────────────────────────────────────────

const STATUS = {
  not_started: { label: 'Not Started',    color: '#94a3b8', Icon: RadioButtonUnchecked },
  submitted:   { label: 'Pending Review', color: '#3b82f6', Icon: HourglassEmpty       },
  ai_reviewed: { label: 'AI Reviewed',    color: '#f59e0b', Icon: AutoAwesome           },
  accepted:    { label: 'Accepted',       color: '#22c55e', Icon: CheckCircle           },
  rejected:    { label: 'Rejected',       color: '#ef4444', Icon: Cancel               },
  na:          { label: 'Not Applicable', color: '#a855f7', Icon: VisibilityOff         },
};

const DOC_TYPE = {
  POLICY:        { color: '#24483E', label: 'Policy'      },
  PROCEDURE:     { color: '#2563eb', label: 'Procedure'   },
  PLAN:          { color: '#7c3aed', label: 'Plan'        },
  LOG:           { color: '#ea580c', label: 'Log'         },
  REPORT:        { color: '#dc2626', label: 'Report'      },
  CERTIFICATION: { color: '#ca8a04', label: 'Certificate' },
  SCREENSHOT:    { color: '#0891b2', label: 'Screenshot'  },
  CONTRACT:      { color: '#374151', label: 'Contract'    },
  TRAINING:      { color: '#16a34a', label: 'Training'    },
  OTHER:         { color: '#6b7280', label: 'Evidence'    },
};

// ── AI Score Ring ────────────────────────────────────────────────────────────

function ScoreRing({ score, color, size = 44 }) {
  const r    = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={4} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s' }} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color }}>{score}%</Typography>
      </Box>
    </Box>
  );
}

// ── Evidence Card ────────────────────────────────────────────────────────────

function EvidenceCard({ req, submission, assessmentId, isClient, onUpdate }) {
  const fileRef        = useRef(null);
  const [uploading,  setUploading]  = useState(false);
  const [validating, setValidating] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [showAI,     setShowAI]     = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [notesDraft, setNotesDraft] = useState(submission?.reviewer_notes || '');

  const sub    = submission;
  const status = sub?.status || 'not_started';
  const st     = STATUS[status] || STATUS.not_started;
  const dt     = DOC_TYPE[req.document_type] || DOC_TYPE.OTHER;
  const hasFile = !!(sub?.filename || sub?.file);
  const ai      = sub?.ai_result;

  const aiColor = ai
    ? ai.status === 'Compliant'          ? '#22c55e'
    : ai.status === 'Partially Compliant'? '#f59e0b'
    : '#ef4444'
    : '#94a3b8';

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    const fd = new FormData();
    fd.append('requirement', req.id);
    fd.append('file', file);
    try {
      const res = await api.post(`/assessments/list/${assessmentId}/submit_evidence/`, fd);
      onUpdate(res.data);
      setNotesDraft('');
      setRejectMode(false);
    } catch { /* */ }
    setUploading(false);
  };

  const handleValidate = async () => {
    if (!sub?.id) return;
    setValidating(true);
    try {
      const res = await api.post(`/assessments/list/${assessmentId}/submissions/${sub.id}/ai_validate/`);
      onUpdate(res.data);
      setShowAI(true);
    } catch { /* */ }
    setValidating(false);
  };

  const handleDecision = async (newStatus) => {
    if (!sub?.id) return;
    setSaving(true);
    try {
      const res = await api.post(`/assessments/list/${assessmentId}/submissions/${sub.id}/review/`, {
        status: newStatus, reviewer_notes: notesDraft,
      });
      onUpdate(res.data);
      setRejectMode(false);
    } catch { /* */ }
    setSaving(false);
  };

  const leftBorderColor = status === 'accepted' ? '#22c55e'
    : status === 'rejected'    ? '#ef4444'
    : status === 'ai_reviewed' ? '#f59e0b'
    : status === 'submitted'   ? '#3b82f6'
    : status === 'na'          ? '#a855f7'
    : '#e5e7eb';

  return (
    <Paper elevation={0} sx={{
      mb: 1.5, borderRadius: 2, overflow: 'hidden',
      border: '1px solid #e5e7eb',
      borderLeft: `4px solid ${leftBorderColor}`,
      transition: 'box-shadow 0.15s',
      '&:hover': { boxShadow: '0 2px 12px rgba(0,0,0,0.07)' },
    }}>
      {/* ── Card header ── */}
      <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'flex-start', gap: 1.25, bgcolor: '#fafafa' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.3, flexWrap: 'wrap' }}>
            <Chip label={dt.label} size="small"
              sx={{ bgcolor: `${dt.color}15`, color: dt.color, fontWeight: 700, fontSize: '0.58rem', height: 18 }} />
            {req.required && (
              <Chip label="Required" size="small"
                sx={{ bgcolor: '#fef3c7', color: '#d97706', fontWeight: 600, fontSize: '0.58rem', height: 18 }} />
            )}
          </Box>
          <Typography fontWeight={700} sx={{ fontSize: '0.8rem', lineHeight: 1.3, color: '#111827' }}>
            {req.title}
          </Typography>
          {req.description && (
            <Typography variant="caption" sx={{ color: '#6b7280', lineHeight: 1.45, fontSize: '0.69rem', display: 'block', mt: 0.3 }}>
              {req.description}
            </Typography>
          )}
        </Box>
        {/* Status badge */}
        <Chip
          icon={<st.Icon sx={{ fontSize: '11px !important' }} />}
          label={st.label}
          size="small"
          sx={{ bgcolor: `${st.color}15`, color: st.color, fontWeight: 700, fontSize: '0.6rem', height: 20, flexShrink: 0 }}
        />
      </Box>

      <Divider />

      {/* ── Upload area ── */}
      <Box sx={{ px: 2, py: 1.25 }}>
        <input ref={fileRef} type="file" hidden accept=".pdf,.docx,.txt" onChange={handleUpload} />

        {hasFile ? (
          /* File uploaded — show filename row */
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1.5, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <Article sx={{ fontSize: 16, color: '#16a34a', flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.73rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sub.filename}
              </Typography>
              {sub.submitted_at && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
                  {sub.submitted_by_name || 'Unknown'} · {new Date(sub.submitted_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Typography>
              )}
            </Box>
            <Button size="small" onClick={() => fileRef.current?.click()} disabled={uploading}
              startIcon={uploading ? <CircularProgress size={10} /> : <UploadFile sx={{ fontSize: 13 }} />}
              sx={{ fontSize: '0.63rem', textTransform: 'none', color: '#374151', borderColor: '#d1d5db' }}
              variant="outlined">
              {uploading ? '...' : 'Replace'}
            </Button>
          </Box>
        ) : (
          /* No file — prominent upload zone */
          <Box onClick={() => !uploading && fileRef.current?.click()} sx={{
            px: 2, py: 1.75, border: '2px dashed #d1d5db', borderRadius: 2,
            textAlign: 'center', cursor: 'pointer', bgcolor: '#f9fafb',
            transition: 'all 0.15s',
            '&:hover': { borderColor: '#24483E', bgcolor: '#f0fdf4' },
          }}>
            {uploading
              ? <CircularProgress size={20} sx={{ color: '#24483E', mb: 0.5 }} />
              : <UploadFile sx={{ fontSize: 24, color: '#9ca3af', mb: 0.25 }} />
            }
            <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: uploading ? '#24483E' : '#4b5563', fontSize: '0.73rem' }}>
              {uploading ? 'Uploading...' : `Upload ${req.title}`}
            </Typography>
            {!uploading && (
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem' }}>
                PDF, DOCX or TXT
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* ── AI result (collapsible) ── */}
      {ai && (
        <Box sx={{ px: 2, pb: 1.25 }}>
          <Box onClick={() => setShowAI(v => !v)} sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', userSelect: 'none' }}>
            <ScoreRing score={ai.coverage_score ?? 0} color={aiColor} size={38} />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Chip label={ai.status || '—'} size="small"
                  sx={{ bgcolor: `${aiColor}18`, color: aiColor, fontWeight: 700, fontSize: '0.59rem', height: 17 }} />
                {ai.is_correct_document === false && (
                  <Chip icon={<Warning sx={{ fontSize: '10px !important' }} />} label="Wrong doc type" size="small"
                    sx={{ bgcolor: '#fef2f2', color: '#ef4444', fontWeight: 700, fontSize: '0.59rem', height: 17 }} />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.63rem' }}>
                AI Coverage Analysis
              </Typography>
            </Box>
            {showAI
              ? <ExpandLess sx={{ fontSize: 16, color: '#9ca3af' }} />
              : <ExpandMore sx={{ fontSize: 16, color: '#9ca3af' }} />
            }
          </Box>

          <Collapse in={showAI}>
            <Box sx={{ mt: 1, pl: 0.5 }}>
              {ai.is_correct_document === false && (
                <Alert severity="error" sx={{ mb: 1, py: 0.35, '& .MuiAlert-message': { fontSize: '0.71rem' } }}>
                  Wrong document type. Detected: <strong>{ai.document_type_detected || 'unknown'}</strong>. Please upload the correct document.
                </Alert>
              )}
              {ai.summary && (
                <Typography variant="caption" sx={{ fontSize: '0.71rem', lineHeight: 1.5, display: 'block', mb: 0.75, color: '#374151' }}>
                  {ai.summary}
                </Typography>
              )}
              {ai.gaps?.length > 0 && (
                <Box sx={{ mb: 0.5 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.62rem', color: '#ef4444', display: 'block', mb: 0.3 }}>
                    Gaps identified
                  </Typography>
                  {ai.gaps.map((g, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 0.5, mb: 0.2, alignItems: 'flex-start' }}>
                      <Cancel sx={{ fontSize: 10, color: '#ef4444', mt: '3px', flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ fontSize: '0.68rem', lineHeight: 1.4 }}>{g}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {ai.strengths?.length > 0 && (
                <Box sx={{ mb: 0.5 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.62rem', color: '#22c55e', display: 'block', mb: 0.3 }}>
                    Confirmed coverage
                  </Typography>
                  {ai.strengths.map((s, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 0.5, mb: 0.2, alignItems: 'flex-start' }}>
                      <CheckCircle sx={{ fontSize: 10, color: '#22c55e', mt: '3px', flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ fontSize: '0.68rem', lineHeight: 1.4 }}>{s}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {ai.recommendation && (
                <Box sx={{ p: 0.75, bgcolor: '#f8fafc', borderRadius: 1, borderLeft: `3px solid ${aiColor}`, mt: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.68rem', lineHeight: 1.4 }}>
                    <strong>Recommendation:</strong> {ai.recommendation}
                  </Typography>
                </Box>
              )}
            </Box>
          </Collapse>
        </Box>
      )}

      {/* ── Auditor reviewer note display ── */}
      {sub?.reviewer_notes && (
        <Box sx={{
          mx: 2, mb: 1.25, p: 1, borderRadius: 1.5,
          bgcolor: status === 'accepted' ? '#f0fdf4' : status === 'rejected' ? '#fef2f2' : '#faf5ff',
          border: `1px solid ${leftBorderColor}30`,
        }}>
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
            <Gavel sx={{ fontSize: 13, color: st.color, mt: '2px', flexShrink: 0 }} />
            <Box>
              <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.61rem', color: st.color, display: 'block' }}>
                Auditor {status === 'accepted' ? 'approval' : status === 'rejected' ? 'feedback' : 'note'}
                {sub.reviewed_by_name ? ` · ${sub.reviewed_by_name}` : ''}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.7rem', lineHeight: 1.45 }}>
                {sub.reviewer_notes}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* ── Auditor action bar ── */}
      {!isClient && hasFile && (
        <Box sx={{ px: 2, pb: 1.25, borderTop: '1px solid #f3f4f6', pt: 1, bgcolor: '#fafafa' }}>
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* AI validate */}
            <Button size="small" onClick={handleValidate} disabled={validating}
              startIcon={validating ? <CircularProgress size={10} /> : <AutoAwesome sx={{ fontSize: 13 }} />}
              sx={{ fontSize: '0.63rem', textTransform: 'none', color: '#d97706', borderColor: '#fde68a', py: 0.3 }}
              variant="outlined">
              {validating ? 'Validating...' : ai ? 'Re-validate' : 'AI Validate'}
            </Button>

            <Box sx={{ flex: 1 }} />

            {/* Accept */}
            <Button size="small" onClick={() => handleDecision('accepted')} disabled={saving}
              variant={status === 'accepted' ? 'contained' : 'outlined'}
              sx={{
                fontSize: '0.63rem', textTransform: 'none', py: 0.3, minWidth: 0,
                borderColor: '#22c55e', color: status === 'accepted' ? '#fff' : '#22c55e',
                bgcolor: status === 'accepted' ? '#22c55e' : 'transparent',
                '&:hover': { bgcolor: status === 'accepted' ? '#16a34a' : '#f0fdf4' },
              }}>
              ✓ Accept
            </Button>

            {/* Reject */}
            <Button size="small" onClick={() => setRejectMode(v => !v)} disabled={saving}
              variant={status === 'rejected' ? 'contained' : 'outlined'}
              sx={{
                fontSize: '0.63rem', textTransform: 'none', py: 0.3, minWidth: 0,
                borderColor: '#ef4444', color: status === 'rejected' ? '#fff' : '#ef4444',
                bgcolor: status === 'rejected' ? '#ef4444' : 'transparent',
                '&:hover': { bgcolor: status === 'rejected' ? '#dc2626' : '#fef2f2' },
              }}>
              ✗ Reject
            </Button>

            {/* N/A */}
            <Button size="small" onClick={() => handleDecision('na')} disabled={saving}
              variant={status === 'na' ? 'contained' : 'outlined'}
              sx={{
                fontSize: '0.63rem', textTransform: 'none', py: 0.3, minWidth: 0,
                borderColor: '#a855f7', color: status === 'na' ? '#fff' : '#a855f7',
                bgcolor: status === 'na' ? '#a855f7' : 'transparent',
                '&:hover': { bgcolor: status === 'na' ? '#9333ea' : '#faf5ff' },
              }}>
              N/A
            </Button>
          </Box>

          {/* Reject notes */}
          <Collapse in={rejectMode}>
            <Box sx={{ mt: 1 }}>
              <TextField value={notesDraft} onChange={e => setNotesDraft(e.target.value)}
                placeholder="Explain what's wrong or missing so the client can resubmit correctly..."
                size="small" fullWidth multiline rows={2}
                sx={{ mb: 0.75, '& .MuiInputBase-input': { fontSize: '0.75rem' } }} />
              <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end' }}>
                <Button size="small" onClick={() => setRejectMode(false)}
                  sx={{ fontSize: '0.65rem', textTransform: 'none' }}>Cancel</Button>
                <Button size="small" variant="contained" onClick={() => handleDecision('rejected')}
                  disabled={saving || !notesDraft.trim()}
                  sx={{ fontSize: '0.65rem', textTransform: 'none', bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}>
                  {saving ? '...' : 'Reject & Send Feedback'}
                </Button>
              </Box>
            </Box>
          </Collapse>
        </Box>
      )}
    </Paper>
  );
}

// ── Smart Evidence Panel ─────────────────────────────────────────────────────

export default function SmartEvidencePanel({ section, templateId, assessmentId, isClient }) {
  const [requirements, setRequirements] = useState([]);
  const [submissions,  setSubmissions]  = useState({});
  const [loading,      setLoading]      = useState(true);
  const [generating,   setGenerating]   = useState(false);
  const [genError,     setGenError]     = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, subRes] = await Promise.all([
        api.get(`/assessments/templates/${templateId}/requirements/?section=${section.id}`),
        api.get(`/assessments/list/${assessmentId}/submissions/?section=${section.id}`),
      ]);
      setRequirements(reqRes.data);
      const map = {};
      subRes.data.forEach(s => { map[s.requirement] = s; });
      setSubmissions(map);

      // Auto-generate if none exist
      if (reqRes.data.length === 0) {
        doGenerate();
      }
    } catch { /* */ }
    setLoading(false);
  }, [section.id, assessmentId, templateId]); // eslint-disable-line

  useEffect(() => { fetchData(); }, [fetchData]);

  const doGenerate = async () => {
    setGenerating(true);
    setGenError('');
    try {
      const res = await api.post(`/assessments/templates/${templateId}/suggest_requirements/`, {
        section_id: section.id,
      });
      setRequirements(res.data);
    } catch (e) {
      setGenError(e.response?.data?.error || 'Could not generate requirements. Check AI service is running.');
    }
    setGenerating(false);
  };

  const handleUpdate = useCallback((sub) => {
    setSubmissions(prev => ({ ...prev, [sub.requirement]: sub }));
  }, []);

  // Summary counts
  const accepted   = requirements.filter(r => submissions[r.id]?.status === 'accepted').length;
  const pending    = requirements.filter(r => ['submitted', 'ai_reviewed'].includes(submissions[r.id]?.status)).length;
  const rejected   = requirements.filter(r => submissions[r.id]?.status === 'rejected').length;
  const awaiting   = requirements.filter(r => !submissions[r.id] || submissions[r.id]?.status === 'not_started').length;
  const compliancePct = requirements.length
    ? Math.round(((accepted + pending * 0.5) / requirements.length) * 100) : 0;

  return (
    <Box sx={{ position: 'sticky', top: 16 }}>
      {/* ── Panel header ── */}
      <Box sx={{
        px: 2, py: 1.5, mb: 1.5,
        background: 'linear-gradient(135deg, #24483E 0%, #1a3228 100%)',
        borderRadius: 2, color: 'white',
        boxShadow: '0 2px 12px rgba(36,72,62,0.2)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Policy sx={{ fontSize: 18 }} />
          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={700} sx={{ fontSize: '0.85rem', letterSpacing: 0.3 }}>
              Evidence Required
            </Typography>
            <Typography sx={{ fontSize: '0.68rem', opacity: 0.7, mt: 0.1 }}>
              {section.name}
            </Typography>
          </Box>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={fetchData} sx={{ color: 'rgba(255,255,255,0.7)', p: 0.5 }}>
              <Refresh sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Progress bar */}
        {requirements.length > 0 && (
          <Box sx={{ mt: 1.25 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
              <Typography sx={{ fontSize: '0.62rem', opacity: 0.75 }}>
                {accepted} of {requirements.length} accepted
              </Typography>
              <Typography sx={{ fontSize: '0.62rem', opacity: 0.75 }}>{compliancePct}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={compliancePct}
              sx={{ height: 5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.2)',
                '& .MuiLinearProgress-bar': { bgcolor: compliancePct === 100 ? '#4ade80' : '#86efac', borderRadius: 3 } }} />
            <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
              {accepted  > 0 && <Chip size="small" label={`${accepted} ✓ accepted`}   sx={{ bgcolor: 'rgba(74,222,128,0.2)',  color: '#4ade80', fontSize: '0.58rem', height: 17, fontWeight: 700 }} />}
              {pending   > 0 && <Chip size="small" label={`${pending} in review`}     sx={{ bgcolor: 'rgba(96,165,250,0.2)', color: '#93c5fd', fontSize: '0.58rem', height: 17, fontWeight: 700 }} />}
              {rejected  > 0 && <Chip size="small" label={`${rejected} rejected`}     sx={{ bgcolor: 'rgba(248,113,113,0.2)',color: '#fca5a5', fontSize: '0.58rem', height: 17, fontWeight: 700 }} />}
              {awaiting  > 0 && <Chip size="small" label={`${awaiting} awaiting`}     sx={{ bgcolor: 'rgba(255,255,255,0.1)',color: 'rgba(255,255,255,0.6)', fontSize: '0.58rem', height: 17, fontWeight: 700 }} />}
            </Box>
          </Box>
        )}
      </Box>

      {/* ── Generating state ── */}
      {(loading || generating) && (
        <Paper elevation={0} sx={{ p: 3, textAlign: 'center', border: '1px solid #e5e7eb', borderRadius: 2, mb: 1.5 }}>
          <AutoAwesome sx={{ fontSize: 28, color: '#24483E', mb: 1 }} />
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            {loading ? 'Loading...' : 'Identifying required evidence...'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontSize: '0.72rem' }}>
            {loading ? 'Fetching requirements' : 'Analysing controls to determine what documents are needed for compliance'}
          </Typography>
          <LinearProgress sx={{ borderRadius: 2, height: 5 }} />
        </Paper>
      )}

      {/* ── Error state ── */}
      {genError && !generating && (
        <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}
          action={<Button size="small" color="inherit" onClick={doGenerate}>Retry</Button>}>
          {genError}
        </Alert>
      )}

      {/* ── Empty state (non-generating) ── */}
      {!loading && !generating && requirements.length === 0 && !genError && (
        <Paper elevation={0} sx={{ p: 3, textAlign: 'center', border: '1px solid #e5e7eb', borderRadius: 2 }}>
          <Policy sx={{ fontSize: 32, color: '#d1d5db', mb: 1 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {isClient ? 'No evidence has been requested yet.' : 'No requirements found.'}
          </Typography>
          {!isClient && (
            <Button onClick={doGenerate} variant="outlined"
              startIcon={<AutoAwesome sx={{ fontSize: 14 }} />}
              sx={{ textTransform: 'none', fontSize: '0.75rem', borderColor: '#24483E', color: '#24483E' }}>
              Generate with AI
            </Button>
          )}
        </Paper>
      )}

      {/* ── Requirements list ── */}
      {!loading && !generating && requirements.map(req => (
        <EvidenceCard
          key={req.id}
          req={req}
          submission={submissions[req.id]}
          assessmentId={assessmentId}
          isClient={isClient}
          onUpdate={handleUpdate}
        />
      ))}

      {/* Regenerate button (auditor, when requirements exist) */}
      {!isClient && requirements.length > 0 && !generating && (
        <Box sx={{ textAlign: 'center', mt: 0.5 }}>
          <Button size="small" onClick={doGenerate}
            startIcon={<Refresh sx={{ fontSize: 12 }} />}
            sx={{ fontSize: '0.63rem', textTransform: 'none', color: '#9ca3af' }}>
            Regenerate requirements
          </Button>
        </Box>
      )}
    </Box>
  );
}
