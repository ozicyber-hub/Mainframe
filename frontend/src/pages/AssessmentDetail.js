import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper,
  Grid, TextField, MenuItem, Chip, LinearProgress,
  Alert, CircularProgress, Divider, IconButton, Tooltip,
  ToggleButton, ToggleButtonGroup, Dialog, DialogTitle,
  DialogContent, DialogActions, Card, CardContent, Collapse,
  Badge, Avatar,
} from '@mui/material';
import {
  ExpandMore, CheckCircle, RadioButtonUnchecked, ArrowBack,
  Save, AssignmentTurnedIn, Star, StarBorder,
  FileDownload, CompareArrows, PictureAsPdf,
  Info, LightbulbOutlined, ExpandLess, Lock,
  CheckCircleOutline, Cancel, RemoveCircleOutline,
  TipsAndUpdates, Security, Assessment as AssessmentIcon,
  HourglassEmpty, CloudDone, EmojiEvents,
  AttachFile, InsertDriveFile, Delete, AutoAwesome,
  Send, Chat, Psychology, UploadFile,
} from '@mui/icons-material';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import GRCAssessmentView from '../components/GRCAssessmentView';

// ─── Constants ────────────────────────────────────────────────────────────────
const ML_COLORS  = { 0: '#95a5a6', 1: '#e67e22', 2: '#3498db', 3: '#27ae60' };
const ML_LABELS  = { 1: 'ML1 — Partly Aligned', 2: 'ML2 — Mostly Aligned', 3: 'ML3 — Fully Aligned' };
const IG_LABELS  = { 1: 'IG1 — Foundational',   2: 'IG2 — Managed',         3: 'IG3 — Advanced' };
const MIL_LABELS = { 1: 'MIL-1 — Initial',       2: 'MIL-2 — Developing',    3: 'MIL-3 — Managing' };
const ML_BG      = { 1: '#fff3e0', 2: '#e3f2fd', 3: '#e8f5e9' };
const SP_COLORS  = { 1: '#16a085', 2: '#8e44ad', 3: '#c0392b' };
const SP_LABELS  = { 1: 'SP-1 — Low Criticality', 2: 'SP-2 — Medium Criticality', 3: 'SP-3 — High Criticality' };

const ANSWER_COLORS = {
  YES: '#27ae60', PARTIAL: '#f39c12', NO: '#c0392b', 'N/A': '#95a5a6',
  ACHIEVED: '#27ae60',
  'Fully Implemented': '#27ae60', 'Largely Implemented': '#2ecc71',
  'Partially Implemented': '#f39c12', 'Not Implemented': '#c0392b',
  'Planned': '#3498db',
  Compliant: '#27ae60', 'Partially Compliant': '#f39c12', 'Non-Compliant': '#c0392b', 'Not Applicable': '#95a5a6',
  '0': '#c0392b', '1': '#e67e22', '2': '#f39c12', '3': '#27ae60',
  Present: '#c0392b', 'Not Present': '#27ae60',
};

const E8_FRAMEWORKS     = ['ESSENTIAL_EIGHT'];
const CIS_FRAMEWORKS    = ['CIS'];
const AESCSF_FRAMEWORKS = ['AESCSF', 'AESCSF_V1'];

const isPositive = (ans) =>
  ['YES', 'ACHIEVED', '3', 'Fully Implemented', 'Compliant', 'Not Present'].includes(ans);
const isPartial = (ans) =>
  ['PARTIAL', '2', '1', 'Largely Implemented', 'Partially Implemented', 'Partially Compliant', 'Planned'].includes(ans);
const isNegative = (ans) =>
  ['NO', '0', 'Not Implemented', 'Non-Compliant', 'Present'].includes(ans);

// ─── Score colour ─────────────────────────────────────────────────────────────
const scoreColor = (s) => s >= 75 ? '#27ae60' : s >= 50 ? '#f39c12' : '#c0392b';

// ─── AI audit helpers ─────────────────────────────────────────────────────────
const AI_STATUS_COLOR = {
  'Compliant':           '#27ae60',
  'Partially Compliant': '#f39c12',
  'Non-Compliant':       '#c0392b',
  'Not Applicable':      '#95a5a6',
};

const STATUS_TO_ANSWER = {
  'Compliant':           { yesno: 'YES',     choice: 'Fully Implemented' },
  'Partially Compliant': { yesno: 'PARTIAL', choice: 'Partially Implemented' },
  'Non-Compliant':       { yesno: 'NO',      choice: 'Not Implemented' },
  'Not Applicable':      { yesno: 'N/A',     choice: 'Not Applicable' },
};

// ─── Circular progress SVG ────────────────────────────────────────────────────
function CircularScore({ value, size = 64, stroke = 5, color }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const c = color || scoreColor(value);
  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e0e0e0" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: size < 60 ? '0.65rem' : '0.8rem', fontWeight: 800, color: c, lineHeight: 1 }}>
          {Math.round(value)}%
        </Typography>
      </Box>
    </Box>
  );
}

// ─── ML Badge ─────────────────────────────────────────────────────────────────
function MLBadge({ level, active, small }) {
  const c = ML_COLORS[level] || '#95a5a6';
  return (
    <Box sx={{
      px: small ? 0.75 : 1, py: small ? 0.2 : 0.4,
      borderRadius: 1, border: `1.5px solid ${c}`,
      bgcolor: active ? c : 'transparent',
      color: active ? '#fff' : c,
      fontSize: small ? '0.6rem' : '0.68rem',
      fontWeight: 700, lineHeight: 1.3,
      cursor: 'default', userSelect: 'none',
    }}>
      ML{level}
    </Box>
  );
}

// ─── Guidance Panel ───────────────────────────────────────────────────────────
function GuidancePanel({ guidance }) {
  const [open, setOpen] = useState(false);
  if (!guidance) return null;
  return (
    <Box sx={{ mt: 0.75 }}>
      <Box
        onClick={() => setOpen(v => !v)}
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.5,
          cursor: 'pointer', color: '#2980b9',
          '&:hover': { color: '#1f618d' },
        }}
      >
        <TipsAndUpdates sx={{ fontSize: 14 }} />
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
          {open ? 'Hide guidance' : 'Show assessor guidance'}
        </Typography>
        {open ? <ExpandLess sx={{ fontSize: 14 }} /> : <ExpandMore sx={{ fontSize: 14 }} />}
      </Box>
      <Collapse in={open}>
        <Box sx={{
          mt: 0.75, p: 1.25, borderRadius: 1.5,
          bgcolor: '#f0f8ff', border: '1px solid #bee3f8',
          fontSize: '0.75rem', lineHeight: 1.7, color: '#1a4a6b',
          whiteSpace: 'pre-wrap',
        }}>
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
            <Info sx={{ fontSize: 16, color: '#2980b9', flexShrink: 0, mt: 0.2 }} />
            <Typography variant="caption" sx={{ fontSize: '0.75rem', lineHeight: 1.7, color: '#1a4a6b' }}>
              {guidance}
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

// ─── Question Row ─────────────────────────────────────────────────────────────
function QuestionRow({ question, response, onChange, readOnly, showML = false, assessmentId, onEvidenceAdd, onEvidenceDelete }) {
  const ans      = response?.answer   || '';
  const notes    = response?.notes    || '';
  const evidence = response?.evidence || [];
  const fileRef  = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleAnswer = (val) => { if (!readOnly) onChange(question.id, { answer: val, notes }); };
  const handleNotes  = (val) => { if (!readOnly) onChange(question.id, { answer: ans,  notes: val }); };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      let respId = response?.id;
      if (!respId) {
        const res = await api.post('/assessments/responses/', {
          assessment: assessmentId, question: question.id,
          answer: ans, notes, maturity_achieved: isPositive(ans),
        });
        respId = res.data.id;
        onChange(question.id, { id: respId, answer: ans, notes, evidence });
      }
      const fd = new FormData();
      fd.append('response', respId);
      fd.append('file', file);
      const res = await api.post('/assessments/evidence/', fd);
      if (onEvidenceAdd) onEvidenceAdd(question.id, res.data);
    } catch (err) {
      console.error('Evidence upload failed:', err);
    }
    setUploading(false);
  };

  const handleDeleteEvidence = async (evidenceId) => {
    try {
      await api.delete(`/assessments/evidence/${evidenceId}/`);
      if (onEvidenceDelete) onEvidenceDelete(question.id, evidenceId);
    } catch (err) {
      console.error('Evidence delete failed:', err);
    }
  };

  const positive = isPositive(ans);
  const partial  = isPartial(ans);
  const negative = isNegative(ans);

  const borderColor = ans
    ? positive ? '#c8e6c9' : partial ? '#fff3cd' : negative ? '#ffcdd2' : '#e0e0e0'
    : '#e0e0e0';
  const bgColor = ans
    ? positive ? '#f9fff9' : partial ? '#fffdf0' : negative ? '#fff9f9' : '#fff'
    : '#fff';

  return (
    <Box sx={{ p: 1.75, mb: 1, border: '1px solid', borderColor, borderRadius: 2, bgcolor: bgColor, transition: 'all 0.15s' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 0.75 }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 0.5 }}>
            {showML && question.maturity_level !== null && question.maturity_level !== undefined && (
              <MLBadge level={question.maturity_level} active small />
            )}
            {ans && (
              positive ? <CheckCircle sx={{ fontSize: 16, color: '#27ae60' }} />
              : partial ? <RemoveCircleOutline sx={{ fontSize: 16, color: '#f39c12' }} />
              : negative ? <Cancel sx={{ fontSize: 16, color: '#c0392b' }} />
              : null
            )}
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.5 }}>{question.text}</Typography>
          <GuidancePanel guidance={question.guidance} />
        </Box>
        <Box sx={{ flexShrink: 0, mt: 0.25 }}>
          {question.question_type === 'YESNO' && (
            <ToggleButtonGroup value={ans} exclusive onChange={(_, v) => v && handleAnswer(v)} size="small" disabled={readOnly}>
              {['YES', 'PARTIAL', 'NO', 'N/A'].map(o => (
                <ToggleButton key={o} value={o} sx={{
                  fontSize: '0.62rem', px: 0.9, py: 0.35, minWidth: 36,
                  '&.Mui-selected': { bgcolor: ANSWER_COLORS[o] || '#999', color: '#fff', fontWeight: 700, '&:hover': { bgcolor: ANSWER_COLORS[o] } },
                }}>{o}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
          {question.question_type === 'MATURITY' && (
            <ToggleButtonGroup value={ans} exclusive onChange={(_, v) => v && handleAnswer(v)} size="small" disabled={readOnly}>
              {['0','1','2','3'].map(o => (
                <ToggleButton key={o} value={o} sx={{
                  fontSize: '0.65rem', px: 1.25, py: 0.35,
                  '&.Mui-selected': { bgcolor: ANSWER_COLORS[o], color: '#fff', fontWeight: 700, '&:hover': { bgcolor: ANSWER_COLORS[o] } },
                }}>{o}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
          {question.question_type === 'CHOICE' && (
            <TextField select value={ans} onChange={e => handleAnswer(e.target.value)}
              size="small" sx={{ minWidth: 200 }} disabled={readOnly}>
              <MenuItem value="">— Select —</MenuItem>
              {(question.options || []).map(o => (
                <MenuItem key={o} value={o}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ANSWER_COLORS[o] || '#999', flexShrink: 0 }} />
                    {o}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          )}
          {question.question_type === 'RATING' && (
            <ToggleButtonGroup value={ans} exclusive onChange={(_, v) => v && handleAnswer(v)} size="small" disabled={readOnly}>
              {['1','2','3','4','5'].map(o => (
                <ToggleButton key={o} value={o} sx={{ fontSize: '0.65rem', px: 1, py: 0.35 }}>{o}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
          {question.question_type === 'TEXT' && (
            <TextField value={ans} onChange={e => handleAnswer(e.target.value)}
              size="small" multiline rows={2} sx={{ width: 280 }} placeholder="Enter answer…" disabled={readOnly} />
          )}
        </Box>
      </Box>
      <TextField
        value={notes} onChange={e => handleNotes(e.target.value)}
        placeholder="Evidence notes (file paths, screenshots, ticket references…)"
        size="small" fullWidth multiline rows={1}
        sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.78rem', bgcolor: 'rgba(0,0,0,0.02)' } }}
        disabled={readOnly}
      />

      {/* Evidence file upload */}
      {!readOnly && (
        <Box sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <input ref={fileRef} type="file" hidden onChange={handleFileChange} />
          <Button
            size="small"
            startIcon={uploading ? <CircularProgress size={11} /> : <AttachFile sx={{ fontSize: 14 }} />}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            sx={{ fontSize: '0.7rem', textTransform: 'none', color: '#555', py: 0.2, minWidth: 0 }}
          >
            {uploading ? 'Uploading…' : 'Attach file'}
          </Button>
          {evidence.map(ev => {
            const fname = (ev.file || '').split('/').pop().split('?')[0];
            return (
              <Chip
                key={ev.id}
                size="small"
                icon={<InsertDriveFile sx={{ fontSize: '13px !important' }} />}
                label={fname.length > 28 ? fname.slice(0, 25) + '…' : fname || 'file'}
                onClick={() => window.open(ev.file, '_blank')}
                onDelete={() => handleDeleteEvidence(ev.id)}
                deleteIcon={<Delete sx={{ fontSize: '14px !important' }} />}
                sx={{ fontSize: '0.68rem', maxWidth: 220, cursor: 'pointer' }}
              />
            );
          })}
        </Box>
      )}
      {readOnly && evidence.length > 0 && (
        <Box sx={{ mt: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {evidence.map(ev => {
            const fname = (ev.file || '').split('/').pop().split('?')[0];
            return (
              <Chip key={ev.id} size="small"
                icon={<InsertDriveFile sx={{ fontSize: '13px !important' }} />}
                label={fname.length > 28 ? fname.slice(0, 25) + '…' : fname || 'file'}
                onClick={() => window.open(ev.file, '_blank')}
                sx={{ fontSize: '0.68rem', maxWidth: 220, cursor: 'pointer' }}
              />
            );
          })}
        </Box>
      )}
    </Box>
  );
}

// ─── E8/CIS/AESCSF Control Card (domain tracker) ─────────────────────────────
function E8ControlCard({ section, responses, targetML, onSetTarget, onClick, isActive, readOnly, levelPrefix = 'ML', levelLabels = ML_LABELS, spTarget = null, showLevelSelector = true }) {
  // For AESCSF, filter questions by SP scope (weight stores SP level)
  const allQ = spTarget != null
    ? section.questions.filter(q => !q.weight || Math.round(q.weight) <= spTarget)
    : section.questions;
  const byML   = { 1: [], 2: [], 3: [] };
  allQ.forEach(q => { if (q.maturity_level >= 1 && q.maturity_level <= 3) byML[q.maturity_level].push(q); });

  // Questions applicable up to targetML
  const applicable = allQ.filter(q => q.maturity_level === null || q.maturity_level <= targetML);
  const answered   = applicable.filter(q => responses[q.id]?.answer).length;
  const pct        = applicable.length ? Math.round((answered / applicable.length) * 100) : 0;

  // Per-ML compliance
  const mlStatus = [1, 2, 3].map(ml => {
    if (ml > targetML) return 'locked';
    const qs = byML[ml];
    if (!qs.length) return 'n/a';
    const pass = qs.every(q => isPositive(responses[q.id]?.answer));
    const any  = qs.some(q => responses[q.id]?.answer);
    return pass ? 'pass' : any ? 'partial' : 'unanswered';
  });

  // Live achieved ML for this domain — highest consecutive level where all controls pass
  let achievedML = 0;
  for (let ml = 1; ml <= 3; ml++) {
    const qs = byML[ml];
    if (!qs.length) continue;
    if (qs.every(q => isPositive(responses[q.id]?.answer))) {
      achievedML = ml;
    } else {
      break;
    }
  }

  const mlColor = (s) => s === 'pass' ? '#27ae60' : s === 'partial' ? '#f39c12' : s === 'locked' ? '#ccc' : '#e0e0e0';
  const mlIcon  = (s) => s === 'pass' ? '✓' : s === 'partial' ? '~' : s === 'locked' ? '🔒' : '○';

  return (
    <Card
      onClick={() => onClick(section)}
      sx={{
        cursor: 'pointer', border: '2px solid',
        borderColor: isActive ? '#24483E' : '#e0e0e0',
        bgcolor: isActive ? '#f0f4f2' : 'background.paper',
        transition: 'all 0.15s', mb: 0,
        '&:hover': { borderColor: '#24483E', boxShadow: 3 },
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.75rem', lineHeight: 1.3, flex: 1, mr: 1 }}>
            {section.name}
          </Typography>
          <CircularScore value={pct} size={40} stroke={4} />
        </Box>

        {/* Level status dots */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
          {[1, 2, 3].map((ml, i) => (
            <Tooltip key={ml} title={`${levelPrefix}${ml}: ${mlStatus[i]}`}>
              <Box sx={{
                flex: 1, py: 0.5, borderRadius: 1,
                bgcolor: mlColor(mlStatus[i]),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', color: mlStatus[i] === 'pass' ? '#fff' : mlStatus[i] === 'locked' ? '#aaa' : '#666',
                fontWeight: 700,
              }}>
                {mlIcon(mlStatus[i])} {levelPrefix}{ml}
              </Box>
            </Tooltip>
          ))}
        </Box>

        {/* Achieved level badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>Achieved:</Typography>
          <Chip
            size="small"
            label={achievedML > 0 ? `${levelPrefix}${achievedML}` : 'None'}
            sx={{
              height: 18, fontSize: '0.6rem', fontWeight: 700,
              bgcolor: achievedML > 0 ? ML_COLORS[achievedML] : '#e0e0e0',
              color: achievedML > 0 ? '#fff' : '#999',
            }}
          />
        </Box>

        {/* Target level selector — hidden for AESCSF (SP set globally) */}
        {!readOnly && showLevelSelector && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', display: 'block', mb: 0.4 }}>
              Target level:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.4 }} onClick={e => e.stopPropagation()}>
              {[1, 2, 3].map(ml => (
                <Box
                  key={ml}
                  onClick={() => onSetTarget(section.id, ml)}
                  sx={{
                    flex: 1, py: 0.3, borderRadius: 0.75, border: '1.5px solid',
                    borderColor: targetML === ml ? ML_COLORS[ml] : '#ddd',
                    bgcolor: targetML === ml ? ML_COLORS[ml] : 'transparent',
                    color: targetML === ml ? '#fff' : ML_COLORS[ml],
                    fontSize: '0.58rem', fontWeight: 700, textAlign: 'center',
                    cursor: 'pointer', transition: 'all 0.12s',
                    '&:hover': { borderColor: ML_COLORS[ml] },
                  }}
                >
                  {levelPrefix}{ml}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {!readOnly && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', display: 'block', mt: 0.5 }}>
            {answered}/{applicable.length} answered
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ─── E8/CIS/AESCSF Control Detail Panel ──────────────────────────────────────
function E8ControlDetail({ section, responses, targetML, onChange, readOnly, levelPrefix = 'ML', levelLabels = ML_LABELS, spTarget = null, assessmentId, onEvidenceAdd, onEvidenceDelete }) {
  // For AESCSF, filter by SP scope (weight stores SP level)
  const visibleQuestions = spTarget != null
    ? section.questions.filter(q => !q.weight || Math.round(q.weight) <= spTarget)
    : section.questions;
  const byML = { 0: [], 1: [], 2: [], 3: [] };
  visibleQuestions.forEach(q => {
    const ml = q.maturity_level === null || q.maturity_level === undefined ? 0 : q.maturity_level;
    if (byML[ml]) byML[ml].push(q);
  });

  const mlGroups = [
    { ml: 0, label: 'Foundational', color: '#95a5a6' },
    { ml: 1, label: levelLabels[1], color: ML_COLORS[1] },
    { ml: 2, label: levelLabels[2], color: ML_COLORS[2] },
    { ml: 3, label: levelLabels[3], color: ML_COLORS[3] },
  ];

  return (
    <Box>
      <Box sx={{ mb: 2, p: 2, bgcolor: '#f8faf9', borderRadius: 2, border: '1px solid #e0e8e4' }}>
        <Typography variant="subtitle1" fontWeight={700} color="#24483E">{section.name}</Typography>
        {section.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{section.description}</Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          {[1, 2, 3].map(ml => {
            const qs = byML[ml];
            if (!qs.length) return null;
            const answered = qs.filter(q => responses[q.id]?.answer).length;
            const pass = qs.every(q => isPositive(responses[q.id]?.answer));
            return (
              <Chip
                key={ml}
                icon={pass ? <CheckCircle sx={{ fontSize: '14px !important', color: '#fff !important' }} /> : undefined}
                label={`${levelPrefix}${ml}: ${answered}/${qs.length}`}
                size="small"
                sx={{
                  bgcolor: ml <= targetML ? ML_COLORS[ml] : '#e0e0e0',
                  color: ml <= targetML ? '#fff' : '#999',
                  fontWeight: 700, fontSize: '0.68rem',
                }}
              />
            );
          })}
        </Box>
      </Box>

      <SectionAIChat section={section} assessmentId={assessmentId} onApplyAI={onChange} readOnly={readOnly} />

      {mlGroups.map(({ ml, label, color }) => {
        const qs = byML[ml];
        if (!qs.length) return null;
        const isLocked = ml > targetML && ml !== 0;
        const mlAnswered = qs.filter(q => responses[q.id]?.answer).length;
        const mlPass     = qs.every(q => isPositive(responses[q.id]?.answer));

        return (
          <Box key={ml} sx={{ mb: 2 }}>
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1, mb: 1,
              p: 1, borderRadius: 1.5,
              bgcolor: isLocked ? '#f5f5f5' : `${color}15`,
              border: `1px solid ${isLocked ? '#e0e0e0' : color + '40'}`,
            }}>
              {isLocked
                ? <Lock sx={{ fontSize: 16, color: '#bbb' }} />
                : mlPass && ml > 0
                ? <CheckCircle sx={{ fontSize: 16, color }} />
                : <RadioButtonUnchecked sx={{ fontSize: 16, color: isLocked ? '#bbb' : color }} />
              }
              <Typography variant="caption" fontWeight={700} sx={{ color: isLocked ? '#bbb' : color, flex: 1 }}>
                {ml === 0 ? 'Foundational' : label}
              </Typography>
              {!isLocked && (
                <Typography variant="caption" color="text.secondary">
                  {mlAnswered}/{qs.length}
                </Typography>
              )}
              {isLocked && (
                <Chip label="Not targeted" size="small" sx={{ height: 16, fontSize: '0.55rem', bgcolor: '#e0e0e0', color: '#999' }} />
              )}
            </Box>

            {isLocked ? (
              <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#fafafa', border: '1px dashed #e0e0e0', textAlign: 'center' }}>
                <Typography variant="caption" color="text.disabled">
                  Set target to {levelPrefix}{ml} or higher to assess these controls
                </Typography>
              </Box>
            ) : (
              qs.map(q => (
                <QuestionRow
                  key={q.id} question={q}
                  response={responses[q.id]}
                  onChange={onChange}
                  readOnly={readOnly}
                  showML={false}
                  assessmentId={assessmentId}
                  onEvidenceAdd={onEvidenceAdd}
                  onEvidenceDelete={onEvidenceDelete}
                />
              ))
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// ─── Per-control AI chat + multi-file audit ───────────────────────────────────────
function SectionAIChat({ section, assessmentId, onApplyAI, readOnly, defaultOpen = false }) {
  const [open,      setOpen]      = useState(defaultOpen);
  const [docs,      setDocs]      = useState([]);
  const [uploading, setUploading] = useState(false);
  const [scanning,  setScanning]  = useState(false);
  const [result,    setResult]    = useState(null);
  const [applied,   setApplied]   = useState(false);
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [chatting,  setChatting]  = useState(false);
  const fileRef   = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, chatting]);

  const combinedText = docs.map(d => d.text).join('\n\n---\n\n');

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';
    setUploading(true);
    const added = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append('file',       file);
      fd.append('mode',       'chat');
      fd.append('message',    '');
      fd.append('section_id', section.id);
      try {
        const res = await api.post(`/assessments/list/${assessmentId}/ai_audit/`, fd);
        if (res.data.doc_text) added.push({ name: file.name, text: res.data.doc_text });
      } catch { /* skip */ }
    }
    setDocs(prev => [...prev, ...added]);
    setResult(null);
    setApplied(false);
    setUploading(false);
  };

  const removeDoc = (idx) => {
    setDocs(prev => prev.filter((_, i) => i !== idx));
    setResult(null);
    setApplied(false);
  };

  const applyFindings = (r) => {
    if (!onApplyAI) return;
    const ansMap = STATUS_TO_ANSWER[r.status] || STATUS_TO_ANSWER['Not Applicable'];
    const notes  = `AI Audit Finding: ${r.finding}\n\nRecommendation: ${r.recommendation}`;
    section.questions.forEach(q => {
      let answer = '';
      if (q.question_type === 'YESNO')  answer = ansMap.yesno;
      if (q.question_type === 'CHOICE') answer = ansMap.choice;
      if (answer) onApplyAI(q.id, { answer, notes });
    });
    setApplied(true);
  };

  const handleAudit = async () => {
    if (!combinedText) return;
    setScanning(true);
    setApplied(false);
    try {
      const fd = new FormData();
      fd.append('mode',       'scan');
      fd.append('message',    '');
      fd.append('doc_text',   combinedText);
      fd.append('section_id', section.id);
      const res  = await api.post(`/assessments/list/${assessmentId}/ai_audit/`, fd);
      const data = res.data;
      if (data.type === 'scan' && data.result?.sections?.length) {
        const r = data.result.sections[0];
        setResult(r);
        applyFindings(r);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Audit complete — ${r.status} (${r.score}%). Controls updated automatically. Ask me anything about the findings.`,
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message || '(no response)' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Audit failed. Ensure Ollama / Mistral is running.' }]);
    }
    setScanning(false);
  };

  const handleChat = async () => {
    const msg = input.trim();
    if (!msg) return;
    setInput('');
    setChatting(true);
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    try {
      const fd = new FormData();
      fd.append('mode',       'chat');
      fd.append('message',    msg);
      fd.append('doc_text',   combinedText);
      fd.append('section_id', section.id);
      const res = await api.post(`/assessments/list/${assessmentId}/ai_audit/`, fd);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.message || '(no response)' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Request failed.' }]);
    }
    setChatting(false);
  };

  const col = result ? (AI_STATUS_COLOR[result.status] || '#95a5a6') : '#24483E';

  return (
    <Box sx={{ mb: 1.5 }}>
      <Box onClick={() => setOpen(v => !v)} sx={{
        display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.65,
        bgcolor: open ? '#edf3f0' : '#f5faf7',
        border: '1px solid', borderColor: open ? '#24483E55' : '#d4e8dc',
        borderRadius: open ? '8px 8px 0 0' : '8px',
        cursor: 'pointer', transition: 'all 0.15s',
        '&:hover': { bgcolor: '#edf3f0', borderColor: '#24483E55' },
      }}>
        <AutoAwesome sx={{ fontSize: 13, color: result ? col : '#24483E' }} />
        <Typography variant="caption" fontWeight={700} sx={{ color: '#24483E', flex: 1, fontSize: '0.71rem', letterSpacing: 0.2 }}>
          AI Analysis
        </Typography>
        {result
          ? <Chip size="small" label={`${result.score}% — ${result.status}`}
              sx={{ bgcolor: `${col}20`, color: col, fontWeight: 700, fontSize: '0.6rem', height: 17, mr: 0.5 }} />
          : docs.length > 0
          ? <Chip size="small" label={`${docs.length} file${docs.length > 1 ? 's' : ''} ready`}
              sx={{ bgcolor: '#24483E18', color: '#24483E', fontWeight: 700, fontSize: '0.6rem', height: 17, mr: 0.5 }} />
          : null
        }
        {open ? <ExpandLess sx={{ fontSize: 15, color: '#24483E' }} /> : <ExpandMore sx={{ fontSize: 15, color: '#24483E' }} />}
      </Box>

      {open && (
        <Box sx={{ border: '1px solid #24483E55', borderTop: 'none', borderRadius: '0 0 8px 8px', bgcolor: '#fafcfb' }}>
          <Box sx={{ px: 1.25, pt: 1, pb: 0.75, borderBottom: '1px solid #e8f0eb' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: docs.length ? 0.75 : 0 }}>
              <input ref={fileRef} type="file" hidden multiple accept=".pdf,.docx,.txt" onChange={handleUpload} />
              <Button size="small" variant="outlined"
                startIcon={uploading ? <CircularProgress size={10} /> : <UploadFile sx={{ fontSize: 13 }} />}
                onClick={() => fileRef.current?.click()} disabled={uploading || scanning}
                sx={{ fontSize: '0.67rem', textTransform: 'none', borderColor: '#24483E', color: '#24483E', py: 0.25 }}>
                {uploading ? 'Uploading...' : 'Add files'}
              </Button>
              <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic', fontSize: '0.64rem', flex: 1 }}>
                PDF, DOCX or TXT
              </Typography>
              {docs.length > 0 && (
                <Button size="small" variant="contained" onClick={handleAudit} disabled={scanning}
                  startIcon={scanning ? <CircularProgress size={10} sx={{ color: '#fff' }} /> : <AutoAwesome sx={{ fontSize: 13 }} />}
                  sx={{ bgcolor: '#24483E', '&:hover': { bgcolor: '#1a3228' }, fontSize: '0.67rem', textTransform: 'none', py: 0.25 }}>
                  {scanning ? 'Auditing...' : 'Audit'}
                </Button>
              )}
            </Box>
            {docs.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {docs.map((d, i) => (
                  <Chip key={i} size="small"
                    icon={<InsertDriveFile sx={{ fontSize: '12px !important' }} />}
                    label={d.name.length > 22 ? d.name.slice(0, 19) + '...' : d.name}
                    onDelete={() => removeDoc(i)}
                    sx={{ fontSize: '0.63rem', height: 22 }} />
                ))}
              </Box>
            )}
          </Box>

          {result && (
            <Box sx={{ mx: 1.25, mt: 1, p: 1.25, borderRadius: 1.5, bgcolor: `${col}09`, border: `1px solid ${col}30` }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Box sx={{ flexShrink: 0, position: 'relative', width: 54, height: 54 }}>
                  <svg width={54} height={54} style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx={27} cy={27} r={21} fill="none" stroke="#e0e0e0" strokeWidth={4.5} />
                    <circle cx={27} cy={27} r={21} fill="none" stroke={col} strokeWidth={4.5}
                      strokeDasharray={2 * Math.PI * 21}
                      strokeDashoffset={2 * Math.PI * 21 * (1 - result.score / 100)}
                      strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                  </svg>
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: col, lineHeight: 1 }}>{result.score}%</Typography>
                    <Typography sx={{ fontSize: '0.48rem', color: col, lineHeight: 1.2 }}>domain</Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, flexWrap: 'wrap' }}>
                    <Chip label={result.status} size="small"
                      sx={{ bgcolor: `${col}22`, color: col, fontWeight: 700, fontSize: '0.6rem', height: 17 }} />
                    {applied && (
                      <Chip icon={<CheckCircle sx={{ fontSize: '11px !important', color: '#27ae60 !important' }} />}
                        label="Controls updated" size="small"
                        sx={{ bgcolor: '#e8f5e9', color: '#27ae60', fontWeight: 700, fontSize: '0.6rem', height: 17 }} />
                    )}
                  </Box>
                  <Typography variant="caption" display="block" sx={{ color: '#3a3a3a', lineHeight: 1.55, mb: 0.3 }}>
                    <strong>Finding:</strong> {result.finding}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ color: '#4a4a4a', lineHeight: 1.55 }}>
                    <strong>Recommendation:</strong> {result.recommendation}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          {messages.length > 0 && (
            <Box sx={{ mx: 1.25, mt: 1, maxHeight: 180, overflowY: 'auto' }}>
              {messages.map((m, i) => {
                const isUser = m.role === 'user';
                return (
                  <Box key={i} sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', mb: 0.75 }}>
                    <Box sx={{
                      maxWidth: '85%', px: 1.1, py: 0.55,
                      bgcolor: isUser ? '#24483E' : '#edf3f0',
                      color: isUser ? '#fff' : 'text.primary',
                      borderRadius: isUser ? '11px 11px 3px 11px' : '11px 11px 11px 3px',
                      fontSize: '0.75rem', lineHeight: 1.5, whiteSpace: 'pre-wrap',
                    }}>
                      {m.content}
                    </Box>
                  </Box>
                );
              })}
              {chatting && (
                <Box sx={{ display: 'flex', gap: 0.35, px: 1.1, py: 0.6, width: 'fit-content',
                  bgcolor: '#edf3f0', borderRadius: '11px 11px 11px 3px', mb: 0.75 }}>
                  {[0,1,2].map(i => (
                    <Box key={i} sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#24483E',
                      animation: 'blink 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s`,
                      '@keyframes blink': { '0%,80%,100%': { opacity: 0.2 }, '40%': { opacity: 1 } } }} />
                  ))}
                </Box>
              )}
              <div ref={bottomRef} />
            </Box>
          )}

          <Box sx={{ px: 1.25, pt: 0.75, pb: 1, display: 'flex', gap: 0.75, alignItems: 'flex-end' }}>
            <TextField
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
              placeholder="Ask about this control or uploaded documents..."
              size="small" fullWidth multiline maxRows={3} disabled={chatting}
              sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.78rem' } }}
            />
            <IconButton onClick={handleChat} disabled={chatting || !input.trim()} size="small"
              sx={{ bgcolor: '#24483E', color: '#fff', '&:hover': { bgcolor: '#1a3228' }, '&.Mui-disabled': { bgcolor: '#e0e0e0' }, p: 0.7 }}>
              <Send sx={{ fontSize: 15 }} />
            </IconButton>
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ─── Generic section view ─────────────────────────────────────────────────────
function GenericSection({ section, responses, onChange, readOnly, assessmentId, onEvidenceAdd, onEvidenceDelete }) {
  return (
    <Box>
      {section.questions.map(q => (
        <QuestionRow key={q.id} question={q} response={responses[q.id]}
          onChange={onChange} readOnly={readOnly} showML
          assessmentId={assessmentId}
          onEvidenceAdd={onEvidenceAdd}
          onEvidenceDelete={onEvidenceDelete}
        />
      ))}
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AssessmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isClient = user?.role === 'CLIENT';

  const [assessment,  setAssessment]  = useState(null);
  const [template,    setTemplate]    = useState(null);
  const [responses,   setResponses]   = useState({});
  const [dirty,       setDirty]       = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [saved,       setSaved]       = useState(false);
  const [baselineDlg,  setBaselineDlg]  = useState(false);
  const [exporting,    setExporting]    = useState(false);

  // Autosave
  const autoSaveTimer    = useRef(null);
  const savedTimerRef    = useRef(null);
  const hasInteracted    = useRef(false);
  const isSavingRef      = useRef(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // 'idle'|'pending'|'saving'|'saved'|'error'

  // E8/CIS/AESCSF level-based
  const [activeControl,        setActiveControl]        = useState(null);  // section object
  const [controlTargets,       setControlTargets]       = useState({});    // {sectionId: ml} or {'__sp': sp} for AESCSF
  // Generic (non-level-based) layout
  const [activeGenericSection, setActiveGenericSection] = useState(null);

  const isE8     = useMemo(() => E8_FRAMEWORKS.includes(template?.framework),     [template]);
  const isCIS    = useMemo(() => CIS_FRAMEWORKS.includes(template?.framework),    [template]);
  const isAESCSF = useMemo(() => AESCSF_FRAMEWORKS.includes(template?.framework), [template]);
  const isLevelBased = isE8 || isCIS || isAESCSF;
  const levelPrefix  = isCIS ? 'IG' : isAESCSF ? 'MIL' : 'ML';
  const levelLabels  = isCIS ? IG_LABELS : isAESCSF ? MIL_LABELS : ML_LABELS;
  const controlCount = template?.sections?.length ?? 0;

  // AESCSF: global SP target stored in controlTargets['__sp']
  const spTarget = useMemo(() => {
    if (!isAESCSF) return null;
    const v = controlTargets['__sp'];
    return v !== undefined ? parseInt(v) : 2;
  }, [isAESCSF, controlTargets]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const aRes  = await api.get(`/assessments/list/${id}/`);
      const a     = aRes.data;
      setAssessment(a);

      const tRes = await api.get(`/assessments/templates/${a.template}/`);
      setTemplate(tRes.data);

      const initResponses = {};
      (a.responses || []).forEach(r => {
        initResponses[r.question] = { id: r.id, answer: r.answer, notes: r.notes, evidence: r.evidence || [] };
      });
      setResponses(initResponses);

      // Restore control targets from saved config
      if (a.control_config && Object.keys(a.control_config).length) {
        setControlTargets(a.control_config);
      } else if (tRes.data.sections?.length) {
        if (AESCSF_FRAMEWORKS.includes(tRes.data.framework)) {
          // AESCSF: default to SP-2 scope
          setControlTargets({ '__sp': 2 });
        } else {
          // E8/CIS: default all controls to ML1/IG1
          const defaults = {};
          tRes.data.sections.forEach(s => { defaults[s.id] = 1; });
          setControlTargets(defaults);
        }
      }
    } catch (e) {
      setError('Failed to load assessment.');
      console.error(e);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Allow autosave once initial data is settled (500 ms buffer so setState calls from load don't fire it)
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => { hasInteracted.current = true; }, 500);
      return () => clearTimeout(t);
    }
  }, [loading]);

  // Set active control / generic section to first section on load
  useEffect(() => {
    if (template?.sections?.length) {
      if (!activeControl)        setActiveControl(template.sections[0]);
      if (!activeGenericSection) setActiveGenericSection(template.sections[0]);
    }
  }, [template, activeControl, activeGenericSection]);


  const handleChange = (questionId, data) => {
    setResponses(prev => ({ ...prev, [questionId]: { ...prev[questionId], ...data } }));
    setDirty(true);
    setSaved(false);
  };

  const handleEvidenceAdd = useCallback((questionId, evidenceItem) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], evidence: [...(prev[questionId]?.evidence || []), evidenceItem] },
    }));
  }, []);

  const handleEvidenceDelete = useCallback((questionId, evidenceId) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], evidence: (prev[questionId]?.evidence || []).filter(e => e.id !== evidenceId) },
    }));
  }, []);

  const handleSetTarget = async (sectionId, ml) => {
    const next = { ...controlTargets, [sectionId]: ml };
    setControlTargets(next);
    setDirty(true);
    try {
      await api.patch(`/assessments/list/${id}/`, { control_config: next });
    } catch (e) { console.error(e); }
  };

  const handleSetSP = async (sp) => {
    const next = { ...controlTargets, '__sp': sp };
    setControlTargets(next);
    setDirty(true);
    try {
      await api.patch(`/assessments/list/${id}/`, { control_config: next });
    } catch (e) { console.error(e); }
  };

  // Build and POST the full responses payload; used by both manual save and autosave.
  const persistResponses = useCallback(async (currentResponses, currentTargets) => {
    const payload = Object.entries(currentResponses).map(([qId, data]) => ({
      question:          parseInt(qId),
      answer:            data.answer || '',
      notes:             data.notes  || '',
      maturity_achieved: isPositive(data.answer),
    }));
    const saved = await api.post(`/assessments/list/${id}/save_responses/`, { responses: payload });
    // Capture response IDs so evidence uploads can reference them
    setResponses(prev => {
      const updated = { ...prev };
      (saved.data || []).forEach(r => {
        if (updated[r.question] !== undefined) {
          updated[r.question] = { ...updated[r.question], id: r.id };
        }
      });
      return updated;
    });
    await api.patch(`/assessments/list/${id}/`, { control_config: currentTargets });
  }, [id]);

  // Autosave — debounced 2 s after last change. Runs silently in the background.
  const performAutoSave = useCallback(async (currentResponses, currentTargets) => {
    isSavingRef.current = true;
    setAutoSaveStatus('saving');
    try {
      await persistResponses(currentResponses, currentTargets);
      setDirty(false);
      setAutoSaveStatus('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setAutoSaveStatus('idle'), 3000);
    } catch {
      setAutoSaveStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [persistResponses]);

  // Watch responses + controlTargets; schedule autosave on any change.
  useEffect(() => {
    if (!hasInteracted.current) return;
    if (isSavingRef.current) return;   // setResponses(IDs) in persistResponses triggers this — skip
    setAutoSaveStatus('pending');
    setDirty(true);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    // Capture current values so the callback uses the snapshot at schedule time.
    const snapResponses = responses;
    const snapTargets   = controlTargets;
    autoSaveTimer.current = setTimeout(() => performAutoSave(snapResponses, snapTargets), 2000);
  }, [responses, controlTargets]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaving(true);
    setError('');
    try {
      await persistResponses(responses, controlTargets);
      setDirty(false);
      setSaved(true);
      setAutoSaveStatus('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setAutoSaveStatus('idle'), 3000);
    } catch {
      setError('Failed to save responses.');
      setAutoSaveStatus('error');
    }
    setSaving(false);
  };

  const handleComplete = async () => {
    if (dirty) await handleSave();
    setSaving(true);
    try {
      const res = await api.post(`/assessments/list/${id}/complete/`);
      setAssessment(res.data);
      setSaved(true);
    } catch { setError('Failed to complete assessment.'); }
    setSaving(false);
  };

  const handleSetBaseline = async () => {
    try {
      const res = await api.post(`/assessments/list/${id}/set_baseline/`);
      setAssessment(res.data);
      setBaselineDlg(false);
    } catch { setError('Failed to set baseline.'); }
  };

  const handleExport = async (compare = false, format = 'html') => {
    setExporting(true);
    try {
      const qs     = compare ? '?compare=1' : '';
      const action = format === 'pdf' ? 'export_pdf' : 'export_report';
      const res    = await api.get(`/assessments/list/${id}/${action}/${qs}`, {
        responseType: 'blob', timeout: 120000,
      });
      const mime = format === 'pdf' ? 'application/pdf' : 'text/html';
      const ext  = format === 'pdf' ? 'pdf' : 'html';
      const blob = new Blob([res.data], { type: mime });
      const a    = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = compare ? `comparison_${id}.${ext}` : `assessment_${id}.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { setError('Failed to generate report.'); }
    setExporting(false);
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  // For E8: only count questions within each domain's configured target ML.
  // A question is in-scope if its maturity_level is null OR <= the domain's target.
  // Non-E8 frameworks count all questions (no per-section ML targeting).
  const stats = useMemo(() => {
    if (!template) return { total: 0, answered: 0, compliant: 0, partial: 0, nonCompliant: 0, pct: 0 };
    let total = 0, answered = 0, compliant = 0, partial = 0, nonCompliant = 0;
    template.sections.forEach(sec => {
      const targetML = (isE8 || isCIS) ? (controlTargets[sec.id] || 1) : Infinity;
      sec.questions.forEach(q => {
        // AESCSF: SP scope filter (weight stores SP level)
        if (isAESCSF && spTarget != null && q.weight && Math.round(q.weight) > spTarget) return;
        // E8/CIS: ML scope filter
        if ((isE8 || isCIS) && q.maturity_level != null && q.maturity_level > targetML) return;
        total++;
        const ans = responses[q.id]?.answer;
        if (ans) {
          answered++;
          if (isPositive(ans)) compliant++;
          else if (isPartial(ans)) partial++;
          else if (isNegative(ans)) nonCompliant++;
        }
      });
    });
    return { total, answered, compliant, partial, nonCompliant, pct: total ? Math.round((answered / total) * 100) : 0 };
  }, [template, responses, controlTargets, isE8, isCIS, isAESCSF, spTarget]);

  const overallScore = useMemo(() => {
    if (!stats.answered) return 0;
    const pos = stats.compliant + stats.partial * 0.5;
    return stats.total ? Math.round((pos / stats.total) * 100) : 0;
  }, [stats]);

  // Overall achieved MIL/ML/IG — weakest-link minimum across all domains.
  // For AESCSF, only counts questions within the SP scope.
  const overallAchievedML = useMemo(() => {
    if (!template || !isLevelBased) return null;
    let overall = 3;
    template.sections.forEach(sec => {
      const qs = isAESCSF && spTarget != null
        ? sec.questions.filter(q => !q.weight || Math.round(q.weight) <= spTarget)
        : sec.questions;
      const byML = { 1: [], 2: [], 3: [] };
      qs.forEach(q => {
        if (q.maturity_level >= 1 && q.maturity_level <= 3) byML[q.maturity_level].push(q);
      });
      let sectionML = 0;
      for (let ml = 1; ml <= 3; ml++) {
        const mlQs = byML[ml];
        if (!mlQs.length) continue;
        if (mlQs.every(q => isPositive(responses[q.id]?.answer))) {
          sectionML = ml;
        } else {
          break;
        }
      }
      if (sectionML < overall) overall = sectionML;
    });
    return overall;
  }, [template, responses, isLevelBased, isAESCSF, spTarget]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!assessment || !template) return <Alert severity="error">Assessment not found.</Alert>;

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2.5 }}>
        <IconButton onClick={() => navigate('/assessments')} size="small" sx={{ mt: 0.5 }}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>{assessment.title}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
            <Chip label={template.framework_display || template.framework} size="small"
              sx={{ bgcolor: '#24483E', color: '#fff', fontWeight: 600 }} />
            <Chip label={assessment.status_display} size="small"
              color={assessment.status === 'COMPLETED' ? 'success' : assessment.status === 'IN_PROGRESS' ? 'warning' : 'default'}
              variant="outlined" />
            {assessment.engagement_name && (
              <Chip label={assessment.engagement_name} size="small" variant="outlined" />
            )}
            {assessment.score !== null && assessment.score !== undefined && (
              <Chip label={`Score: ${assessment.score}%`} size="small"
                sx={{ bgcolor: scoreColor(assessment.score), color: '#fff', fontWeight: 700 }} />
            )}
            {assessment.is_baseline && (
              <Chip icon={<Star sx={{ fontSize: '14px !important' }} />} label="Baseline" size="small"
                sx={{ bgcolor: '#c9a84c', color: '#fff', fontWeight: 700 }} />
            )}
          </Box>
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Autosave status indicator */}
          {!isClient && assessment.status !== 'COMPLETED' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 0.5 }}>
              {autoSaveStatus === 'pending' && <><HourglassEmpty sx={{ fontSize: 14, color: '#f39c12' }} /><Typography variant="caption" color="text.secondary">Unsaved…</Typography></>}
              {autoSaveStatus === 'saving'  && <><CircularProgress size={12} /><Typography variant="caption" color="text.secondary">Saving…</Typography></>}
              {autoSaveStatus === 'saved'   && <><CloudDone sx={{ fontSize: 14, color: '#27ae60' }} /><Typography variant="caption" sx={{ color: '#27ae60' }}>Saved</Typography></>}
              {autoSaveStatus === 'error'   && <><Cancel sx={{ fontSize: 14, color: '#c0392b' }} /><Typography variant="caption" color="error">Save failed</Typography></>}
            </Box>
          )}
          {!isClient && (
            <>
              <Button variant="outlined" startIcon={<Save />} onClick={handleSave} disabled={saving || !dirty} size="small">
                {saving ? 'Saving…' : 'Save'}
              </Button>
              {assessment.status !== 'COMPLETED' && (
                <Button variant="contained" startIcon={<AssignmentTurnedIn />} onClick={handleComplete}
                  disabled={saving || stats.answered === 0} size="small" sx={{ bgcolor: '#24483E' }}>
                  Complete
                </Button>
              )}
              <Tooltip title={assessment.is_baseline ? 'This is the baseline' : 'Set as baseline'}>
                <span>
                  <Button
                    variant={assessment.is_baseline ? 'contained' : 'outlined'}
                    startIcon={assessment.is_baseline ? <Star /> : <StarBorder />}
                    onClick={() => setBaselineDlg(true)} size="small"
                    sx={assessment.is_baseline ? { bgcolor: '#c9a84c', '&:hover': { bgcolor: '#b8963c' } } : {}}
                  >
                    {assessment.is_baseline ? 'Baseline' : 'Set Baseline'}
                  </Button>
                </span>
              </Tooltip>
            </>
          )}
          <Button variant="outlined" size="small"
            startIcon={exporting ? <CircularProgress size={12} /> : <FileDownload />}
            onClick={() => handleExport(false, 'html')} disabled={exporting}
            sx={{ borderColor: '#c9a84c', color: '#c9a84c' }}>
            HTML
          </Button>
          <Button variant="contained" size="small"
            startIcon={exporting ? <CircularProgress size={12} /> : <PictureAsPdf />}
            onClick={() => handleExport(false, 'pdf')} disabled={exporting}
            sx={{ bgcolor: '#c9a84c' }}>
            PDF
          </Button>
          {assessment.baseline && (
            <Button variant="outlined" size="small" startIcon={<CompareArrows />}
              onClick={() => handleExport(true, 'pdf')} disabled={exporting}
              sx={{ borderColor: '#24483E', color: '#24483E' }}>
              Compare
            </Button>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      {saved && <Alert severity="success" onClose={() => setSaved(false)} sx={{ mb: 2 }}>Saved successfully.</Alert>}

      {/* ── Stats Bar — level-based frameworks only; GRC uses the Overview tab ── */}
      {isLevelBased && <Paper sx={{ p: 2, mb: 2.5 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs="auto">
            <CircularScore value={overallScore} size={72} stroke={6} />
          </Grid>
          <Grid item xs>
            <Grid container spacing={1.5}>
              {[
                { label: 'Progress',      value: `${stats.answered}/${stats.total}`, sub: `${stats.pct}% answered`, color: '#24483E' },
                { label: 'Compliant',     value: stats.compliant,   color: '#27ae60' },
                { label: 'Partial',       value: stats.partial,     color: '#f39c12' },
                { label: 'Non-Compliant', value: stats.nonCompliant, color: '#c0392b' },
                { label: 'Unanswered',    value: stats.total - stats.answered, color: '#95a5a6' },
              ].map(({ label, value, sub, color }) => (
                <Grid item key={label}>
                  <Box sx={{ textAlign: 'center', px: 1.5, borderLeft: `3px solid ${color}`, bgcolor: `${color}08`, borderRadius: '0 6px 6px 0', py: 0.5 }}>
                    <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{label}</Typography>
                    {sub && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', display: 'block' }}>{sub}</Typography>}
                  </Box>
                </Grid>
              ))}
              {/* E8/CIS: live overall achieved level indicator */}
              {isLevelBased && overallAchievedML !== null && (
                <Grid item>
                  <Box sx={{
                    textAlign: 'center', px: 1.5, py: 0.5,
                    borderLeft: `3px solid ${ML_COLORS[overallAchievedML] || '#95a5a6'}`,
                    bgcolor: `${ML_COLORS[overallAchievedML] || '#95a5a6'}12`,
                    borderRadius: '0 6px 6px 0',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                      <EmojiEvents sx={{ fontSize: 16, color: ML_COLORS[overallAchievedML] || '#95a5a6' }} />
                      <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: ML_COLORS[overallAchievedML] || '#95a5a6', lineHeight: 1 }}>
                        {overallAchievedML > 0 ? `${levelPrefix}${overallAchievedML}` : '—'}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Achieved {levelPrefix}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', display: 'block' }}>
                      {overallAchievedML > 0 ? levelLabels[overallAchievedML] : `Not yet at ${levelPrefix}1`}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Grid>
          {assessment.baseline_title && assessment.baseline_score !== null && (
            <Grid item xs="auto">
              <Box sx={{ textAlign: 'center', p: 1.25, border: '1px solid #c9a84c', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block">vs Baseline</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography fontWeight={800} sx={{ color: '#c9a84c' }}>{assessment.baseline_score}%</Typography>
                  <Typography>→</Typography>
                  <Typography fontWeight={800} sx={{ color: assessment.score ? scoreColor(assessment.score) : '#999' }}>
                    {assessment.score ?? 'N/A'}%
                  </Typography>
                  {assessment.score !== null && (
                    <Chip
                      label={`${assessment.score >= assessment.baseline_score ? '+' : ''}${(assessment.score - assessment.baseline_score).toFixed(1)}%`}
                      size="small"
                      sx={{ bgcolor: assessment.score >= assessment.baseline_score ? '#e8f5e9' : '#ffebee', color: assessment.score >= assessment.baseline_score ? '#27ae60' : '#c0392b', fontWeight: 700, height: 20, fontSize: '0.65rem' }}
                    />
                  )}
                </Box>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>}

      {/* ── AESCSF: Security Profile selector ── */}
      {isAESCSF && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: '#f5f0fb', border: '1px solid #d7bef7' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="subtitle2" fontWeight={700} color="#8e44ad">Security Profile (SP) Target</Typography>
              <Typography variant="caption" color="text.secondary">
                Select your organisation's Security Profile based on criticality. Practices above this SP are excluded from scope.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {[1, 2, 3].map(sp => (
                <Button key={sp} variant={spTarget === sp ? 'contained' : 'outlined'} size="small"
                  onClick={() => !isClient && handleSetSP(sp)} disabled={isClient}
                  sx={{
                    borderColor: SP_COLORS[sp], color: spTarget === sp ? '#fff' : SP_COLORS[sp],
                    bgcolor: spTarget === sp ? SP_COLORS[sp] : 'transparent',
                    '&:hover': { bgcolor: spTarget === sp ? SP_COLORS[sp] : `${SP_COLORS[sp]}18` },
                    fontWeight: 700, fontSize: '0.72rem', minWidth: 52,
                  }}>
                  SP-{sp}
                </Button>
              ))}
            </Box>
            {spTarget && (
              <Chip label={SP_LABELS[spTarget]} size="small"
                sx={{ bgcolor: `${SP_COLORS[spTarget]}20`, color: SP_COLORS[spTarget], fontWeight: 600, fontSize: '0.7rem' }} />
            )}
          </Box>
        </Paper>
      )}

      {/* ── E8 / CIS / AESCSF Layout: sidebar + detail ── */}
      {isLevelBased && (
        <Grid container spacing={2}>
          {/* Left: Control tracker */}
          <Grid item xs={12} md={3.5}>
            <Paper sx={{ p: 1.5, position: 'sticky', top: 16 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Security sx={{ color: '#24483E', fontSize: 18 }} />
                <Typography variant="subtitle2" fontWeight={700}>{controlCount} {isAESCSF ? 'Domains' : 'Controls'}</Typography>
                {isAESCSF ? (
                  <Chip label={spTarget ? `SP-${spTarget} scope` : 'Select SP'} size="small"
                    sx={{ ml: 'auto', height: 18, fontSize: '0.58rem', bgcolor: spTarget ? `${SP_COLORS[spTarget]}20` : '#f0f4f2', color: spTarget ? SP_COLORS[spTarget] : '#24483E', fontWeight: 700 }} />
                ) : (
                  <Chip label={`Target mixed ${levelPrefix}`} size="small"
                    sx={{ ml: 'auto', height: 18, fontSize: '0.58rem', bgcolor: '#f0f4f2', color: '#24483E' }} />
                )}
              </Box>

              <Grid container spacing={1}>
                {template.sections.map(section => (
                  <Grid item xs={6} key={section.id}>
                    <E8ControlCard
                      section={section}
                      responses={responses}
                      targetML={isAESCSF ? 3 : (controlTargets[section.id] || 1)}
                      onSetTarget={handleSetTarget}
                      onClick={setActiveControl}
                      isActive={activeControl?.id === section.id}
                      readOnly={isClient}
                      levelPrefix={levelPrefix}
                      levelLabels={levelLabels}
                      spTarget={isAESCSF ? spTarget : null}
                      showLevelSelector={!isAESCSF}
                    />
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ p: 1, bgcolor: '#f8faf9', borderRadius: 1.5 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
                  {isAESCSF ? 'MIL Achievement Legend' : `${levelPrefix} Target Legend`}
                </Typography>
                {[1, 2, 3].map(ml => (
                  <Box key={ml} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.3 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ML_COLORS[ml], flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
                      {levelPrefix}{ml}: {levelLabels[ml]}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Right: Active control questions */}
          <Grid item xs={12} md={8.5}>
            {activeControl ? (
              <E8ControlDetail
                section={activeControl}
                responses={responses}
                targetML={isAESCSF ? 3 : (controlTargets[activeControl.id] || 1)}
                onChange={handleChange}
                readOnly={isClient}
                levelPrefix={levelPrefix}
                levelLabels={levelLabels}
                spTarget={isAESCSF ? spTarget : null}
                assessmentId={assessment.id}
                onEvidenceAdd={handleEvidenceAdd}
                onEvidenceDelete={handleEvidenceDelete}
              />
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <AssessmentIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
                <Typography color="text.secondary">Select a domain from the panel to begin assessment</Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      )}

      {/* ── Generic Layout (GRC / CUSTOM frameworks) — Full Vanta-style GRC platform ── */}
      {!isLevelBased && (
        <GRCAssessmentView
          assessment={assessment}
          template={template}
          responses={responses}
          onChange={handleChange}
          isClient={isClient}
          onEvidenceAdd={handleEvidenceAdd}
          onEvidenceDelete={handleEvidenceDelete}
          onExport={handleExport}
          exporting={exporting}
        />
      )}

      {/* ── Sticky Save Bar ── */}
      {dirty && !isClient && (
        <Box sx={{ position: 'sticky', bottom: 16, display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving}
            sx={{ bgcolor: '#24483E', boxShadow: 4, borderRadius: 2 }}>
            {saving ? 'Saving…' : 'Save Progress'}
          </Button>
        </Box>
      )}

      {/* ── Baseline Dialog ── */}
      <Dialog open={baselineDlg} onClose={() => setBaselineDlg(false)} maxWidth="xs">
        <DialogTitle>{assessment.is_baseline ? 'Already a Baseline' : 'Set as Baseline'}</DialogTitle>
        <DialogContent>
          {assessment.is_baseline
            ? <Typography>This assessment is already the baseline for this template. Future assessments will be compared against it.</Typography>
            : <Typography>Mark <strong>{assessment.title}</strong> as the baseline? Existing baselines for this template will be replaced.</Typography>
          }
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBaselineDlg(false)}>Cancel</Button>
          {!assessment.is_baseline && (
            <Button variant="contained" onClick={handleSetBaseline} sx={{ bgcolor: '#c9a84c', '&:hover': { bgcolor: '#b8963c' } }}>
              Set as Baseline
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
