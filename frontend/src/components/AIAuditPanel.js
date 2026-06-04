import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, Button, IconButton, Divider, TextField,
  CircularProgress, Chip, Paper, LinearProgress, Tooltip,
  Alert,
} from '@mui/material';
import {
  Close, UploadFile, Send, AutoAwesome, InsertDriveFile,
  CheckCircle, RemoveCircleOutline, Cancel, Psychology,
  Refresh, ContentCopy, AssignmentTurnedIn,
} from '@mui/icons-material';
import api from '../utils/api';

const STATUS_COLOR = {
  'Compliant':           '#27ae60',
  'Partially Compliant': '#f39c12',
  'Non-Compliant':       '#c0392b',
  'Not Applicable':      '#95a5a6',
};

const STATUS_ICON = {
  'Compliant':           <CheckCircle sx={{ fontSize: 16 }} />,
  'Partially Compliant': <RemoveCircleOutline sx={{ fontSize: 16 }} />,
  'Non-Compliant':       <Cancel sx={{ fontSize: 16 }} />,
  'Not Applicable':      <RemoveCircleOutline sx={{ fontSize: 16 }} />,
};

// Map AI status → assessment answer for YESNO / CHOICE type questions
const STATUS_TO_ANSWER = {
  'Compliant':           { yesno: 'YES',     choice: 'Fully Implemented' },
  'Partially Compliant': { yesno: 'PARTIAL', choice: 'Partially Implemented' },
  'Non-Compliant':       { yesno: 'NO',      choice: 'Not Implemented' },
  'Not Applicable':      { yesno: 'N/A',     choice: 'Not Applicable' },
};

function ScoreRing({ score, size = 56 }) {
  const stroke = 5;
  const r      = (size - stroke * 2) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color  = score >= 75 ? '#27ae60' : score >= 50 ? '#f39c12' : '#c0392b';
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e0e0e0" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color, lineHeight: 1 }}>{score}%</Typography>
      </Box>
    </Box>
  );
}

function ChatBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <Box sx={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      mb: 1.25,
    }}>
      {!isUser && (
        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#24483E', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1, flexShrink: 0, mt: 0.25 }}>
          <Psychology sx={{ fontSize: 16, color: '#fff' }} />
        </Box>
      )}
      <Box sx={{
        maxWidth: '82%', px: 1.5, py: 1,
        bgcolor: isUser ? '#24483E' : '#f4f6f4',
        color: isUser ? '#fff' : 'text.primary',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        fontSize: '0.82rem', lineHeight: 1.6, whiteSpace: 'pre-wrap',
      }}>
        {msg.content}
      </Box>
    </Box>
  );
}

function ScanResults({ result, template, onApply }) {
  const { overall_score, summary, sections = [] } = result;

  return (
    <Box>
      {/* Overall */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: '#f8faf9', border: '1px solid #d0e8d8' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ScoreRing score={overall_score} size={64} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>Overall Compliance Score</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>{summary}</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Per-section findings */}
      {sections.map((s) => {
        const col  = STATUS_COLOR[s.status] || '#95a5a6';
        const icon = STATUS_ICON[s.status];
        return (
          <Paper key={s.section_id} sx={{ p: 1.5, mb: 1.25, border: `1px solid ${col}40` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <ScoreRing score={s.score} size={40} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.3 }}>{s.section_name}</Typography>
                <Chip
                  icon={React.cloneElement(icon, { sx: { fontSize: '13px !important', color: `${col} !important` } })}
                  label={s.status}
                  size="small"
                  sx={{ bgcolor: `${col}18`, color: col, fontWeight: 700, fontSize: '0.65rem', height: 20, mt: 0.25 }}
                />
              </Box>
            </Box>
            <Typography variant="caption" display="block" sx={{ mb: 0.5, color: '#444', lineHeight: 1.5 }}>
              <strong>Finding:</strong> {s.finding}
            </Typography>
            <Typography variant="caption" display="block" sx={{ color: '#555', lineHeight: 1.5 }}>
              <strong>Recommendation:</strong> {s.recommendation}
            </Typography>
          </Paper>
        );
      })}

      {/* Apply button */}
      {onApply && sections.length > 0 && (
        <Button
          variant="contained"
          fullWidth
          startIcon={<AssignmentTurnedIn />}
          onClick={() => onApply(sections)}
          sx={{ mt: 1, bgcolor: '#24483E', '&:hover': { bgcolor: '#1a3228' } }}
        >
          Apply findings to assessment
        </Button>
      )}
    </Box>
  );
}

export default function AIAuditPanel({ open, onClose, assessmentId, template, onApplyFindings }) {
  const [messages,    setMessages]    = useState([
    { role: 'assistant', content: 'Hello! I\'m your AI audit assistant. Upload a document (PDF, DOCX, or TXT) and I\'ll review it against the assessment controls — or ask me anything about this assessment.' },
  ]);
  const [input,       setInput]       = useState('');
  const [docText,     setDocText]     = useState('');
  const [docName,     setDocName]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [scanResult,  setScanResult]  = useState(null);
  const [error,       setError]       = useState('');
  const fileRef  = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, scanResult, loading]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setError('');
    setLoading(true);
    setDocName(file.name);
    setScanResult(null);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('mode', 'chat');
    fd.append('message', '');

    try {
      const res = await api.post(`/assessments/list/${assessmentId}/ai_audit/`, fd);
      setDocText(res.data.doc_text || '');
      setMessages(prev => [
        ...prev,
        { role: 'user',      content: `📄 Uploaded: ${file.name}` },
        { role: 'assistant', content: `Document loaded (${Math.round((res.data.doc_text || '').length / 1000)}k chars extracted). You can now ask questions about it or click "Run Full Audit" to get a structured compliance report.` },
      ]);
    } catch {
      setError('Failed to upload document.');
    }
    setLoading(false);
  };

  const sendMessage = async (msgOverride, modeOverride = 'chat') => {
    const msg  = msgOverride ?? input.trim();
    const mode = modeOverride;
    if (!msg && mode === 'chat') return;

    setError('');
    setInput('');
    if (mode === 'chat') {
      setMessages(prev => [...prev, { role: 'user', content: msg }]);
    } else {
      setMessages(prev => [...prev, { role: 'user', content: '🔍 Running full audit scan…' }]);
      setScanResult(null);
    }
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('mode', mode);
      fd.append('message', msg);
      fd.append('doc_text', docText);

      const res  = await api.post(`/assessments/list/${assessmentId}/ai_audit/`, fd);
      const data = res.data;

      if (data.type === 'scan' && data.result) {
        setScanResult(data.result);
        setMessages(prev => [...prev, { role: 'assistant', content: `Audit complete. Overall score: ${data.result.overall_score}%. See structured findings below.` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message || '(no response)' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ AI request failed. Ensure Ollama is running and the mistral model is available.' }]);
      setError('AI request failed.');
    }
    setLoading(false);
  };

  const handleApply = (sections) => {
    if (!template || !onApplyFindings) return;

    // Build questionId → { answer, notes } mapping
    const updates = {};
    sections.forEach(sec => {
      const tmplSec = template.sections.find(s => s.id === sec.section_id);
      if (!tmplSec) return;

      const answerMap = STATUS_TO_ANSWER[sec.status] || STATUS_TO_ANSWER['Not Applicable'];
      const notes = [sec.finding, sec.recommendation].filter(Boolean).join('\n\nRecommendation: ');

      tmplSec.questions.forEach(q => {
        let answer = '';
        if (q.question_type === 'YESNO')   answer = answerMap.yesno;
        if (q.question_type === 'CHOICE')  answer = answerMap.choice;
        if (answer) updates[q.id] = { answer, notes };
      });
    });

    onApplyFindings(updates);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `✅ Applied findings to ${Object.keys(updates).length} controls. Review and adjust as needed before saving.`,
    }]);
  };

  if (!open) return null;

  return (
    <Box sx={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: { xs: '100%', sm: 480 },
      bgcolor: 'background.paper', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
      display: 'flex', flexDirection: 'column', zIndex: 1300,
    }}>
      {/* Header */}
      <Box sx={{ px: 2, py: 1.5, bgcolor: '#24483E', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <AutoAwesome sx={{ color: '#FFF1AA', fontSize: 20 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} color="#fff">AI Audit Assistant</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.68rem' }}>
            Powered by {docName ? `• ${docName}` : 'Ollama / Mistral'}
          </Typography>
        </Box>
        <Tooltip title="Run Full Audit">
          <span>
            <Button
              size="small" variant="outlined"
              onClick={() => sendMessage('Run a full compliance audit of the uploaded document against all sections.', 'scan')}
              disabled={loading || !docText}
              startIcon={<Psychology sx={{ fontSize: 15 }} />}
              sx={{ color: '#FFF1AA', borderColor: '#FFF1AA55', fontSize: '0.7rem', textTransform: 'none', mr: 0.5,
                '&:hover': { borderColor: '#FFF1AA', bgcolor: 'rgba(255,241,170,0.1)' } }}
            >
              Full Audit
            </Button>
          </span>
        </Tooltip>
        <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          <Close />
        </IconButton>
      </Box>

      {/* Upload bar */}
      <Box sx={{ px: 2, py: 1, bgcolor: '#f8faf9', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 1 }}>
        <input ref={fileRef} type="file" hidden accept=".pdf,.docx,.txt" onChange={handleFileUpload} />
        <Button
          size="small" variant="outlined" startIcon={<UploadFile sx={{ fontSize: 15 }} />}
          onClick={() => fileRef.current?.click()} disabled={loading}
          sx={{ fontSize: '0.72rem', textTransform: 'none', borderColor: '#24483E', color: '#24483E' }}
        >
          Upload document
        </Button>
        {docName && (
          <Chip
            size="small" icon={<InsertDriveFile sx={{ fontSize: '13px !important' }} />}
            label={docName.length > 30 ? docName.slice(0, 27) + '…' : docName}
            onDelete={() => { setDocName(''); setDocText(''); setScanResult(null); }}
            sx={{ fontSize: '0.68rem' }}
          />
        )}
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mx: 2, mt: 1, py: 0.25, fontSize: '0.75rem' }}>{error}</Alert>}

      {/* Chat + results */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}>
        {messages.map((m, i) => <ChatBubble key={i} msg={m} />)}

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#24483E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Psychology sx={{ fontSize: 16, color: '#fff' }} />
            </Box>
            <Box sx={{ px: 1.5, py: 0.75, bgcolor: '#f4f6f4', borderRadius: '14px 14px 14px 4px', display: 'flex', gap: 0.5, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <Box key={i} sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#24483E', animation: 'pulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s`,
                  '@keyframes pulse': { '0%,80%,100%': { opacity: 0.3 }, '40%': { opacity: 1 } } }} />
              ))}
            </Box>
          </Box>
        )}

        {scanResult && (
          <Box sx={{ mt: 1.5 }}>
            <Divider sx={{ mb: 1.5 }}><Chip label="Audit Results" size="small" sx={{ fontSize: '0.68rem' }} /></Divider>
            <ScanResults result={scanResult} template={template} onApply={handleApply} />
          </Box>
        )}

        <div ref={bottomRef} />
      </Box>

      {/* Input */}
      <Divider />
      <Box sx={{ px: 1.5, py: 1, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder={docText ? 'Ask about the document…' : 'Ask about this assessment…'}
          size="small" fullWidth multiline maxRows={4} disabled={loading}
          sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.82rem' } }}
        />
        <IconButton
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          sx={{ bgcolor: '#24483E', color: '#fff', '&:hover': { bgcolor: '#1a3228' }, '&.Mui-disabled': { bgcolor: '#e0e0e0' }, flexShrink: 0 }}
        >
          <Send sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
  );
}
