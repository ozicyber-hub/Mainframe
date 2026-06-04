import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Chip, IconButton, TextField,
  CircularProgress, Tooltip, Divider, Alert, MenuItem, Select,
  FormControl, InputLabel, Switch, FormControlLabel, Collapse,
} from '@mui/material';
import {
  CheckCircle, Cancel, UploadFile, AutoAwesome, HourglassEmpty,
  RadioButtonUnchecked, AddCircle, Edit, Delete, ExpandMore,
  ExpandLess, Warning, Refresh, Article,
  Policy, Description, Assignment, FindInPage, CloudDone,
  Gavel, VisibilityOff,
} from '@mui/icons-material';
import api from '../utils/api';

// ── Constants ────────────────────────────────────────────────────────────────

const SUBMISSION_STATUS = {
  not_started: { label: 'Not Started',     color: '#95a5a6', Icon: RadioButtonUnchecked },
  submitted:   { label: 'Pending Review',  color: '#3498db', Icon: HourglassEmpty       },
  ai_reviewed: { label: 'AI Reviewed',     color: '#e67e22', Icon: AutoAwesome           },
  accepted:    { label: 'Accepted',        color: '#27ae60', Icon: CheckCircle           },
  rejected:    { label: 'Rejected',        color: '#c0392b', Icon: Cancel               },
  na:          { label: 'Not Applicable',  color: '#8e44ad', Icon: VisibilityOff         },
};

const DOC_TYPE_META = {
  POLICY:        { color: '#24483E', Icon: Policy      },
  PROCEDURE:     { color: '#2980b9', Icon: Article     },
  PLAN:          { color: '#8e44ad', Icon: Assignment  },
  LOG:           { color: '#d35400', Icon: FindInPage  },
  REPORT:        { color: '#c0392b', Icon: Description },
  CERTIFICATION: { color: '#c9a84c', Icon: CloudDone   },
  SCREENSHOT:    { color: '#1abc9c', Icon: Description },
  CONTRACT:      { color: '#2c3e50', Icon: Description },
  TRAINING:      { color: '#27ae60', Icon: Article     },
  OTHER:         { color: '#7f8c8d', Icon: Description },
};

const DOC_TYPES = [
  'POLICY', 'PROCEDURE', 'PLAN', 'LOG', 'REPORT',
  'CERTIFICATION', 'SCREENSHOT', 'CONTRACT', 'TRAINING', 'OTHER',
];

const DOC_TYPE_LABELS = {
  POLICY: 'Policy Document', PROCEDURE: 'Procedure / SOP', PLAN: 'Plan (BCP / IR / DR)',
  LOG: 'Log / Audit Trail', REPORT: 'Report / Assessment', CERTIFICATION: 'Certification',
  SCREENSHOT: 'Screenshot / Demo', CONTRACT: 'Contract / Agreement',
  TRAINING: 'Training Records', OTHER: 'Other Evidence',
};

// ── Score Ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 48, color }) {
  const r   = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e8e8e8" strokeWidth={4} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: size < 50 ? '0.62rem' : '0.75rem', fontWeight: 800, color, lineHeight: 1 }}>{score}%</Typography>
      </Box>
    </Box>
  );
}

// ── AI Result Panel ───────────────────────────────────────────────────────────

function AIResultPanel({ aiResult }) {
  const [showDetail, setShowDetail] = useState(false);
  if (!aiResult) return null;

  const score   = aiResult.coverage_score ?? 0;
  const wrong   = aiResult.is_correct_document === false;
  const statusMap = { Compliant: '#27ae60', 'Partially Compliant': '#e67e22', 'Non-Compliant': '#c0392b', 'Wrong Document': '#c0392b' };
  const col     = statusMap[aiResult.status] || '#95a5a6';

  return (
    <Box sx={{ mt: 1, p: 1.25, borderRadius: 1.5, bgcolor: `${col}08`, border: `1px solid ${col}25` }}>
      {wrong && (
        <Alert severity="error" icon={<Warning />} sx={{ mb: 1, py: 0.25, '& .MuiAlert-message': { fontSize: '0.73rem' } }}>
          <strong>Wrong Document Type</strong> — detected: {aiResult.document_type_detected || 'unknown'}. Please upload the correct document.
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <ScoreRing score={score} size={46} color={col} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.3, flexWrap: 'wrap' }}>
            <Chip label={aiResult.status || '—'} size="small"
              sx={{ bgcolor: `${col}22`, color: col, fontWeight: 700, fontSize: '0.6rem', height: 17 }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
              AI Coverage Score
            </Typography>
          </Box>
          {aiResult.summary && (
            <Typography variant="caption" sx={{ color: '#3a3a3a', lineHeight: 1.5, fontSize: '0.72rem', display: 'block' }}>
              {aiResult.summary}
            </Typography>
          )}
        </Box>
      </Box>

      {(aiResult.gaps?.length > 0 || aiResult.strengths?.length > 0) && (
        <Box sx={{ mt: 0.75 }}>
          <Button size="small" onClick={() => setShowDetail(v => !v)}
            endIcon={showDetail ? <ExpandLess sx={{ fontSize: 13 }} /> : <ExpandMore sx={{ fontSize: 13 }} />}
            sx={{ fontSize: '0.65rem', textTransform: 'none', color: col, p: 0, minWidth: 0 }}>
            {showDetail ? 'Hide detail' : 'Show gaps & strengths'}
          </Button>
          <Collapse in={showDetail}>
            <Box sx={{ mt: 0.75, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {aiResult.gaps?.length > 0 && (
                <Box sx={{ flex: 1, minWidth: 120 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#c0392b', fontSize: '0.63rem', display: 'block', mb: 0.25 }}>
                    Gaps identified
                  </Typography>
                  {aiResult.gaps.map((g, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 0.5, mb: 0.2 }}>
                      <Cancel sx={{ fontSize: 11, color: '#c0392b', mt: '2px', flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ fontSize: '0.68rem', lineHeight: 1.4 }}>{g}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {aiResult.strengths?.length > 0 && (
                <Box sx={{ flex: 1, minWidth: 120 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#27ae60', fontSize: '0.63rem', display: 'block', mb: 0.25 }}>
                    Strengths found
                  </Typography>
                  {aiResult.strengths.map((s, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 0.5, mb: 0.2 }}>
                      <CheckCircle sx={{ fontSize: 11, color: '#27ae60', mt: '2px', flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ fontSize: '0.68rem', lineHeight: 1.4 }}>{s}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
            {aiResult.recommendation && (
              <Box sx={{ mt: 0.75, p: 0.75, bgcolor: '#f8f9fa', borderRadius: 1, borderLeft: `3px solid ${col}` }}>
                <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.63rem', display: 'block', mb: 0.2 }}>
                  Recommendation
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.68rem', lineHeight: 1.4 }}>
                  {aiResult.recommendation}
                </Typography>
              </Box>
            )}
          </Collapse>
        </Box>
      )}
    </Box>
  );
}

// ── Single Requirement Card ───────────────────────────────────────────────────

function RequirementCard({ req, submission, assessmentId, isClient, onUpdate, onDelete, onEdit }) {
  const fileRef          = useRef(null);
  const [uploading,   setUploading]   = useState(false);
  const [validating,  setValidating]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [notesDraft,  setNotesDraft]  = useState(submission?.reviewer_notes || '');
  const [showReview,  setShowReview]  = useState(false);
  const [editing,     setEditing]     = useState(false);
  const [editDraft,   setEditDraft]   = useState({ title: req.title, description: req.description, document_type: req.document_type, required: req.required });

  const sub     = submission;
  const status  = sub?.status || 'not_started';
  const meta    = SUBMISSION_STATUS[status] || SUBMISSION_STATUS.not_started;
  const dtMeta  = DOC_TYPE_META[req.document_type] || DOC_TYPE_META.OTHER;

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
    } catch { /* */ }
    setUploading(false);
  };

  const handleAIValidate = async () => {
    if (!sub?.id) return;
    setValidating(true);
    try {
      const res = await api.post(`/assessments/list/${assessmentId}/submissions/${sub.id}/ai_validate/`);
      onUpdate(res.data);
    } catch { /* */ }
    setValidating(false);
  };

  const handleReview = async (newStatus) => {
    if (!sub?.id) return;
    setSaving(true);
    try {
      const res = await api.post(`/assessments/list/${assessmentId}/submissions/${sub.id}/review/`, {
        status: newStatus, reviewer_notes: notesDraft,
      });
      onUpdate(res.data);
      setShowReview(false);
    } catch { /* */ }
    setSaving(false);
  };

  const handleEditSave = async () => {
    try {
      // We call onEdit which handles the API call + updates local requirements list
      await onEdit(req.id, editDraft);
      setEditing(false);
    } catch { /* */ }
  };

  const hasFile   = !!sub?.file || !!sub?.filename;
  const canReview = !isClient && hasFile;

  return (
    <Paper variant="outlined" sx={{
      mb: 1, borderRadius: 2, overflow: 'hidden',
      borderColor: status === 'accepted' ? '#27ae6040' : status === 'rejected' ? '#c0392b40' : '#e0e0e0',
    }}>
      {/* Header */}
      <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#fafafa' }}>
        <Chip
          label={req.document_type}
          size="small"
          sx={{ bgcolor: `${dtMeta.color}18`, color: dtMeta.color, fontWeight: 700, fontSize: '0.58rem', height: 18, flexShrink: 0 }}
        />
        {req.required && (
          <Chip label="Required" size="small"
            sx={{ bgcolor: '#fff3e0', color: '#e67e22', fontWeight: 700, fontSize: '0.58rem', height: 18, flexShrink: 0 }} />
        )}
        <Typography variant="caption" fontWeight={700} sx={{ flex: 1, fontSize: '0.75rem', lineHeight: 1.3 }}>
          {req.title}
        </Typography>
        {/* Status badge */}
        <Chip
          icon={<meta.Icon sx={{ fontSize: '11px !important' }} />}
          label={meta.label}
          size="small"
          sx={{ bgcolor: `${meta.color}18`, color: meta.color, fontWeight: 700, fontSize: '0.6rem', height: 18, flexShrink: 0 }}
        />
        {!isClient && (
          <Box sx={{ display: 'flex', gap: 0 }}>
            <Tooltip title="Edit requirement">
              <IconButton size="small" onClick={() => setEditing(v => !v)} sx={{ p: 0.3 }}>
                <Edit sx={{ fontSize: 13, color: '#aaa' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete requirement">
              <IconButton size="small" onClick={() => onDelete(req.id)} sx={{ p: 0.3 }}>
                <Delete sx={{ fontSize: 13, color: '#aaa' }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Description */}
      {req.description && !editing && (
        <Box sx={{ px: 1.5, pb: 0.75, pt: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', lineHeight: 1.4 }}>
            {req.description}
          </Typography>
        </Box>
      )}

      {/* Edit form */}
      {editing && (
        <Box sx={{ px: 1.5, pb: 1, pt: 0.25, borderTop: '1px solid #f0f0f0', bgcolor: '#f9f9f9' }}>
          <TextField label="Title" value={editDraft.title} onChange={e => setEditDraft(p => ({ ...p, title: e.target.value }))}
            size="small" fullWidth sx={{ mb: 0.75, mt: 0.75, '& .MuiInputBase-input': { fontSize: '0.78rem' } }} />
          <TextField label="Description" value={editDraft.description} onChange={e => setEditDraft(p => ({ ...p, description: e.target.value }))}
            size="small" fullWidth multiline rows={2} sx={{ mb: 0.75, '& .MuiInputBase-input': { fontSize: '0.78rem' } }} />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel sx={{ fontSize: '0.75rem' }}>Type</InputLabel>
              <Select value={editDraft.document_type} label="Type" onChange={e => setEditDraft(p => ({ ...p, document_type: e.target.value }))}
                sx={{ fontSize: '0.75rem' }}>
                {DOC_TYPES.map(t => <MenuItem key={t} value={t} sx={{ fontSize: '0.75rem' }}>{DOC_TYPE_LABELS[t]}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControlLabel control={<Switch size="small" checked={editDraft.required} onChange={e => setEditDraft(p => ({ ...p, required: e.target.checked }))} />}
              label={<Typography sx={{ fontSize: '0.72rem' }}>Required</Typography>} />
            <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
              <Button size="small" onClick={() => setEditing(false)} sx={{ fontSize: '0.68rem', textTransform: 'none' }}>Cancel</Button>
              <Button size="small" variant="contained" onClick={handleEditSave}
                sx={{ fontSize: '0.68rem', textTransform: 'none', bgcolor: '#24483E', '&:hover': { bgcolor: '#1a3228' } }}>
                Save
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      <Divider />

      {/* Upload zone */}
      <Box sx={{ px: 1.5, py: 1 }}>
        <input ref={fileRef} type="file" hidden accept=".pdf,.docx,.txt" onChange={handleUpload} />
        {hasFile ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.75, bgcolor: '#f5faf7', borderRadius: 1.5, border: '1px solid #d4e8dc' }}>
            <Article sx={{ fontSize: 16, color: '#24483E', flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.72rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sub.filename || 'Uploaded document'}
              </Typography>
              {sub.submitted_at && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.63rem' }}>
                  by {sub.submitted_by_name || 'Unknown'} · {new Date(sub.submitted_at).toLocaleDateString()}
                </Typography>
              )}
            </Box>
            <Tooltip title="Replace document">
              <Button size="small" onClick={() => fileRef.current?.click()} disabled={uploading}
                startIcon={uploading ? <CircularProgress size={10} /> : <UploadFile sx={{ fontSize: 13 }} />}
                sx={{ fontSize: '0.65rem', textTransform: 'none', borderColor: '#24483E55', color: '#24483E', flexShrink: 0 }}
                variant="outlined">
                {uploading ? '...' : 'Replace'}
              </Button>
            </Tooltip>
          </Box>
        ) : (
          <Box onClick={() => !uploading && fileRef.current?.click()} sx={{
            p: 1.5, border: '2px dashed #d4e8dc', borderRadius: 2, textAlign: 'center', cursor: 'pointer',
            bgcolor: '#f9fcfa', transition: 'all 0.15s',
            '&:hover': { borderColor: '#24483E', bgcolor: '#edf3f0' },
          }}>
            {uploading
              ? <CircularProgress size={18} sx={{ color: '#24483E' }} />
              : <>
                  <UploadFile sx={{ fontSize: 22, color: '#24483E', mb: 0.25 }} />
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: '#24483E', fontSize: '0.72rem' }}>
                    Upload {DOC_TYPE_LABELS[req.document_type]}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.63rem' }}>
                    PDF, DOCX or TXT accepted
                  </Typography>
                </>
            }
          </Box>
        )}
      </Box>

      {/* AI result */}
      {sub?.ai_result && (
        <Box sx={{ px: 1.5, pb: 1 }}>
          <AIResultPanel aiResult={sub.ai_result} />
        </Box>
      )}

      {/* Auditor review section */}
      {canReview && (
        <Box sx={{ borderTop: '1px solid #f0f0f0', px: 1.5, py: 1, bgcolor: '#fafafa' }}>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center', mb: showReview ? 0.75 : 0 }}>
            {/* AI Validate button */}
            {hasFile && (
              <Button size="small" variant="outlined"
                startIcon={validating ? <CircularProgress size={10} /> : <AutoAwesome sx={{ fontSize: 13 }} />}
                onClick={handleAIValidate} disabled={validating}
                sx={{ fontSize: '0.65rem', textTransform: 'none', borderColor: '#e67e22', color: '#e67e22', py: 0.25 }}>
                {validating ? 'Validating...' : sub?.ai_result ? 'Re-validate' : 'AI Validate'}
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            {/* Review decision buttons */}
            <Tooltip title="Mark as accepted">
              <Button size="small" variant={status === 'accepted' ? 'contained' : 'outlined'}
                onClick={() => handleReview('accepted')} disabled={saving}
                sx={{ fontSize: '0.62rem', textTransform: 'none', py: 0.2, minWidth: 0,
                  borderColor: '#27ae60', color: status === 'accepted' ? '#fff' : '#27ae60',
                  bgcolor: status === 'accepted' ? '#27ae60' : 'transparent',
                  '&:hover': { bgcolor: status === 'accepted' ? '#219a52' : '#e8f5e9' } }}>
                ✓ Accept
              </Button>
            </Tooltip>
            <Tooltip title="Reject and request resubmission">
              <Button size="small" variant={status === 'rejected' ? 'contained' : 'outlined'}
                onClick={() => setShowReview(v => !v)} disabled={saving}
                sx={{ fontSize: '0.62rem', textTransform: 'none', py: 0.2, minWidth: 0,
                  borderColor: '#c0392b', color: status === 'rejected' ? '#fff' : '#c0392b',
                  bgcolor: status === 'rejected' ? '#c0392b' : 'transparent',
                  '&:hover': { bgcolor: status === 'rejected' ? '#a93226' : '#ffebee' } }}>
                ✗ Reject
              </Button>
            </Tooltip>
            <Tooltip title="Mark as not applicable">
              <Button size="small" variant={status === 'na' ? 'contained' : 'outlined'}
                onClick={() => handleReview('na')} disabled={saving}
                sx={{ fontSize: '0.62rem', textTransform: 'none', py: 0.2, minWidth: 0,
                  borderColor: '#8e44ad', color: status === 'na' ? '#fff' : '#8e44ad',
                  bgcolor: status === 'na' ? '#8e44ad' : 'transparent',
                  '&:hover': { bgcolor: status === 'na' ? '#7d3c98' : '#f3e5f5' } }}>
                N/A
              </Button>
            </Tooltip>
          </Box>

          {/* Reviewer notes + reject confirmation */}
          <Collapse in={showReview}>
            <TextField
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
              placeholder="Add feedback for the client (required for rejection)..."
              size="small" fullWidth multiline rows={2}
              sx={{ mb: 0.75, '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
            />
            <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end' }}>
              <Button size="small" onClick={() => setShowReview(false)} sx={{ fontSize: '0.65rem', textTransform: 'none' }}>
                Cancel
              </Button>
              <Button size="small" variant="contained" onClick={() => handleReview('rejected')} disabled={saving || !notesDraft.trim()}
                sx={{ fontSize: '0.65rem', textTransform: 'none', bgcolor: '#c0392b', '&:hover': { bgcolor: '#a93226' } }}>
                {saving ? '...' : 'Reject & Notify'}
              </Button>
            </Box>
          </Collapse>

          {/* Existing reviewer notes (read display) */}
          {sub?.reviewer_notes && !showReview && (
            <Box sx={{ mt: 0.5, p: 0.75, bgcolor: sub.status === 'accepted' ? '#e8f5e9' : sub.status === 'rejected' ? '#ffebee' : '#f3e5f5', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                <Gavel sx={{ fontSize: 13, color: meta.color, mt: '2px', flexShrink: 0 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.62rem', color: meta.color, display: 'block' }}>
                    Reviewer note {sub.reviewed_by_name ? `(${sub.reviewed_by_name})` : ''}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', lineHeight: 1.4 }}>
                    {sub.reviewer_notes}
                  </Typography>
                </Box>
                {!isClient && (
                  <IconButton size="small" onClick={() => { setNotesDraft(sub.reviewer_notes); setShowReview(true); }} sx={{ p: 0.2 }}>
                    <Edit sx={{ fontSize: 11, color: '#aaa' }} />
                  </IconButton>
                )}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Client-facing: show reviewer feedback only */}
      {isClient && sub?.reviewer_notes && (
        <Box sx={{ borderTop: '1px solid #f0f0f0', px: 1.5, py: 0.75, bgcolor: status === 'accepted' ? '#f0faf4' : '#fff5f5' }}>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start' }}>
            <Gavel sx={{ fontSize: 13, color: meta.color, mt: '2px', flexShrink: 0 }} />
            <Box>
              <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.62rem', color: meta.color, display: 'block' }}>
                Auditor feedback
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.7rem', lineHeight: 1.4 }}>
                {sub.reviewer_notes}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
}

// ── Add Requirement Form ──────────────────────────────────────────────────────

function AddRequirementForm({ sectionId, templateId, onAdd, onCancel }) {
  const [form, setForm] = useState({
    title: '', description: '', document_type: 'POLICY', required: true, validation_prompt: '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await api.post(`/assessments/templates/${templateId}/requirements/`, {
        ...form, section: sectionId, order: 99,
      });
      onAdd(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create requirement.');
    }
    setSaving(false);
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: '#24483E40', bgcolor: '#f5faf7' }}>
      <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 1, color: '#24483E' }}>
        New Evidence Requirement
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 0.75, py: 0.25, '& .MuiAlert-message': { fontSize: '0.72rem' } }}>{error}</Alert>}
      <TextField label="Title" placeholder="e.g. Incident Response Plan" value={form.title}
        onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
        size="small" fullWidth sx={{ mb: 0.75, '& .MuiInputBase-input': { fontSize: '0.78rem' } }} />
      <TextField label="Description" placeholder="What this document must contain or demonstrate..."
        value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
        size="small" fullWidth multiline rows={2} sx={{ mb: 0.75, '& .MuiInputBase-input': { fontSize: '0.78rem' } }} />
      <TextField label="AI Validation Hint (optional)" placeholder="e.g. Must include escalation procedures and RTO targets"
        value={form.validation_prompt} onChange={e => setForm(p => ({ ...p, validation_prompt: e.target.value }))}
        size="small" fullWidth sx={{ mb: 0.75, '& .MuiInputBase-input': { fontSize: '0.78rem' } }} />
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Document Type</InputLabel>
          <Select value={form.document_type} label="Document Type"
            onChange={e => setForm(p => ({ ...p, document_type: e.target.value }))} sx={{ fontSize: '0.75rem' }}>
            {DOC_TYPES.map(t => <MenuItem key={t} value={t} sx={{ fontSize: '0.75rem' }}>{DOC_TYPE_LABELS[t]}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Switch size="small" checked={form.required} onChange={e => setForm(p => ({ ...p, required: e.target.checked }))} />}
          label={<Typography sx={{ fontSize: '0.72rem' }}>Required</Typography>}
        />
        <Box sx={{ ml: 'auto', display: 'flex', gap: 0.75 }}>
          <Button size="small" onClick={onCancel} sx={{ fontSize: '0.68rem', textTransform: 'none' }}>Cancel</Button>
          <Button size="small" variant="contained" onClick={handleSubmit} disabled={saving}
            sx={{ fontSize: '0.68rem', textTransform: 'none', bgcolor: '#24483E', '&:hover': { bgcolor: '#1a3228' } }}>
            {saving ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : 'Add Requirement'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

// ── Main GRC Evidence Tracker ─────────────────────────────────────────────────

export default function GRCEvidenceTracker({ section, assessmentId, templateId, isClient }) {
  const [requirements,  setRequirements]  = useState([]);
  const [submissions,   setSubmissions]   = useState({});  // {reqId: submissionObj}
  const [loading,       setLoading]       = useState(true);
  const [showAddForm,   setShowAddForm]   = useState(false);

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
    } catch { /* */ }
    setLoading(false);
  }, [section.id, assessmentId, templateId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdate = useCallback((sub) => {
    setSubmissions(prev => ({ ...prev, [sub.requirement]: sub }));
  }, []);

  const handleAdd = useCallback((newReq) => {
    setRequirements(prev => [...prev, newReq]);
    setShowAddForm(false);
  }, []);

  const handleDelete = useCallback(async (reqId) => {
    try {
      await api.delete(`/assessments/templates/${templateId}/requirements/${reqId}/`);
      setRequirements(prev => prev.filter(r => r.id !== reqId));
      setSubmissions(prev => {
        const next = { ...prev };
        delete next[reqId];
        return next;
      });
    } catch { /* */ }
  }, [templateId]);

  const handleEdit = useCallback(async (reqId, data) => {
    const res = await api.patch(`/assessments/templates/${templateId}/requirements/${reqId}/`, data);
    setRequirements(prev => prev.map(r => r.id === reqId ? res.data : r));
  }, [templateId]);

  // Summary counts
  const accepted    = requirements.filter(r => submissions[r.id]?.status === 'accepted').length;
  const pending     = requirements.filter(r => ['submitted', 'ai_reviewed'].includes(submissions[r.id]?.status)).length;
  const rejected    = requirements.filter(r => submissions[r.id]?.status === 'rejected').length;
  const notStarted  = requirements.filter(r => !submissions[r.id] || submissions[r.id]?.status === 'not_started').length;
  const na          = requirements.filter(r => submissions[r.id]?.status === 'na').length;

  return (
    <Paper sx={{ p: 1.5, borderRadius: 2, border: '1px solid #e0e0e0' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
        <Policy sx={{ fontSize: 16, color: '#24483E' }} />
        <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.75rem', color: '#24483E', flex: 1 }}>
          Evidence Requirements
          {requirements.length > 0 && (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5, fontWeight: 400 }}>
              ({requirements.length})
            </Typography>
          )}
        </Typography>
        {loading && <CircularProgress size={12} />}
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={fetchData} sx={{ p: 0.3 }}>
            <Refresh sx={{ fontSize: 14, color: '#aaa' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Summary chips */}
      {requirements.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
          {accepted  > 0 && <Chip size="small" label={`${accepted} accepted`}    sx={{ bgcolor: '#e8f5e9', color: '#27ae60', fontWeight: 700, fontSize: '0.6rem', height: 18 }} />}
          {pending   > 0 && <Chip size="small" label={`${pending} in review`}   sx={{ bgcolor: '#e3f2fd', color: '#3498db', fontWeight: 700, fontSize: '0.6rem', height: 18 }} />}
          {rejected  > 0 && <Chip size="small" label={`${rejected} rejected`}   sx={{ bgcolor: '#ffebee', color: '#c0392b', fontWeight: 700, fontSize: '0.6rem', height: 18 }} />}
          {notStarted> 0 && <Chip size="small" label={`${notStarted} awaiting`} sx={{ bgcolor: '#f5f5f5', color: '#7f8c8d', fontWeight: 700, fontSize: '0.6rem', height: 18 }} />}
          {na        > 0 && <Chip size="small" label={`${na} N/A`}              sx={{ bgcolor: '#f3e5f5', color: '#8e44ad', fontWeight: 700, fontSize: '0.6rem', height: 18 }} />}
        </Box>
      )}

      {/* Requirements list */}
      {!loading && requirements.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 2.5, color: 'text.disabled' }}>
          <Policy sx={{ fontSize: 32, mb: 0.5, opacity: 0.3 }} />
          <Typography variant="caption" sx={{ display: 'block', fontSize: '0.73rem' }}>
            {isClient ? 'No evidence has been requested yet.' : 'No evidence requirements defined. Add one below.'}
          </Typography>
        </Box>
      )}

      {requirements.map(req => (
        <RequirementCard
          key={req.id}
          req={req}
          submission={submissions[req.id]}
          assessmentId={assessmentId}
          isClient={isClient}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      ))}

      {/* Add requirement (auditor only) */}
      {!isClient && (
        <Box sx={{ mt: 0.5 }}>
          {showAddForm ? (
            <AddRequirementForm
              sectionId={section.id}
              templateId={templateId}
              onAdd={handleAdd}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <Button
              size="small" fullWidth variant="outlined"
              startIcon={<AddCircle sx={{ fontSize: 14 }} />}
              onClick={() => setShowAddForm(true)}
              sx={{ fontSize: '0.68rem', textTransform: 'none', borderColor: '#24483E55', color: '#24483E',
                borderStyle: 'dashed', '&:hover': { borderColor: '#24483E', bgcolor: '#f5faf7' } }}>
              Add Evidence Requirement
            </Button>
          )}
        </Box>
      )}
    </Paper>
  );
}
