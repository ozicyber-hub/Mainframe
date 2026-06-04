import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, TextField, MenuItem,
  Chip, LinearProgress, Alert, CircularProgress, IconButton,
  Tooltip, Collapse, Dialog, DialogTitle, DialogContent,
  DialogActions, Divider, Badge, ButtonGroup, Menu,
} from '@mui/material';
import {
  ArrowBack, ExpandMore, ExpandLess, LightbulbOutlined,
  Add, Delete, OpenInNew, CheckCircle, Search, AttachFile,
  Assessment as ReportIcon, ArrowDropDown, Edit,
} from '@mui/icons-material';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const FRAMEWORK_ACCENT = {
  NIST_CSF_2:      '#1565c0',
  NIST_800_171_R3: '#283593',
  ISO_27001_2022:  '#1b5e20',
  SOC2:            '#4a148c',
  HIPAA:           '#b71c1c',
};

const STATUS_OPTIONS = [
  { value: 'NOT_STARTED',           label: 'Not Started',           color: '#bdbdbd' },
  { value: 'IN_PROGRESS',           label: 'In Progress',           color: '#3498db' },
  { value: 'IMPLEMENTED',           label: 'Implemented',           color: '#27ae60' },
  { value: 'PARTIALLY_IMPLEMENTED', label: 'Partially Implemented', color: '#f39c12' },
  { value: 'NOT_APPLICABLE',        label: 'Not Applicable',        color: '#95a5a6' },
  { value: 'PLANNED',               label: 'Planned',               color: '#8e44ad' },
];

const STATUS_MAP = Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s]));

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  ...STATUS_OPTIONS,
];

const PROJECT_STATUS_CONFIG = {
  ACTIVE:    { label: 'Active',    color: 'success' },
  COMPLETED: { label: 'Completed', color: 'info'    },
  ARCHIVED:  { label: 'Archived',  color: 'default' },
};

// ─── File upload security ─────────────────────────────────────────────────────

const ALLOWED_EXTS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'odt', 'ods', 'odp', 'rtf', 'txt', 'csv',
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'tif', 'webp',
  'zip', 'tar', 'gz',
  'json', 'xml', 'html', 'htm',
  'eml', 'msg',
  'mp4', 'mov', 'avi',
]);

const BLOCKED_EXTS = new Set([
  'exe', 'com', 'bat', 'cmd', 'sh', 'bash', 'zsh', 'fish',
  'ps1', 'psm1', 'psd1', 'vbs', 'vbe', 'wsf', 'wsh',
  'js', 'jse', 'ts', 'mjs', 'cjs',
  'py', 'pyc', 'pyd', 'pyo', 'pyw',
  'rb', 'pl', 'php', 'php3', 'php4', 'php5', 'phtml',
  'asp', 'aspx', 'ashx', 'asmx', 'jsp', 'jspx',
  'jar', 'war', 'ear', 'class',
  'msi', 'msix', 'appx', 'apk', 'ipa',
  'dll', 'sys', 'drv', 'so', 'dylib',
  'scr', 'hta', 'pif', 'lnk', 'reg', 'inf',
  'go', 'rs', 'c', 'cpp', 'cc', 'cs', 'java',
  'bin', 'elf', 'out',
]);

function validateEvidenceFile(file) {
  const name = file.name.toLowerCase();
  const parts = name.split('.');
  if (parts.length < 2) return 'File must have an extension.';
  const allExts = parts.slice(1);
  for (const ext of allExts) {
    if (BLOCKED_EXTS.has(ext)) return `Files containing ".${ext}" are not permitted for security reasons.`;
  }
  const finalExt = allExts[allExts.length - 1];
  if (!ALLOWED_EXTS.has(finalExt)) return `File type ".${finalExt}" is not allowed. Permitted types include PDF, Word, Excel, images, and common document formats.`;
  if (file.size > 50 * 1024 * 1024) return 'File size must not exceed 50 MB.';
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── StatusDot ────────────────────────────────────────────────────────────────

function StatusDot({ status, size = 10 }) {
  const cfg = STATUS_MAP[status] ?? { color: '#bdbdbd' };
  return <Box sx={{ width: size, height: size, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />;
}

// ─── DiscussionPanel ──────────────────────────────────────────────────────────

function DiscussionPanel({ text }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <Box sx={{ mt: 0.75 }}>
      <Box onClick={() => setOpen(v => !v)}
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: 'pointer',
          color: '#e67e22', '&:hover': { color: '#ca6f1e' } }}>
        <LightbulbOutlined sx={{ fontSize: 14 }} />
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
          {open ? 'Hide guidance' : 'Show supplemental guidance'}
        </Typography>
        {open ? <ExpandLess sx={{ fontSize: 14 }} /> : <ExpandMore sx={{ fontSize: 14 }} />}
      </Box>
      <Collapse in={open}>
        <Box sx={{ mt: 0.75, p: 1.5, borderRadius: 1.5, bgcolor: '#fffde7', border: '1px solid #ffe082' }}>
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
            <LightbulbOutlined sx={{ fontSize: 16, color: '#e67e22', flexShrink: 0, mt: 0.1 }} />
            <Typography variant="caption" sx={{ fontSize: '0.75rem', lineHeight: 1.7, color: '#5d4037' }}>
              {text}
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

// ─── FamilyRow (left panel) ───────────────────────────────────────────────────

const FamilyRow = React.memo(function FamilyRow({ family, isSelected, accentColor, onClick }) {
  const { name, identifier, implemented, total, pct } = family;
  const progColor = pct >= 80 ? '#27ae60' : pct >= 40 ? '#f39c12' : accentColor;

  return (
    <Box onClick={onClick} sx={{
      px: 1.5, py: 1.25, mb: 0.5, borderRadius: 1.5, cursor: 'pointer',
      bgcolor: isSelected ? `${accentColor}12` : 'transparent',
      border: '1px solid', borderColor: isSelected ? accentColor : 'transparent',
      transition: 'all 0.12s',
      '&:hover': { bgcolor: `${accentColor}10`, borderColor: `${accentColor}60` },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.6 }}>
        {identifier && (
          <Chip label={identifier} size="small" sx={{
            height: 18, fontSize: '0.6rem', fontWeight: 800,
            bgcolor: isSelected ? accentColor : `${accentColor}20`,
            color: isSelected ? '#fff' : accentColor,
            letterSpacing: '0.02em', fontFamily: 'monospace',
          }} />
        )}
        <Typography variant="caption" fontWeight={isSelected ? 700 : 500}
          sx={{ fontSize: '0.73rem', lineHeight: 1.3,
            color: isSelected ? 'text.primary' : 'text.secondary', flex: 1 }}>
          {name}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LinearProgress variant="determinate" value={pct}
          sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: '#e0e0e0',
            '& .MuiLinearProgress-bar': { bgcolor: progColor, borderRadius: 2 } }} />
        <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary', minWidth: 30, textAlign: 'right' }}>
          {implemented}/{total}
        </Typography>
      </Box>
    </Box>
  );
});

// ─── EvidenceItem ─────────────────────────────────────────────────────────────

const EvidenceItem = React.memo(function EvidenceItem({ item, onDelete, readOnly }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 1, mb: 0.5,
      borderRadius: 1, bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
      <AttachFile sx={{ fontSize: 16, color: '#6c757d', mt: 0.2, flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" fontWeight={700} display="block" sx={{ fontSize: '0.72rem' }}>
          {item.title}
        </Typography>
        {item.file_url && (
          <Box component="a" href={item.file_url} target="_blank" rel="noreferrer" download
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, color: '#1565c0',
              fontSize: '0.68rem', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
            <AttachFile sx={{ fontSize: 11 }} />
            Download file
          </Box>
        )}
        {item.url && (
          <Box component="a" href={item.url} target="_blank" rel="noreferrer"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, color: '#1565c0',
              fontSize: '0.68rem', textDecoration: 'none', '&:hover': { textDecoration: 'underline' },
              ml: item.file_url ? 1 : 0 }}>
            {item.url.length > 55 ? `${item.url.slice(0, 52)}…` : item.url}
            <OpenInNew sx={{ fontSize: 11 }} />
          </Box>
        )}
        {item.description && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.68rem' }}>
            {item.description}
          </Typography>
        )}
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem' }}>
          {item.uploaded_by_name ?? 'Unknown'} · {fmtDate(item.uploaded_at)}
        </Typography>
      </Box>
      {!readOnly && (
        <Tooltip title="Delete evidence">
          <IconButton size="small" color="error" onClick={() => onDelete(item.id)} sx={{ mt: -0.25 }}>
            <Delete sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
});

// ─── ControlRow ───────────────────────────────────────────────────────────────

const ControlRow = React.memo(function ControlRow({
  cs, isExpanded, onToggle, onStatusChange, onNotesSave,
  onAddEvidence, onDeleteEvidence, isSaving, readOnly,
}) {
  const [localNotes, setLocalNotes] = useState(cs.implementation_notes ?? '');
  const notesRef = useRef(cs.implementation_notes ?? '');

  useEffect(() => {
    if (!isExpanded) {
      setLocalNotes(cs.implementation_notes ?? '');
      notesRef.current = cs.implementation_notes ?? '';
    }
  }, [cs.implementation_notes, isExpanded]);

  const handleNotesBlur = useCallback(() => {
    if (localNotes !== notesRef.current) {
      notesRef.current = localNotes;
      onNotesSave(cs.id, localNotes);
    }
  }, [cs.id, localNotes, onNotesSave]);

  const statusCfg = STATUS_MAP[cs.status] ?? STATUS_MAP.NOT_STARTED;

  return (
    <Box sx={{ borderBottom: '1px solid #f0f0f0', '&:last-child': { borderBottom: 'none' },
      bgcolor: isExpanded ? '#fafbff' : 'transparent', transition: 'background-color 0.1s' }}>

      {/* Control header row */}
      <Box onClick={() => onToggle(cs.id)} sx={{
        display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.1,
        cursor: 'pointer', '&:hover': { bgcolor: '#f5f7ff' },
      }}>
        <Chip label={cs.control_id} size="small" sx={{
          height: 20, fontSize: '0.62rem', fontWeight: 700,
          bgcolor: `${statusCfg.color}20`, color: statusCfg.color,
          fontFamily: 'monospace', letterSpacing: '0.02em', flexShrink: 0, minWidth: 72,
        }} />

        <Typography variant="body2" sx={{
          flex: 1, fontWeight: 500, fontSize: '0.8rem',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} title={cs.control_title}>
          {cs.control_title}
        </Typography>

        {cs.evidence_count > 0 && (
          <Tooltip title={`${cs.evidence_count} evidence item${cs.evidence_count !== 1 ? 's' : ''}`}>
            <Badge badgeContent={cs.evidence_count} color="primary" sx={{ mr: 0.5 }}>
              <AttachFile sx={{ fontSize: 16, color: '#6c757d' }} />
            </Badge>
          </Tooltip>
        )}

        <TextField select size="small" value={cs.status}
          onClick={e => e.stopPropagation()}
          onChange={e => { e.stopPropagation(); onStatusChange(cs.id, e.target.value); }}
          disabled={readOnly || isSaving}
          sx={{ minWidth: 170, flexShrink: 0,
            '& .MuiOutlinedInput-root': { fontSize: '0.72rem', height: 30 },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: `${statusCfg.color}60` } }}>
          {STATUS_OPTIONS.map(opt => (
            <MenuItem key={opt.value} value={opt.value}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <StatusDot status={opt.value} size={8} />
                <Typography variant="caption" sx={{ fontSize: '0.72rem' }}>{opt.label}</Typography>
              </Box>
            </MenuItem>
          ))}
        </TextField>

        {isSaving && <CircularProgress size={14} sx={{ flexShrink: 0 }} />}
        <IconButton size="small" sx={{ flexShrink: 0, ml: 0.25 }}>
          {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </IconButton>
      </Box>

      {/* Expanded detail */}
      <Collapse in={isExpanded} unmountOnExit>
        <Box sx={{ px: 2.5, pb: 2, pt: 0.5 }}>
          {cs.control_statement && (
            <Box sx={{ p: 1.5, mb: 1.25, borderRadius: 1.5, bgcolor: '#f5f5f5', border: '1px solid #e8e8e8' }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" display="block"
                sx={{ mb: 0.4, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Control Statement
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.65, color: '#333' }}>
                {cs.control_statement}
              </Typography>
            </Box>
          )}

          <DiscussionPanel text={cs.control_discussion} />

          <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" display="block"
              sx={{ mb: 0.5, fontSize: '0.68rem' }}>
              Implementation Notes
            </Typography>
            <TextField value={localNotes}
              onChange={e => setLocalNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Describe how this control is implemented, reference policies, systems or procedures…"
              multiline rows={3} fullWidth size="small" disabled={readOnly}
              sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.8rem', bgcolor: 'background.paper' } }} />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            {cs.owner_name && (
              <Chip label={`Owner: ${cs.owner_name}`} size="small" variant="outlined"
                sx={{ fontSize: '0.65rem', height: 20 }} />
            )}
            {cs.due_date && (
              <Chip label={`Due: ${fmtDate(cs.due_date)}`} size="small" variant="outlined"
                sx={{ fontSize: '0.65rem', height: 20 }} />
            )}
            {cs.updated_at && (
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem', alignSelf: 'center' }}>
                Updated {fmtDateTime(cs.updated_at)}
              </Typography>
            )}
          </Box>

          {/* Evidence section */}
          <Box sx={{ mt: 1.75 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                EVIDENCE ({cs.evidence?.length ?? 0})
              </Typography>
              {!readOnly && (
                <Button size="small" startIcon={<Add />}
                  onClick={e => { e.stopPropagation(); onAddEvidence(cs.id); }}
                  sx={{ fontSize: '0.68rem', py: 0.2, px: 0.75, minWidth: 'unset' }}>
                  Add
                </Button>
              )}
            </Box>
            {(cs.evidence ?? []).length === 0 ? (
              <Typography variant="caption" color="text.disabled"
                sx={{ fontSize: '0.68rem', fontStyle: 'italic' }}>
                No evidence attached
              </Typography>
            ) : (
              (cs.evidence ?? []).map(ev => (
                <EvidenceItem key={ev.id} item={ev} onDelete={onDeleteEvidence} readOnly={readOnly} />
              ))
            )}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
});

// ─── CategoryHeader ───────────────────────────────────────────────────────────

function CategoryHeader({ label, identifier }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.9,
      bgcolor: '#f0f2f5', borderBottom: '1px solid #e0e0e0',
      position: 'sticky', top: 0, zIndex: 1 }}>
      {identifier && (
        <Typography variant="caption" fontWeight={800}
          sx={{ fontSize: '0.68rem', color: '#546e7a', fontFamily: 'monospace' }}>
          {identifier}
        </Typography>
      )}
      <Typography variant="caption" fontWeight={700}
        sx={{ fontSize: '0.75rem', color: '#37474f', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </Typography>
    </Box>
  );
}

// ─── AddEvidenceDialog ────────────────────────────────────────────────────────

function AddEvidenceDialog({ open, onClose, onSave, saving }) {
  const [form,    setForm]    = useState({ title: '', url: '', description: '' });
  const [file,    setFile]    = useState(null);
  const [err,     setErr]     = useState('');
  const fileRef = useRef(null);

  const handleSave = () => {
    if (!form.title.trim()) { setErr('Title is required.'); return; }
    if (!file && !form.url.trim()) { setErr('Attach a file or provide a URL.'); return; }
    onSave({ ...form, file });
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0] ?? null;
    if (selected) {
      const validationErr = validateEvidenceFile(selected);
      if (validationErr) {
        setErr(validationErr);
        if (fileRef.current) fileRef.current.value = '';
        return;
      }
    }
    setFile(selected);
    setErr('');
  };

  const clearFile = () => {
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  useEffect(() => {
    if (!open) {
      setForm({ title: '', url: '', description: '' });
      setFile(null);
      setErr('');
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Add Evidence</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, pt: '16px !important' }}>
        <TextField label="Title" value={form.title} required size="small" fullWidth
          onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          placeholder="e.g. Security Policy v3.0" />

        {/* File upload */}
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontSize: '0.75rem' }}>
            Upload File (optional)
          </Typography>
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button size="small" variant="outlined" startIcon={<AttachFile sx={{ fontSize: 15 }} />}
              onClick={() => fileRef.current?.click()}
              sx={{ fontSize: '0.72rem', textTransform: 'none', borderColor: '#ccc', color: 'text.secondary',
                '&:hover': { borderColor: '#1565c0', color: '#1565c0' } }}>
              Choose file
            </Button>
            {file ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, flex: 1 }}>
                <Typography variant="caption"
                  sx={{ fontSize: '0.72rem', color: '#1565c0', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {file.name}
                </Typography>
                <IconButton size="small" onClick={clearFile} sx={{ p: 0.25, flexShrink: 0 }}>
                  <Delete sx={{ fontSize: 14, color: '#aaa' }} />
                </IconButton>
              </Box>
            ) : (
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.72rem' }}>
                No file chosen
              </Typography>
            )}
          </Box>
        </Box>

        <TextField label="URL (optional)" value={form.url} size="small" fullWidth
          onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
          placeholder="https://…" />
        <TextField label="Description (optional)" value={form.description} size="small" fullWidth multiline rows={2}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          placeholder="Brief note about this evidence…" />
        {err && <Alert severity="error" sx={{ py: 0.5 }}>{err}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          sx={{ bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>
          {saving ? 'Uploading…' : 'Add Evidence'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GrcProjectDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isClient = user?.role === 'CLIENT';

  const [project,         setProject]         = useState(null);
  const [controlStatuses, setControlStatuses] = useState([]);
  const [familyStats,     setFamilyStats]     = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');

  const [selectedFamilyId,  setSelectedFamilyId]  = useState(null);
  const [searchTerm,        setSearchTerm]        = useState('');
  const [statusFilter,      setStatusFilter]      = useState('ALL');
  const [expandedControlId, setExpandedControlId] = useState(null);

  const [savingIds,        setSavingIds]        = useState(new Set());
  const [evidenceDlg,      setEvidenceDlg]      = useState(null);
  const [savingEvidence,   setSavingEvidence]   = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  const [editDlg,   setEditDlg]   = useState(false);
  const [editForm,  setEditForm]  = useState({ title: '', description: '', target_date: '' });
  const [editSaving,setEditSaving]= useState(false);
  const [editErr,   setEditErr]   = useState('');

  const canEdit = !isClient;

  const openEdit = () => {
    setEditForm({
      title:       project?.title       ?? '',
      description: project?.description ?? '',
      target_date: project?.target_date ?? '',
    });
    setEditErr('');
    setEditDlg(true);
  };

  const handleEditSave = async () => {
    if (!editForm.title.trim()) { setEditErr('Title is required.'); return; }
    setEditSaving(true);
    setEditErr('');
    try {
      const res = await api.patch(`/grc/projects/${id}/`, {
        title:       editForm.title.trim(),
        description: editForm.description.trim(),
        target_date: editForm.target_date || null,
      });
      setProject(prev => ({ ...prev, ...res.data }));
      setEditDlg(false);
    } catch (e) {
      setEditErr(e.response?.data?.error || 'Failed to update project.');
    }
    setEditSaving(false);
  };
  const [reportMenuAnchor, setReportMenuAnchor] = useState(null);
  const reportMenuOpen = Boolean(reportMenuAnchor);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pRes, csRes, fsRes] = await Promise.all([
        api.get(`/grc/projects/${id}/`),
        api.get(`/grc/projects/${id}/control_statuses/`),
        api.get(`/grc/projects/${id}/family_stats/`),
      ]);
      setProject(pRes.data);
      setControlStatuses(csRes.data.results ?? csRes.data);
      setFamilyStats(fsRes.data.results ?? fsRes.data);
    } catch {
      setError('Failed to load GRC project.');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const accentColor = useMemo(() => {
    if (!project) return '#1565c0';
    return FRAMEWORK_ACCENT[project.framework_key] ?? '#1565c0';
  }, [project]);

  const overallStats = useMemo(() => {
    const nonCat = controlStatuses.filter(cs => !cs.is_category);
    const total   = nonCat.length;
    const impl    = nonCat.filter(cs => cs.status === 'IMPLEMENTED').length;
    const pct     = total > 0 ? Math.round((impl / total) * 100) : 0;
    return { total, impl, pct };
  }, [controlStatuses]);

  const visibleControls = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    const passingNonCat = new Set(
      controlStatuses
        .filter(cs => {
          if (cs.is_category) return false;
          if (selectedFamilyId !== null && cs.family_id !== selectedFamilyId) return false;
          if (statusFilter !== 'ALL' && cs.status !== statusFilter) return false;
          if (search) {
            return cs.control_id?.toLowerCase().includes(search)
                || cs.control_title?.toLowerCase().includes(search);
          }
          return true;
        })
        .map(cs => cs.id)
    );

    if (passingNonCat.size === 0) return [];

    const parentIds = new Set(
      controlStatuses
        .filter(cs => !cs.is_category && passingNonCat.has(cs.id) && cs.parent_id)
        .map(cs => cs.parent_id)
    );

    return controlStatuses.filter(cs => {
      if (cs.is_category) return parentIds.has(cs.id);
      return passingNonCat.has(cs.id);
    });
  }, [controlStatuses, selectedFamilyId, searchTerm, statusFilter]);

  const handleToggleExpand = useCallback((csId) => {
    setExpandedControlId(prev => prev === csId ? null : csId);
  }, []);

  const handleStatusChange = useCallback(async (csId, newStatus) => {
    setControlStatuses(prev => prev.map(cs => cs.id === csId ? { ...cs, status: newStatus } : cs));
    setSavingIds(prev => new Set(prev).add(csId));
    try {
      await api.patch(`/grc/control_statuses/${csId}/`, { status: newStatus });
      const fsRes = await api.get(`/grc/projects/${id}/family_stats/`);
      setFamilyStats(fsRes.data.results ?? fsRes.data);
    } catch {
      setError('Failed to save status change.');
      fetchAll();
    } finally {
      setSavingIds(prev => { const next = new Set(prev); next.delete(csId); return next; });
    }
  }, [id, fetchAll]);

  const handleNotesSave = useCallback(async (csId, notes) => {
    setControlStatuses(prev => prev.map(cs => cs.id === csId ? { ...cs, implementation_notes: notes } : cs));
    setSavingIds(prev => new Set(prev).add(csId));
    try {
      await api.patch(`/grc/control_statuses/${csId}/`, { implementation_notes: notes });
    } catch {
      setError('Failed to save notes.');
    } finally {
      setSavingIds(prev => { const next = new Set(prev); next.delete(csId); return next; });
    }
  }, []);

  const handleAddEvidence    = useCallback((csId) => setEvidenceDlg(csId), []);

  const handleSaveEvidence = useCallback(async (form) => {
    if (!evidenceDlg) return;
    setSavingEvidence(true);
    try {
      let payload;
      if (form.file) {
        payload = new FormData();
        payload.append('title', form.title);
        payload.append('description', form.description || '');
        payload.append('url', form.url || '');
        payload.append('file', form.file);
      } else {
        payload = { title: form.title, description: form.description, url: form.url };
      }
      const res = await api.post(`/grc/control_statuses/${evidenceDlg}/add_evidence/`, payload);
      setControlStatuses(prev => prev.map(cs => {
        if (cs.id !== evidenceDlg) return cs;
        const newEvidence = [...(cs.evidence ?? []), res.data];
        return { ...cs, evidence: newEvidence, evidence_count: newEvidence.length };
      }));
      setEvidenceDlg(null);
    } catch (e) {
      setError(e.response?.data?.error ?? 'Failed to add evidence.');
    }
    setSavingEvidence(false);
  }, [evidenceDlg]);

  const handleDeleteEvidence = useCallback(async (evidenceId) => {
    try {
      await api.delete(`/grc/evidence/${evidenceId}/`);
      setControlStatuses(prev => prev.map(cs => {
        if (!(cs.evidence ?? []).some(e => e.id === evidenceId)) return cs;
        const newEvidence = cs.evidence.filter(e => e.id !== evidenceId);
        return { ...cs, evidence: newEvidence, evidence_count: newEvidence.length };
      }));
    } catch {
      setError('Failed to delete evidence.');
    }
  }, []);

  const handleGenerateReport = useCallback(async (fmt = 'html') => {
    setReportMenuAnchor(null);
    setGeneratingReport(true);
    setError('');
    try {
      if (fmt === 'docx') {
        const res = await api.get(`/grc/projects/${id}/gap_analysis_report/?output=docx`, {
          responseType: 'arraybuffer',
        });
        const blob = new Blob([res.data], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `GRC_Gap_Analysis_${project?.title?.replace(/[^a-zA-Z0-9]/g, '_') ?? 'Report'}.docx`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } else {
        const res = await api.get(`/grc/projects/${id}/gap_analysis_report/`, {
          responseType: 'text',
        });
        const blob = new Blob([res.data], { type: 'text/html' });
        const url  = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (e) {
      let msg = 'Failed to generate report.';
      const raw = e?.response?.data;
      if (raw) {
        try {
          const parsed = typeof raw === 'string' ? JSON.parse(raw)
            : raw instanceof ArrayBuffer ? JSON.parse(new TextDecoder().decode(raw))
            : raw;
          if (parsed?.error) msg = `Report error: ${parsed.error}`;
        } catch {}
      }
      setError(msg);
    }
    setGeneratingReport(false);
  }, [id, project?.title]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return <Box sx={{ textAlign: 'center', py: 10 }}><CircularProgress /></Box>;
  if (error && !project) return <Alert severity="error">{error}</Alert>;

  const statusCfg     = PROJECT_STATUS_CONFIG[project?.status] ?? { label: project?.status, color: 'default' };
  const progressColor = overallStats.pct >= 80 ? '#27ae60' : overallStats.pct >= 40 ? '#f39c12' : accentColor;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      {/* Header strip */}
      <Box sx={{ px: 2.5, py: 1.5, mb: 0, borderBottom: `3px solid ${accentColor}`,
        bgcolor: `${accentColor}08`, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <IconButton size="small" onClick={() => navigate('/grc')}
            sx={{ color: accentColor, border: `1px solid ${accentColor}40`,
              '&:hover': { bgcolor: `${accentColor}15` } }}>
            <ArrowBack fontSize="small" />
          </IconButton>

          <Typography variant="h5" fontWeight={700}
            sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project?.title}
          </Typography>

          {canEdit && (
            <Tooltip title="Edit project">
              <IconButton size="small" onClick={openEdit}
                sx={{ color: accentColor, border: `1px solid ${accentColor}40`,
                  '&:hover': { bgcolor: `${accentColor}15` } }}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          <Chip label={project?.framework_name ?? project?.framework_key} size="small"
            sx={{ bgcolor: accentColor, color: '#fff', fontWeight: 700, fontSize: '0.68rem' }} />

          <Chip label={statusCfg.label} size="small" color={statusCfg.color}
            variant="outlined" sx={{ fontWeight: 600, fontSize: '0.68rem' }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, px: 1.25, py: 0.4, borderRadius: 4,
            bgcolor: `${progressColor}15`, border: `1px solid ${progressColor}50` }}>
            {overallStats.pct === 100 && <CheckCircle sx={{ fontSize: 14, color: progressColor }} />}
            <Typography variant="caption" fontWeight={700} sx={{ color: progressColor, fontSize: '0.75rem' }}>
              {overallStats.pct}% Complete
            </Typography>
          </Box>

          {project?.target_date && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Target: {fmtDate(project.target_date)}
            </Typography>
          )}

          <ButtonGroup size="small" variant="outlined" disabled={generatingReport || loading}
            sx={{ borderColor: accentColor }}>
            <Button
              startIcon={generatingReport
                ? <CircularProgress size={13} sx={{ color: accentColor }} />
                : <ReportIcon sx={{ fontSize: 15 }} />}
              onClick={() => handleGenerateReport('html')}
              sx={{
                fontSize: '0.72rem', textTransform: 'none',
                borderColor: accentColor, color: accentColor,
                '&:hover': { bgcolor: `${accentColor}12`, borderColor: accentColor },
              }}
            >
              {generatingReport ? 'Generating…' : 'Gap Analysis'}
            </Button>
            <Button
              size="small"
              onClick={e => setReportMenuAnchor(e.currentTarget)}
              sx={{
                px: 0.5, minWidth: 28,
                borderColor: accentColor, color: accentColor,
                '&:hover': { bgcolor: `${accentColor}12`, borderColor: accentColor },
              }}
            >
              <ArrowDropDown sx={{ fontSize: 18 }} />
            </Button>
          </ButtonGroup>

          <Menu
            anchorEl={reportMenuAnchor}
            open={reportMenuOpen}
            onClose={() => setReportMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{ sx: { minWidth: 180, mt: 0.5 } }}
          >
            <MenuItem onClick={() => handleGenerateReport('html')} sx={{ fontSize: '0.82rem', gap: 1 }}>
              <ReportIcon sx={{ fontSize: 16, color: accentColor }} />
              Open as HTML
            </MenuItem>
            <MenuItem onClick={() => handleGenerateReport('docx')} sx={{ fontSize: '0.82rem', gap: 1 }}>
              <ReportIcon sx={{ fontSize: 16, color: '#2e7d32' }} />
              Download as Word (.docx)
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mx: 2, mt: 1 }}>{error}</Alert>}

      {/* Split panel body */}
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* LEFT PANEL */}
        <Box sx={{ width: 280, flexShrink: 0, borderRight: '1px solid #e0e0e0',
          display: 'flex', flexDirection: 'column', bgcolor: '#fafbfc' }}>
          <Box sx={{ px: 1.5, pt: 1.5, pb: 0.5, flexShrink: 0 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary"
              sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Control Families
            </Typography>
          </Box>

          <Box sx={{ overflowY: 'auto', flex: 1, px: 1, pb: 1 }}>
            {/* All Controls synthetic row */}
            <FamilyRow
              family={{ name: 'All Controls', identifier: null,
                implemented: overallStats.impl, total: overallStats.total, pct: overallStats.pct }}
              isSelected={selectedFamilyId === null}
              accentColor={accentColor}
              onClick={() => setSelectedFamilyId(null)}
            />

            <Divider sx={{ my: 0.75 }} />

            {familyStats.map(fam => (
              <FamilyRow key={fam.id} family={fam}
                isSelected={selectedFamilyId === fam.id}
                accentColor={accentColor}
                onClick={() => setSelectedFamilyId(fam.id)}
              />
            ))}
          </Box>
        </Box>

        {/* RIGHT PANEL */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Completion stats banner */}
          <Box sx={{ px: 2.5, pt: 1.75, pb: 1.25, flexShrink: 0, borderBottom: '1px solid #f0f0f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.75 }}>
              <Typography sx={{ fontSize: '1.7rem', fontWeight: 800, color: progressColor, lineHeight: 1 }}>
                {overallStats.impl}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                of {overallStats.total} controls implemented
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <LinearProgress variant="determinate" value={overallStats.pct}
                sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: '#e8eaf6',
                  '& .MuiLinearProgress-bar': { bgcolor: progressColor, borderRadius: 4 } }} />
              <Typography variant="body2" fontWeight={700} sx={{ color: progressColor, minWidth: 36 }}>
                {overallStats.pct}%
              </Typography>
            </Box>
          </Box>

          {/* Search + filters */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25,
            flexShrink: 0, borderBottom: '1px solid #f0f0f0', bgcolor: '#fafbfc' }}>
            <TextField size="small" placeholder="Search controls…" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              InputProps={{ startAdornment: <Search sx={{ fontSize: 18, color: '#aaa', mr: 0.5 }} /> }}
              sx={{ flex: 1, maxWidth: 340, '& .MuiOutlinedInput-root': { fontSize: '0.82rem' } }} />
            <TextField select size="small" value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { fontSize: '0.8rem' } }}>
              {STATUS_FILTER_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {opt.value !== 'ALL' && <StatusDot status={opt.value} size={8} />}
                    <Typography variant="caption" sx={{ fontSize: '0.78rem' }}>{opt.label}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, fontSize: '0.68rem' }}>
              {visibleControls.filter(c => !c.is_category).length} controls
            </Typography>
          </Box>

          {/* Control list */}
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {visibleControls.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                <Typography variant="body2">No controls match the current filters.</Typography>
              </Box>
            ) : (
              <Paper variant="outlined" sx={{ m: 1.5, overflow: 'hidden' }}>
                {visibleControls.map(cs => {
                  if (cs.is_category) {
                    return <CategoryHeader key={cs.id} identifier={cs.control_id} label={cs.control_title} />;
                  }
                  return (
                    <ControlRow
                      key={cs.id}
                      cs={cs}
                      isExpanded={expandedControlId === cs.id}
                      onToggle={handleToggleExpand}
                      onStatusChange={handleStatusChange}
                      onNotesSave={handleNotesSave}
                      onAddEvidence={handleAddEvidence}
                      onDeleteEvidence={handleDeleteEvidence}
                      isSaving={savingIds.has(cs.id)}
                      readOnly={isClient}
                    />
                  );
                })}
              </Paper>
            )}
          </Box>
        </Box>
      </Box>

      <AddEvidenceDialog
        open={!!evidenceDlg}
        onClose={() => setEvidenceDlg(null)}
        onSave={handleSaveEvidence}
        saving={savingEvidence}
      />

      {/* Edit Project Dialog */}
      <Dialog open={editDlg} onClose={() => setEditDlg(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1, borderBottom: `3px solid ${accentColor}` }}>Edit Project</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '20px !important' }}>
          <TextField
            label="Project Title" value={editForm.title} required fullWidth size="small"
            onChange={(e) => setEditForm(p => ({ ...p, title: e.target.value }))}
          />
          <TextField
            label="Description (optional)" value={editForm.description} fullWidth size="small" multiline rows={2}
            onChange={(e) => setEditForm(p => ({ ...p, description: e.target.value }))}
          />
          <TextField
            label="Target Completion Date (optional)" value={editForm.target_date} type="date"
            fullWidth size="small" InputLabelProps={{ shrink: true }}
            onChange={(e) => setEditForm(p => ({ ...p, target_date: e.target.value }))}
          />
          {editErr && <Alert severity="error">{editErr}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDlg(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={editSaving}
            sx={{ bgcolor: accentColor, '&:hover': { filter: 'brightness(0.9)' } }}>
            {editSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
