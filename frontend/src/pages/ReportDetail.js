import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, Chip,
  CircularProgress, Alert, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, InputLabel, FormControl, MenuItem,
  Divider, Tooltip, InputAdornment, Checkbox, Menu, ListItemText, LinearProgress,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper,
  Drawer, Stack, Badge, FormControlLabel, Switch, ClickAwayListener,
} from '@mui/material';
import {
  Add, ArrowBack, FolderOpen, Delete, Edit,
  Article, Search, LibraryAdd, Create,
  Visibility, Close, ViewColumn, Chat, Send, AttachFile, Download, Lock,
  Description, AccountTree, MoreVert,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { useAuthStore } from '../store/authStore';
import Quill from 'quill';
import 'react-quill/dist/quill.snow.css';
import api from '../utils/api';
import AttackChain from './AttackChain';
import { usePageBreadcrumbs } from '../components/MainLayout';

// ── Quill toolbar + reusable QuillField (same config as FindingEditor) ────────
const TOOLBAR_OPTIONS = [
  [{ font: [] }, { size: ['small', false, 'large', 'huge'] }],
  ['bold', 'italic', 'underline', 'strike', { color: [] }, { background: [] }],
  [{ header: [1, 2, 3, 4, false] }, { align: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
  ['blockquote', 'code-block', 'link', 'image'],
  [{ script: 'sub' }, { script: 'super' }, 'clean'],
];

const QuillField = memo(({ label, helperText, initialValue, onMount }) => {
  const theme = useTheme();
  const wrapperRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const container = document.createElement('div');
    wrapper.appendChild(container);
    const quill = new Quill(container, {
      theme: 'snow',
      modules: { toolbar: TOOLBAR_OPTIONS },
    });
    if (initialValue) quill.clipboard.dangerouslyPasteHTML(initialValue);
    onMount(quill);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box>
      {label && (
        <Typography variant="overline"
          sx={{ fontWeight: 700, color: theme.palette.primary.main, letterSpacing: 1, display: 'block', mb: 0.5 }}>
          {label}
        </Typography>
      )}
      <Box ref={wrapperRef} sx={{
        '& .ql-toolbar': {
          borderRadius: '6px 6px 0 0',
          borderColor: 'rgba(0,0,0,0.2)',
          backgroundColor: '#f8f8f8',
          padding: '4px 8px',
          lineHeight: 1,
          '& .ql-formats': { marginRight: '8px' },
          '& button': { width: 24, height: 24, padding: '2px' },
          '& .ql-picker': { height: 24 },
          '& .ql-picker-label': { padding: '0 4px', fontSize: '12px' },
          '& .ql-size .ql-picker-label, & .ql-font .ql-picker-label': { width: 82 },
          '& svg': { width: 14, height: 14 },
        },
        '& .ql-container': {
          borderRadius: '0 0 6px 6px',
          borderColor: 'rgba(0,0,0,0.2)',
          fontSize: '14px',
        },
        '& .ql-editor': {
          minHeight: 160,
          lineHeight: 1.7,
          padding: '10px 14px',
          resize: 'vertical',
          overflow: 'auto',
        },
        '&:focus-within .ql-toolbar, &:focus-within .ql-container': {
          borderColor: theme.palette.primary.main,
        },
      }} />
      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
});

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];
const STATUSES = ['DRAFT', 'OPEN', 'IN_REVIEW', 'PUBLISHED', 'REMEDIATED', 'FALSE_POSITIVE', 'ACCEPTED_RISK'];
const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'WEB', label: 'Web Application' },
  { value: 'MOBILE', label: 'Mobile Application' },
  { value: 'NETWORK', label: 'Network Infrastructure' },
  { value: 'API', label: 'API' },
  { value: 'CLOUD', label: 'Cloud Infrastructure' },
  { value: 'AUTH', label: 'Authentication' },
  { value: 'INPUT', label: 'Input Validation' },
  { value: 'ACCESS', label: 'Access Control' },
  { value: 'CONFIG', label: 'Misconfiguration' },
  { value: 'OTHER', label: 'Other' },
];

const PENTEST_TYPES = [
  { value: 'WEB_APP',    label: 'Web Application',    color: '#1565c0' },
  { value: 'INTERNAL',   label: 'Internal Network',   color: '#6a1b9a' },
  { value: 'EXTERNAL',   label: 'External Network',   color: '#00796b' },
  { value: 'MOBILE',     label: 'Mobile Application', color: '#e65100' },
  { value: 'API',        label: 'API Testing',        color: '#558b2f' },
  { value: 'CLOUD',      label: 'Cloud Infrastructure',color: '#0277bd' },
  { value: 'SOCIAL_ENG', label: 'Social Engineering', color: '#ad1457' },
  { value: 'PHYSICAL',   label: 'Physical Security',  color: '#4e342e' },
  { value: 'RED_TEAM',   label: 'Red Team',           color: '#b71c1c' },
  { value: 'WIRELESS',   label: 'Wireless',           color: '#283593' },
  { value: 'OTHER',      label: 'Other',              color: '#546e7a' },
];
const getPentestType = (val) => PENTEST_TYPES.find(t => t.value === val);

// Short prefix codes for finding numbering (e.g. WEB-01, INT-02)
const TYPE_PREFIXES = {
  WEB_APP:    'WEB',
  INTERNAL:   'INT',
  EXTERNAL:   'EXT',
  MOBILE:     'MOB',
  API:        'API',
  CLOUD:      'CLD',
  SOCIAL_ENG: 'SOC',
  PHYSICAL:   'PHY',
  RED_TEAM:   'RED',
  WIRELESS:   'WLS',
  OTHER:      'OTH',
  __untagged__: 'FIN',
};

const inferPentestTypeFromTemplate = (template = {}) => {
  const folder = (template.folder_name || '').toLowerCase();
  const category = template.category || '';

  if (folder.includes('web application')) return 'WEB_APP';
  if (folder.includes('active directory') || folder === 'network') return 'INTERNAL';
  if (folder.includes('api')) return 'API';
  if (folder.includes('cloud')) return 'CLOUD';
  if (folder.includes('wireless')) return 'WIRELESS';
  if (folder.includes('physical')) return 'PHYSICAL';
  if (folder.includes('social')) return 'SOCIAL_ENG';
  if (folder.includes('authentication') || folder.includes('session')) return 'WEB_APP';

  const categoryMap = {
    WEB: 'WEB_APP',
    INPUT: 'WEB_APP',
    ACCESS: 'WEB_APP',
    SESSION: 'WEB_APP',
    AUTH: 'WEB_APP',
    API: 'API',
    NETWORK: 'INTERNAL',
    CLOUD: 'CLOUD',
    MOBILE: 'MOBILE',
    WIRELESS: 'WIRELESS',
    PHYSICAL: 'PHYSICAL',
    SOCIAL: 'SOCIAL_ENG',
  };

  return categoryMap[category] || 'OTHER';
};

const TOGGLEABLE_COLS = [
  { key: 'affected_asset', label: 'Affected Asset' },
  { key: 'severity',       label: 'Severity' },
  { key: 'cvss',           label: 'CVSS' },
  { key: 'impact',         label: 'Impact' },
  { key: 'likelihood',     label: 'Likelihood' },
  { key: 'status',         label: 'Status' },
];

const SEV_COLORS = {
  CRITICAL:      { bg: '#fde8e8', text: '#c0392b', border: '#f5a5a5' },
  HIGH:          { bg: '#fef3e2', text: '#e67e22', border: '#fcd59a' },
  MEDIUM:        { bg: '#fefbe6', text: '#f39c12', border: '#fde99a' },
  LOW:           { bg: '#e8f8e8', text: '#27ae60', border: '#a3d9a5' },
  INFORMATIONAL: { bg: '#e8f0fe', text: '#2980b9', border: '#90b8f8' },
};

const STATUS_COLORS = {
  DRAFT:          { bg: '#f5f5f5', text: '#616161' },
  OPEN:           { bg: '#e3f2fd', text: '#1976d2' },
  IN_REVIEW:      { bg: '#fff3e0', text: '#f57f17' },
  PUBLISHED:      { bg: '#e8f5e9', text: '#2e7d32' },
  REMEDIATED:     { bg: '#e0f2f1', text: '#00796b' },
  FALSE_POSITIVE: { bg: '#fafafa', text: '#9e9e9e' },
  ACCEPTED_RISK:  { bg: '#fce4ec', text: '#c2185b' },
};

const emptyFinding = {
  title: '', severity: 'HIGH', status: 'DRAFT',
  description: '', details: '', impact: '',
  likelihood: '', recommendations: '', supporting_evidence: '',
  cvss_score: '', cwe_id: '', cve_id: '', references: '',
};

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const { user: currentUser } = useAuthStore();
  const isClient = currentUser?.role === 'CLIENT';

  const [report, setReport] = useState(null);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Table toolbar
  const [searchText, setSearchText]     = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [colMenuAnchor, setColMenuAnchor] = useState(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatus, setBulkStatus]   = useState('');
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [findingMenuAnchor, setFindingMenuAnchor] = useState(null);
  const [findingMenuItem, setFindingMenuItem] = useState(null);
  const [jiraSendingId, setJiraSendingId] = useState(null);

  const toggleSelect = (e, id) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (ids) => {
    setSelectedIds(prev => prev.size === ids.length && ids.every(id => prev.has(id)) ? new Set() : new Set(ids));
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      await Promise.all([...selectedIds].map(fid => api.patch(`/findings/${fid}/`, { status: bulkStatus })));
      enqueueSnackbar(`${selectedIds.size} finding${selectedIds.size !== 1 ? 's' : ''} updated to ${bulkStatus.replace(/_/g, ' ')}`, { variant: 'success' });
      setSelectedIds(new Set());
      setBulkStatus('');
      refreshFindings();
    } catch {
      enqueueSnackbar('Failed to update findings', { variant: 'error' });
    } finally {
      setBulkUpdating(false);
    }
  };
  const [visibleCols, setVisibleCols] = useState({
    affected_asset: true, severity: true, cvss: true,
    impact: true, likelihood: true, status: true,
  });

  // Column resize
  const colWidths = useRef({ title: 260, affected_asset: 190, severity: 110, cvss: 72, impact: 100, likelihood: 110, status: 110, actions: 150 });
  const resizingCol = useRef(null);
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(0);
  const [, bumpResize] = useState(0);

  useEffect(() => {
    const onMove = (e) => {
      if (!resizingCol.current) return;
      const diff = e.clientX - resizeStartX.current;
      colWidths.current[resizingCol.current] = Math.max(60, resizeStartW.current + diff);
      bumpResize(n => n + 1);
    };
    const onUp = () => { resizingCol.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);

  // Preview drawer
  const [previewFinding, setPreviewFinding] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const openPreview = async (finding) => {
    setPreviewFinding(finding); // show drawer immediately with what we have
    setPreviewLoading(true);
    try {
      const res = await api.get(`/findings/${finding.id}/`);
      setPreviewFinding(res.data);
    } catch {
      // keep the partial data already set
    } finally {
      setPreviewLoading(false);
    }
  };

  // Add finding flow
  const [addDialog, setAddDialog] = useState(false);           // choice dialog
  const [customDialog, setCustomDialog] = useState(false);     // custom finding form
  const [repoDialog, setRepoDialog] = useState(false);         // repository picker

  // Custom finding form
  const [editFinding, setEditFinding] = useState(null);
  const [findingForm, setFindingForm] = useState(emptyFinding);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Client portal / collaboration
  const [portalOpen, setPortalOpen]         = useState(false);
  const [messages, setMessages]             = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage]         = useState('');
  const [attachment, setAttachment]         = useState(null);
  const [isInternal, setIsInternal]         = useState(false);
  const [sending, setSending]               = useState(false);
  const fileInputRef                        = useRef(null);
  const messagesEndRef                      = useRef(null);
  const mentionInputRef                     = useRef(null);
  const mentionAnchorRef                    = useRef(null);
  const [mentionOpen, setMentionOpen]       = useState(false);
  const [mentionQuery, setMentionQuery]     = useState('');

  // Compute stable finding numbers from ALL findings, grouped and severity-sorted
  const findingNumbers = useMemo(() => {
    const grouped = {};
    findings.forEach(f => {
      const key = f.pentest_type || '__untagged__';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(f);
    });
    const numbers = {};
    Object.entries(grouped).forEach(([key, group]) => {
      const prefix = TYPE_PREFIXES[key] || 'FIN';
      const sorted = [...group].sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity));
      sorted.forEach((f, i) => {
        numbers[f.id] = `${prefix}-${String(i + 1).padStart(2, '0')}`;
      });
    });
    return numbers;
  }, [findings]);

  // Reverse map: code → finding (for rendering mentions in messages)
  const numberToFinding = useMemo(() => {
    const map = {};
    Object.entries(findingNumbers).forEach(([fid, code]) => {
      map[code] = findings.find(f => String(f.id) === String(fid));
    });
    return map;
  }, [findingNumbers, findings]);

  // Findings filtered by mention query
  const mentionSuggestions = useMemo(() => {
    const q = mentionQuery.toLowerCase();
    return findings.filter(f => {
      const code = (findingNumbers[f.id] || '').toLowerCase();
      return code.includes(q) || (f.title || '').toLowerCase().includes(q);
    }).slice(0, 8);
  }, [mentionQuery, findings, findingNumbers]);

  // Render message content: turns @CODE tokens into clickable chips
  const renderMessageContent = (content, isOwnNonInternal) => {
    if (!content) return null;
    const parts = content.split(/(@[A-Z]+-\d+)/g);
    return parts.map((part, i) => {
      const match = part.match(/^@([A-Z]+-\d+)$/);
      if (match) {
        const code = match[1];
        const f = numberToFinding[code];
        return (
          <Chip
            key={i}
            label={`@${code}`}
            size="small"
            onClick={f ? () => { setPortalOpen(false); setTimeout(() => openPreview(f), 50); } : undefined}
            title={f ? f.title : code}
            sx={{
              mx: 0.25, height: 20, fontSize: '0.72rem',
              backgroundColor: isOwnNonInternal ? 'rgba(255,255,255,0.25)' : '#e3f2fd',
              color: isOwnNonInternal ? '#fff' : '#1565c0',
              cursor: f ? 'pointer' : 'default',
              border: isOwnNonInternal ? '1px solid rgba(255,255,255,0.4)' : '1px solid #90caf9',
              '& .MuiChip-label': { px: 0.75 },
              verticalAlign: 'middle',
            }}
          />
        );
      }
      return part ? <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span> : null;
    });
  };

  const handleMessageChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    const cursor = e.target.selectionStart;
    const textBefore = value.slice(0, cursor);
    const mentionMatch = textBefore.match(/@(\w*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
      setMentionQuery('');
    }
  };

  const handleSelectMention = (finding) => {
    const input = mentionInputRef.current;
    if (!input) return;
    const cursor = input.selectionStart;
    const textBefore = newMessage.slice(0, cursor);
    const mentionMatch = textBefore.match(/@(\w*)$/);
    if (mentionMatch) {
      const code = findingNumbers[finding.id] || finding.id;
      const before = newMessage.slice(0, cursor - mentionMatch[0].length);
      const after = newMessage.slice(cursor);
      setNewMessage(`${before}@${code} ${after}`);
    }
    setMentionOpen(false);
    setMentionQuery('');
    setTimeout(() => input.focus(), 0);
  };

  const fetchMessages = useCallback(async () => {
    if (!report) return;
    try {
      const res = await api.get(`/reports/messages/?report=${id}`);
      setMessages(res.data.results || res.data);
    } catch { /* silent */ }
  }, [report, id]);

  useEffect(() => {
    if (!portalOpen) return;
    setMessagesLoading(true);
    fetchMessages().finally(() => setMessagesLoading(false));
    // Poll every 30 s while drawer is open
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [portalOpen, fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (portalOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, portalOpen]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !attachment) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('report', id);
      formData.append('content', newMessage.trim());
      formData.append('is_internal', isInternal);
      if (attachment) formData.append('attachment', attachment);
      await api.post('/reports/messages/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setNewMessage('');
      setAttachment(null);
      setIsInternal(false);
      await fetchMessages();
    } catch {
      enqueueSnackbar('Failed to send message', { variant: 'error' });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      await api.delete(`/reports/messages/${msgId}/`);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch {
      enqueueSnackbar('Failed to delete message', { variant: 'error' });
    }
  };

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Narrative / report content tab
  const [narrativeInitial, setNarrativeInitial]       = useState(null);
  const [narrativeSaveStatus, setNarrativeSaveStatus] = useState('idle'); // 'idle'|'pending'|'saving'|'saved'|'error'
  const execSummaryRef         = useRef(null);
  const methodologyRef         = useRef(null);
  const conclusionRef          = useRef(null);
  const clientNotesRef         = useRef(null);
  const narrativeAutoSaveCb    = useRef(null);   // always points at latest scheduleNarrativeSave
  const narrativeAutoSaveTimer = useRef(null);
  const narrativeHasInteracted = useRef(false);
  const narrativeSavedTimer    = useRef(null);

  const getNarrativeHTML = (ref) => {
    const html = ref.current?.root.innerHTML || '';
    return html === '<p><br></p>' ? '' : html;
  };

  const performNarrativeSave = useCallback(async () => {
    setNarrativeSaveStatus('saving');
    try {
      await api.patch(`/reports/${id}/`, {
        executive_summary: getNarrativeHTML(execSummaryRef),
        methodology:       getNarrativeHTML(methodologyRef),
        conclusion:        getNarrativeHTML(conclusionRef),
        client_notes:      getNarrativeHTML(clientNotesRef),
      });
      setNarrativeSaveStatus('saved');
      if (narrativeSavedTimer.current) clearTimeout(narrativeSavedTimer.current);
      narrativeSavedTimer.current = setTimeout(() => setNarrativeSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Narrative save failed:', err.response?.data || err.message);
      setNarrativeSaveStatus('error');
      enqueueSnackbar('Failed to save report content', { variant: 'error' });
    }
  }, [id, enqueueSnackbar]); // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleNarrativeSave = useCallback(() => {
    if (!narrativeHasInteracted.current) return;
    setNarrativeSaveStatus('pending');
    if (narrativeAutoSaveTimer.current) clearTimeout(narrativeAutoSaveTimer.current);
    narrativeAutoSaveTimer.current = setTimeout(() => performNarrativeSave(), 1500);
  }, [performNarrativeSave]);

  // Keep ref in sync so Quill text-change listeners always call the latest version
  narrativeAutoSaveCb.current = scheduleNarrativeSave;

  // Mark interaction-ready after narrative data loads (mirrors FindingEditor pattern)
  useEffect(() => {
    if (!narrativeInitial) return;
    narrativeHasInteracted.current = false;
    const t = setTimeout(() => { narrativeHasInteracted.current = true; }, 500);
    return () => clearTimeout(t);
  }, [narrativeInitial]);

  // Repository picker state
  const [repoTemplates, setRepoTemplates] = useState([]);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [repoCategory, setRepoCategory] = useState('');
  const [repoSeverity, setRepoSeverity] = useState('');
  const [repoFolder, setRepoFolder] = useState('');
  const [repoFolders, setRepoFolders] = useState([]);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [addingFromRepo, setAddingFromRepo] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const reportRes = await api.get(`/reports/${id}/`);
      setReport(reportRes.data);
      setNarrativeInitial({
        executive_summary: reportRes.data.executive_summary || '',
        methodology:       reportRes.data.methodology       || '',
        conclusion:        reportRes.data.conclusion        || '',
        client_notes:      reportRes.data.client_notes      || '',
      });
      const findingsRes = await api.get(`/findings/?engagement=${reportRes.data.engagement}`);
      setFindings(findingsRes.data.results || findingsRes.data);
    } catch {
      setError('Failed to load report.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Lightweight refresh — updates findings list without triggering full-page loading spinner
  const refreshFindings = useCallback(async () => {
    if (!report) return;
    try {
      const res = await api.get(`/findings/?engagement=${report.engagement}`);
      setFindings(res.data.results || res.data);
    } catch { /* silent — snackbar already shown by caller */ }
  }, [report]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const breadcrumbs = useMemo(() => {
    if (!report) return [];
    return [
      ...(!isClient ? [{ label: 'Organizations', to: '/organizations' }] : []),
      { label: report.engagement_name || 'Engagement', to: `/engagements/${report.engagement}` },
      { label: report.title },
    ];
  }, [report, isClient]);
  usePageBreadcrumbs(breadcrumbs);

  // Fetch repo templates when repo dialog opens
  useEffect(() => {
    if (!repoDialog) return;
    const fetchTemplates = async () => {
      setRepoLoading(true);
      try {
        let url = '/repository/templates/?';
        if (repoCategory) url += `category=${repoCategory}&`;
        if (repoSeverity) url += `default_severity=${repoSeverity}&`;
        const [tmplRes, folderRes] = await Promise.all([
          api.get(url),
          api.get('/repository/folders/'),
        ]);
        setRepoTemplates(tmplRes.data.results || tmplRes.data);
        setRepoFolders(folderRes.data.results || folderRes.data);
      } catch {
        enqueueSnackbar('Failed to load repository', { variant: 'error' });
      } finally {
        setRepoLoading(false);
      }
    };
    fetchTemplates();
  }, [repoDialog, repoCategory, repoSeverity]);

  const filteredTemplates = repoTemplates.filter(t => {
    const matchesSearch = !repoSearch || t.title.toLowerCase().includes(repoSearch.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(repoSearch.toLowerCase());
    const matchesFolder = !repoFolder || (repoFolder === '__none__' ? !t.folder : String(t.folder) === String(repoFolder));
    return matchesSearch && matchesFolder;
  });

  const toggleTemplate = (tId) => {
    setSelectedTemplates(prev =>
      prev.includes(tId) ? prev.filter(x => x !== tId) : [...prev, tId]
    );
  };

  const handleAddFromRepo = async () => {
    if (selectedTemplates.length === 0) {
      enqueueSnackbar('Select at least one finding', { variant: 'error' });
      return;
    }
    setAddingFromRepo(true);
    try {
      const selected = repoTemplates.filter(t => selectedTemplates.includes(t.id));
      await Promise.all(selected.map(t =>
        api.post('/findings/', {
          engagement: report.engagement,
          title: t.title,
          severity: t.default_severity,
          status: 'DRAFT',
          pentest_type: inferPentestTypeFromTemplate(t),
          description: t.description || '',
          details: t.details || '',
          impact: t.impact || '',
          likelihood: t.likelihood || '',
          recommendations: t.recommendations || '',
          supporting_evidence: t.supporting_evidence || '',
          references: t.references || '',
          cwe_id: t.cwe_id || '',
          cvss_vector: t.cvss_vector || '',
        })
      ));
      enqueueSnackbar(`${selected.length} finding(s) added from repository`, { variant: 'success' });
      setRepoDialog(false);
      setSelectedTemplates([]);
      fetchAll();
    } catch {
      enqueueSnackbar('Failed to add findings from repository', { variant: 'error' });
    } finally {
      setAddingFromRepo(false);
    }
  };

  const openCustomForm = (finding = null) => {
    setEditFinding(finding);
    setFindingForm(finding ? {
      title: finding.title || '', severity: finding.severity || 'HIGH', status: finding.status || 'DRAFT',
      description: finding.description || '', details: finding.details || '', impact: finding.impact || '',
      likelihood: finding.likelihood || '', recommendations: finding.recommendations || '',
      supporting_evidence: finding.supporting_evidence || '', cvss_score: finding.cvss_score || '',
      cwe_id: finding.cwe_id || '', cve_id: finding.cve_id || '', references: finding.references || '',
    } : emptyFinding);
    setCustomDialog(true);
  };

  const handleFindingSubmit = async () => {
    if (!findingForm.title.trim()) {
      enqueueSnackbar('Title is required', { variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      if (editFinding) {
        await api.patch(`/findings/${editFinding.id}/`, findingForm);
        enqueueSnackbar('Finding updated', { variant: 'success' });
      } else {
        await api.post('/findings/', { ...findingForm, engagement: report.engagement });
        enqueueSnackbar('Finding added', { variant: 'success' });
      }
      setCustomDialog(false);
      fetchAll();
    } catch (err) {
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Failed to save finding';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFinding = async (finding) => {
    try {
      await api.delete(`/findings/${finding.id}/`);
      enqueueSnackbar('Finding deleted', { variant: 'success' });
      setDeleteConfirm(null);
      fetchAll();
    } catch {
      enqueueSnackbar('Failed to delete finding', { variant: 'error' });
    }
  };

  const openFindingMenu = (event, finding) => {
    event.stopPropagation();
    setFindingMenuAnchor(event.currentTarget);
    setFindingMenuItem(finding);
  };

  const closeFindingMenu = () => {
    setFindingMenuAnchor(null);
    setFindingMenuItem(null);
  };

  const handleSendFindingToJira = async (finding) => {
    if (!finding) return;
    setJiraSendingId(finding.id);
    try {
      const res = await api.post('/integrations/jira/sync-finding/', { finding_id: finding.id });
      const key = res.data?.issue_key || 'Jira issue';
      enqueueSnackbar(`${finding.title} sent to Jira as ${key}`, { variant: 'success' });
      refreshFindings();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to send finding to Jira', { variant: 'error' });
    } finally {
      setJiraSendingId(null);
      closeFindingMenu();
    }
  };

  const _downloadBlob = async (resp, fallbackName) => {
    const url = window.URL.createObjectURL(new Blob([resp.data]));
    const link = document.createElement('a');
    link.href = url;
    const cd = resp.headers['content-disposition'] || '';
    const match = cd.match(/filename="?([^"]+)"?/);
    link.download = match ? match[1] : fallbackName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  // DOCX generation with template picker
  const [docxDialogOpen, setDocxDialogOpen]           = useState(false);
  const [docxTemplates, setDocxTemplates]             = useState([]);
  const [docxTemplatesLoading, setDocxTemplatesLoading] = useState(false);
  const [docxTemplateId, setDocxTemplateId]           = useState('');
  const [docxGenerating, setDocxGenerating]           = useState(false);

  const openDocxDialog = async () => {
    setDocxDialogOpen(true);
    setDocxTemplateId('');
    setDocxTemplatesLoading(true);
    try {
      const res = await api.get('/reports/templates/');
      const templates = (res.data?.results ?? res.data) || [];
      setDocxTemplates(templates);
      // Pre-select the report's linked template if present
      if (report?.template) {
        const linked = templates.find(t => t.id === report.template);
        if (linked) setDocxTemplateId(String(linked.id));
      }
    } catch {
      enqueueSnackbar('Could not load templates', { variant: 'warning' });
    } finally {
      setDocxTemplatesLoading(false);
    }
  };

  const handleGenerateDocx = async () => {
    if (!docxTemplateId) {
      enqueueSnackbar('Select a DOCX report template before generating.', { variant: 'error' });
      return;
    }
    setDocxGenerating(true);
    enqueueSnackbar('Generating DOCX — this may take a few seconds…', { variant: 'info', key: 'docx-gen' });
    try {
      const body = { format: 'DOCX', template_id: parseInt(docxTemplateId, 10) };
      const resp = await api.post(`/reports/${id}/export/`, body, { responseType: 'blob', timeout: 120000 });
      await _downloadBlob(resp, `report_${id}.docx`);
      enqueueSnackbar('DOCX downloaded', { variant: 'success', key: 'docx-gen' });
      setDocxDialogOpen(false);
    } catch (err) {
      let msg = 'DOCX generation failed';
      const blob = err?.response?.data;
      if (blob instanceof Blob) {
        try { const text = await blob.text(); const parsed = JSON.parse(text); if (parsed?.error) msg = parsed.error; } catch {}
      } else if (err?.response?.data?.error) {
        msg = err.response.data.error;
      }
      enqueueSnackbar(msg, { variant: 'error', key: 'docx-gen' });
    } finally {
      setDocxGenerating(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error || !report) return <Alert severity="error">{error || 'Report not found'}</Alert>;

  const sevCounts = SEVERITIES.reduce((acc, s) => ({ ...acc, [s]: findings.filter(f => f.severity === s).length }), {});

  // Preview drawer computed values (safe to use even when previewFinding is null)
  const prevSev = previewFinding ? (SEV_COLORS[previewFinding.severity] || SEV_COLORS.INFORMATIONAL) : SEV_COLORS.INFORMATIONAL;
  const prevCvss = previewFinding ? parseFloat(previewFinding.cvss_score) : null;
  const prevCvssColor = !prevCvss ? '#616161' : prevCvss >= 9 ? '#c62828' : prevCvss >= 7 ? '#e65100' : prevCvss >= 4 ? '#f57f17' : '#2e7d32';
  const prevCvssBg    = !prevCvss ? '#f5f5f5' : prevCvss >= 9 ? '#ffebee' : prevCvss >= 7 ? '#fff3e0' : prevCvss >= 4 ? '#fff8e1' : '#e8f5e9';
  const prevCvssBorder= !prevCvss ? '#e0e0e0' : prevCvss >= 9 ? '#ef9a9a' : prevCvss >= 7 ? '#ffcc80' : prevCvss >= 4 ? '#ffe082' : '#a5d6a7';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(`/engagements/${report.engagement}`)} size="small">
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight={700}>{report.title}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <Chip label={`v${report.version}`} size="small" variant="outlined" />
              <Chip label={report.is_draft ? 'Draft' : 'Published'} size="small"
                color={report.is_draft ? 'default' : 'success'} />
              {report.engagement_name && <Chip label={report.engagement_name} size="small" variant="outlined" />}
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {!isClient && (
            <Tooltip title="Generate a Word document report using your template">
              <Button variant="contained" startIcon={<Article />} size="small" onClick={openDocxDialog}
                sx={{ bgcolor: '#24483E', color: '#fff', fontWeight: 700, '&:hover': { bgcolor: '#1a3329' } }}>
                Generate DOCX
              </Button>
            </Tooltip>
          )}
          {isClient ? (
            <Button variant="outlined" startIcon={<Chat />} size="small"
              onClick={() => setPortalOpen(true)}
              sx={{ borderColor: theme.palette.primary.main, color: theme.palette.primary.main }}>
              Messages & Remediation
            </Button>
          ) : (
            <>
              <Tooltip title="Client Portal">
                <Button variant="outlined"
                  startIcon={<Badge badgeContent={messages.length || null} color="error" max={99}><Chat /></Badge>}
                  size="small" onClick={() => setPortalOpen(true)}
                  sx={{ borderColor: theme.palette.primary.main, color: theme.palette.primary.main }}>
                  Portal
                </Button>
              </Tooltip>
              <Button variant="contained" startIcon={<Add />} onClick={() => setAddDialog(true)}
                sx={{ backgroundColor: theme.palette.primary.main }}>
                Add Finding
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Severity summary */}
      {findings.length > 0 && (() => {
        const remediatedCount = findings.filter(f => f.status === 'REMEDIATED').length;
        const activeCount = findings.length - remediatedCount;
        const remPct = Math.round((remediatedCount / findings.length) * 100);
        return (
          <Paper variant="outlined" sx={{ px: 3, py: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            {/* Severity breakdown */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap', flex: 1 }}>
              {SEVERITIES.map(s => (
                <Box key={s} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: SEV_COLORS[s].text, flexShrink: 0 }} />
                  <Typography variant="body2" fontWeight={700} sx={{ color: SEV_COLORS[s].text }}>{sevCounts[s]}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </Typography>
                </Box>
              ))}
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              <Typography variant="body2" color="text.secondary">
                <strong>{findings.length}</strong> total
              </Typography>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

            {/* Remediation progress */}
            <Box sx={{ minWidth: 260 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.75 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Remediation Progress
                </Typography>
                <Typography variant="caption" fontWeight={700} sx={{ color: remPct === 100 ? '#2e7d32' : '#e65100' }}>
                  {remediatedCount} / {findings.length}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={remPct}
                sx={{
                  height: 8, borderRadius: 4,
                  backgroundColor: '#ffebee',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: remPct === 100 ? '#2e7d32' : remPct >= 50 ? '#f57f17' : '#c62828',
                    borderRadius: 4,
                  },
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">{activeCount} active</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{remPct}% complete</Typography>
              </Box>
            </Box>
          </Paper>
        );
      })()}

      {/* ── Tab switcher ── */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        <Button
          variant={activeTab === 0 ? 'contained' : 'outlined'}
          startIcon={<FolderOpen />}
          onClick={() => setActiveTab(0)}
          sx={{
            fontWeight: 700, textTransform: 'none', fontSize: '0.95rem',
            px: 2.5, py: 1,
            ...(activeTab === 0
              ? { backgroundColor: theme.palette.primary.main, color: '#fff', boxShadow: 2 }
              : { borderColor: theme.palette.primary.main, color: theme.palette.primary.main }),
          }}
        >
          Findings&nbsp;({findings.length})
        </Button>
        <Button
          variant={activeTab === 1 ? 'contained' : 'outlined'}
          startIcon={<Description />}
          onClick={() => setActiveTab(1)}
          sx={{
            fontWeight: 700, textTransform: 'none', fontSize: '0.95rem',
            px: 2.5, py: 1,
            ...(activeTab === 1
              ? { backgroundColor: theme.palette.primary.main, color: '#fff', boxShadow: 2 }
              : { borderColor: theme.palette.primary.main, color: theme.palette.primary.main }),
          }}
        >
          Report Content
        </Button>
        <Button
          variant={activeTab === 2 ? 'contained' : 'outlined'}
          startIcon={<AccountTree />}
          onClick={() => setActiveTab(2)}
          sx={{
            fontWeight: 700, textTransform: 'none', fontSize: '0.95rem',
            px: 2.5, py: 1,
            ...(activeTab === 2
              ? { backgroundColor: theme.palette.primary.main, color: '#fff', boxShadow: 2 }
              : { borderColor: theme.palette.primary.main, color: theme.palette.primary.main }),
          }}
        >
          Attack Chain
        </Button>
      </Box>

      {/* ── Attack Chain tab ── */}
      {activeTab === 2 && (
        <AttackChain reportId={id} findings={findings} />
      )}

      {/* ── Report Content tab ── */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box>
              <Typography variant="h5" fontWeight={600}>Report Content</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Written sections that appear in the exported report.{' '}
                Use{' '}
                <code style={{ fontSize: '0.8rem', backgroundColor: '#f5f5f5', padding: '1px 5px', borderRadius: 3 }}>{'<<executive_summary>>'}</code>
                {', '}
                <code style={{ fontSize: '0.8rem', backgroundColor: '#f5f5f5', padding: '1px 5px', borderRadius: 3 }}>{'<<methodology>>'}</code>
                {', '}
                <code style={{ fontSize: '0.8rem', backgroundColor: '#f5f5f5', padding: '1px 5px', borderRadius: 3 }}>{'<<conclusion>>'}</code>
                {' '}in your template.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 2, flexShrink: 0 }}>
              {narrativeSaveStatus === 'pending' && (
                <Typography variant="caption" color="text.secondary">Unsaved changes…</Typography>
              )}
              {narrativeSaveStatus === 'saving' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <CircularProgress size={14} />
                  <Typography variant="caption" color="text.secondary">Saving…</Typography>
                </Box>
              )}
              {narrativeSaveStatus === 'saved' && (
                <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 600 }}>Saved</Typography>
              )}
              {narrativeSaveStatus === 'error' && (
                <Typography variant="caption" color="error">Save failed</Typography>
              )}
              <Button
                variant="contained"
                onClick={performNarrativeSave}
                disabled={narrativeSaveStatus === 'saving'}
                sx={{ backgroundColor: theme.palette.primary.main }}
              >
                {narrativeSaveStatus === 'saving' ? <CircularProgress size={18} color="inherit" /> : 'Save'}
              </Button>
            </Box>
          </Box>

          {narrativeInitial && (
            <Grid container spacing={4}>
              <Grid item xs={12}>
                <QuillField
                  label="Executive Summary"
                  helperText="Template variable: <<executive_summary>>"
                  initialValue={narrativeInitial.executive_summary}
                  onMount={q => {
                    execSummaryRef.current = q;
                    q.on('text-change', (delta, old, source) => {
                      if (source === 'user') narrativeAutoSaveCb.current?.();
                    });
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <QuillField
                  label="Methodology"
                  helperText="Template variable: <<methodology>>"
                  initialValue={narrativeInitial.methodology}
                  onMount={q => {
                    methodologyRef.current = q;
                    q.on('text-change', (delta, old, source) => {
                      if (source === 'user') narrativeAutoSaveCb.current?.();
                    });
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <QuillField
                  label="Conclusion"
                  helperText="Template variable: <<conclusion>>"
                  initialValue={narrativeInitial.conclusion}
                  onMount={q => {
                    conclusionRef.current = q;
                    q.on('text-change', (delta, old, source) => {
                      if (source === 'user') narrativeAutoSaveCb.current?.();
                    });
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <QuillField
                  label="Client Notes"
                  helperText="Template variable: <<client_notes>>"
                  initialValue={narrativeInitial.client_notes}
                  onMount={q => {
                    clientNotesRef.current = q;
                    q.on('text-change', (delta, old, source) => {
                      if (source === 'user') narrativeAutoSaveCb.current?.();
                    });
                  }}
                />
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      {/* ── Findings tab ── */}
      {activeTab === 0 && <>

      {/* Findings heading + toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" fontWeight={600} sx={{ flexShrink: 0 }}>
          <FolderOpen sx={{ mr: 1, verticalAlign: 'middle' }} />
          Findings ({findings.length})
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search findings..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            sx={{ width: 220 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Pentest type</InputLabel>
            <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} label="Pentest type">
              <MenuItem value="">All types</MenuItem>
              {PENTEST_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} label="Status">
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Active only</MenuItem>
              <MenuItem value="REMEDIATED">Remediated only</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Toggle columns">
            <IconButton onClick={e => setColMenuAnchor(e.currentTarget)} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <ViewColumn fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Column visibility menu */}
      <Menu anchorEl={colMenuAnchor} open={Boolean(colMenuAnchor)} onClose={() => setColMenuAnchor(null)}>
        <Typography variant="caption" sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary', fontWeight: 600 }}>VISIBLE COLUMNS</Typography>
        {TOGGLEABLE_COLS.map(col => (
          <MenuItem key={col.key} dense onClick={() => setVisibleCols(v => ({ ...v, [col.key]: !v[col.key] }))}>
            <Checkbox checked={visibleCols[col.key]} size="small" sx={{ p: 0.5, mr: 1 }} />
            <ListItemText primary={col.label} />
          </MenuItem>
        ))}
      </Menu>

      {findings.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <FolderOpen sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No findings yet</Typography>
            <Typography variant="body2" color="text.disabled" mb={3}>
              {isClient ? 'No findings have been added to this report yet.' : 'Add findings from the repository or create a custom writeup'}
            </Typography>
            {!isClient && (
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button variant="contained" startIcon={<Create />} onClick={() => navigate(`/findings/new?report=${id}&engagement=${report.engagement}`)}
                  sx={{ backgroundColor: theme.palette.primary.main }}>
                  Custom Finding
                </Button>
                <Button variant="outlined" startIcon={<LibraryAdd />} onClick={() => { setAddDialog(false); setRepoDialog(true); }}>
                  From Repository
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      ) : (() => {
        // Filter
        const q = searchText.toLowerCase();
        const filtered = findings.filter(f =>
          (!q || f.title?.toLowerCase().includes(q) || f.affected_asset?.toLowerCase().includes(q)) &&
          (!typeFilter || f.pentest_type === typeFilter) &&
          (!statusFilter || (statusFilter === 'active' ? f.status !== 'REMEDIATED' : f.status === statusFilter))
        );

        // Group by pentest_type
        const groups = {};
        filtered.forEach(f => {
          const key = f.pentest_type || '__untagged__';
          if (!groups[key]) groups[key] = [];
          groups[key].push(f);
        });
        const groupEntries = Object.entries(groups).sort(([a], [b]) => {
          if (a === '__untagged__') return 1;
          if (b === '__untagged__') return -1;
          return a.localeCompare(b);
        });
        const multipleGroups = groupEntries.length > 1 || (groupEntries.length === 1 && groupEntries[0][0] !== '__untagged__');

        // Total visible cols for group-header colspan
        const visCount = Object.values(visibleCols).filter(Boolean).length;
        const totalCols = 4 + visCount; // checkbox + accent + title + visibles + actions
        const filteredIds = filtered.map(f => f.id);
        const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id));
        const someSelected = filteredIds.some(id => selectedIds.has(id));

        // Resize handle helper
        const resizeHandle = (col) => (
          <Box
            onMouseDown={e => { e.preventDefault(); resizingCol.current = col; resizeStartX.current = e.clientX; resizeStartW.current = colWidths.current[col]; }}
            sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 5, cursor: 'col-resize', zIndex: 1, '&:hover': { backgroundColor: 'rgba(255,255,255,0.35)' } }}
          />
        );

        const ratingChip = (val) => val ? (
          <Chip label={val} size="small" sx={{ backgroundColor: SEV_COLORS[val]?.bg || '#f5f5f5', color: SEV_COLORS[val]?.text || '#616161', fontWeight: 700, fontSize: '0.7rem', border: `1px solid ${SEV_COLORS[val]?.border || '#e0e0e0'}` }} />
        ) : <Typography variant="caption" color="text.disabled">—</Typography>;

        const assetCell = (asset) => {
          if (!asset) return <Typography variant="caption" color="text.disabled">—</Typography>;
          const lines = asset.split('\n').map(l => l.trim()).filter(Boolean);
          const shown = lines.slice(0, 2);
          const extra = lines.length - 2;
          return (
            <Box title={asset}>
              {shown.map((line, i) => (
                <Typography key={i} variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.72rem', display: 'block', lineHeight: 1.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {line}
                </Typography>
              ))}
              {extra > 0 && <Typography variant="caption" sx={{ color: theme.palette.primary.main, fontSize: '0.7rem', fontStyle: 'italic' }}>+{extra} more</Typography>}
            </Box>
          );
        };

        if (filtered.length === 0) return (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <Typography color="text.secondary">No findings match your search.</Typography>
          </Paper>
        );

        return (
          <Box>
            {/* Bulk action bar */}
            {selectedIds.size > 0 && !isClient && (
              <Paper variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1, mb: 1, borderColor: theme.palette.primary.main, backgroundColor: '#f0f7f4' }}>
                <Typography variant="body2" fontWeight={600} sx={{ color: theme.palette.primary.main, flexShrink: 0 }}>
                  {selectedIds.size} finding{selectedIds.size !== 1 ? 's' : ''} selected
                </Typography>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Set status</InputLabel>
                  <Select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} label="Set status">
                    <MenuItem value=""><em>Choose status…</em></MenuItem>
                    {['DRAFT','OPEN','IN_REVIEW','PUBLISHED','REMEDIATED','FALSE_POSITIVE','ACCEPTED_RISK'].map(s => (
                      <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained" size="small" disabled={!bulkStatus || bulkUpdating}
                  onClick={handleBulkUpdate}
                  sx={{ backgroundColor: theme.palette.primary.main, flexShrink: 0 }}
                >
                  {bulkUpdating ? <CircularProgress size={16} color="inherit" /> : 'Apply'}
                </Button>
                <Button size="small" onClick={() => setSelectedIds(new Set())} sx={{ ml: 'auto', flexShrink: 0 }}>
                  Clear selection
                </Button>
              </Paper>
            )}

          <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'auto' }}>
            <Table sx={{ tableLayout: 'fixed', minWidth: 600 }}>
              <colgroup>
                <col style={{ width: 42 }} />
                <col style={{ width: 6 }} />
                <col style={{ width: colWidths.current.title }} />
                {visibleCols.affected_asset && <col style={{ width: colWidths.current.affected_asset }} />}
                {visibleCols.severity    && <col style={{ width: colWidths.current.severity }} />}
                {visibleCols.cvss        && <col style={{ width: colWidths.current.cvss }} />}
                {visibleCols.impact      && <col style={{ width: colWidths.current.impact }} />}
                {visibleCols.likelihood  && <col style={{ width: colWidths.current.likelihood }} />}
                {visibleCols.status      && <col style={{ width: colWidths.current.status }} />}
                <col style={{ width: colWidths.current.actions }} />
              </colgroup>
              <TableHead>
                <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
                  <TableCell sx={{ p: 0, pl: 1, width: 42 }} onClick={e => e.stopPropagation()}>
                    {!isClient && (
                      <Checkbox
                        size="small"
                        checked={allSelected}
                        indeterminate={someSelected && !allSelected}
                        onChange={() => toggleSelectAll(filteredIds)}
                        sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: '#fff' } }}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ p: 0, width: 6 }} />
                  <TableCell sx={{ color: '#fff', fontWeight: 700, position: 'relative', overflow: 'visible' }}>Finding{resizeHandle('title')}</TableCell>
                  {visibleCols.affected_asset && <TableCell sx={{ color: '#fff', fontWeight: 700, position: 'relative', overflow: 'visible' }}>Affected Asset{resizeHandle('affected_asset')}</TableCell>}
                  {visibleCols.severity    && <TableCell sx={{ color: '#fff', fontWeight: 700, position: 'relative', overflow: 'visible' }}>Severity{resizeHandle('severity')}</TableCell>}
                  {visibleCols.cvss        && <TableCell sx={{ color: '#fff', fontWeight: 700, position: 'relative', overflow: 'visible' }}>CVSS{resizeHandle('cvss')}</TableCell>}
                  {visibleCols.impact      && <TableCell sx={{ color: '#fff', fontWeight: 700, position: 'relative', overflow: 'visible' }}>Impact{resizeHandle('impact')}</TableCell>}
                  {visibleCols.likelihood  && <TableCell sx={{ color: '#fff', fontWeight: 700, position: 'relative', overflow: 'visible' }}>Likelihood{resizeHandle('likelihood')}</TableCell>}
                  {visibleCols.status      && <TableCell sx={{ color: '#fff', fontWeight: 700, position: 'relative', overflow: 'visible' }}>Status{resizeHandle('status')}</TableCell>}
                  <TableCell sx={{ color: '#fff', fontWeight: 700, textAlign: 'right' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupEntries.map(([groupKey, groupFindings]) => {
                  const pt = getPentestType(groupKey);
                  const groupColor = pt?.color || '#546e7a';
                  const groupLabel = pt?.label || 'Untagged';
                  const sorted = [...groupFindings].sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity));
                  return (
                    <React.Fragment key={groupKey}>
                      {multipleGroups && (
                        <TableRow>
                          <TableCell colSpan={totalCols} sx={{ py: 0.75, px: 2, backgroundColor: `${groupColor}18`, borderLeft: `4px solid ${groupColor}`, borderBottom: `1px solid ${groupColor}40` }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: groupColor, flexShrink: 0 }} />
                              <Typography variant="caption" fontWeight={700} sx={{ color: groupColor, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.72rem' }}>
                                {groupLabel}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">— {groupFindings.length} finding{groupFindings.length !== 1 ? 's' : ''}</Typography>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      )}
                      {sorted.map((finding, idx) => {
                        const sev = SEV_COLORS[finding.severity] || SEV_COLORS.INFORMATIONAL;
                        const cvss = parseFloat(finding.cvss_score);
                        return (
                          <TableRow
                            key={finding.id}
                            hover
                            onClick={() => openPreview(finding)}
                            selected={selectedIds.has(finding.id)}
                            sx={{ backgroundColor: selectedIds.has(finding.id) ? '#e8f5e9' : idx % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer', '&:hover': { backgroundColor: selectedIds.has(finding.id) ? '#d4edda' : '#f0f4f0' }, transition: 'background-color 0.15s' }}
                          >
                            <TableCell sx={{ p: 0, pl: 1, width: 42 }} onClick={e => !isClient && toggleSelect(e, finding.id)}>
                              {!isClient && <Checkbox size="small" checked={selectedIds.has(finding.id)} />}
                            </TableCell>
                            <TableCell sx={{ p: 0, width: 6, backgroundColor: sev.text }} />
                            <TableCell sx={{ py: 1.5, overflow: 'hidden' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, overflow: 'hidden' }}>
                                {findingNumbers[finding.id] && (
                                  <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.68rem', color: '#fff', backgroundColor: sev.text, px: 0.6, py: 0.1, borderRadius: 0.5, flexShrink: 0, lineHeight: 1.6 }}>
                                    {findingNumbers[finding.id]}
                                  </Typography>
                                )}
                                <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {finding.title}
                                </Typography>
                              </Box>
                            </TableCell>
                            {visibleCols.affected_asset && <TableCell sx={{ py: 1.5, overflow: 'hidden' }}>{assetCell(finding.affected_asset)}</TableCell>}
                            {visibleCols.severity && (
                              <TableCell sx={{ py: 1.5 }}>
                                <Chip label={finding.severity} size="small" sx={{ backgroundColor: sev.bg, color: sev.text, fontWeight: 700, fontSize: '0.7rem', border: `1px solid ${sev.border}` }} />
                              </TableCell>
                            )}
                            {visibleCols.cvss && (
                              <TableCell sx={{ py: 1.5 }}>
                                {finding.cvss_score ? (
                                  <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 26, borderRadius: 1, fontWeight: 700, fontSize: '0.78rem', backgroundColor: cvss >= 9 ? '#ffebee' : cvss >= 7 ? '#fff3e0' : cvss >= 4 ? '#fff8e1' : '#e8f5e9', color: cvss >= 9 ? '#c62828' : cvss >= 7 ? '#e65100' : cvss >= 4 ? '#f57f17' : '#2e7d32', border: '1px solid', borderColor: cvss >= 9 ? '#ef9a9a' : cvss >= 7 ? '#ffcc80' : cvss >= 4 ? '#ffe082' : '#a5d6a7' }}>
                                    {finding.cvss_score}
                                  </Box>
                                ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                              </TableCell>
                            )}
                            {visibleCols.impact     && <TableCell sx={{ py: 1.5 }}>{ratingChip(finding.impact_rating)}</TableCell>}
                            {visibleCols.likelihood && <TableCell sx={{ py: 1.5 }}>{ratingChip(finding.likelihood_rating)}</TableCell>}
                            {visibleCols.status && (
                              <TableCell sx={{ py: 1.5 }}>
                                <Chip label={finding.status?.replace(/_/g, ' ')} size="small" sx={{ backgroundColor: STATUS_COLORS[finding.status]?.bg || '#f5f5f5', color: STATUS_COLORS[finding.status]?.text || '#616161', fontWeight: 600, fontSize: '0.7rem' }} />
                              </TableCell>
                            )}
                            <TableCell sx={{ py: 1.5, textAlign: 'right' }}>
                              <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={e => e.stopPropagation()}>
                                <Tooltip title="Preview"><IconButton size="small" onClick={() => openPreview(finding)} sx={{ color: theme.palette.primary.main }}><Visibility fontSize="small" /></IconButton></Tooltip>
                                {!isClient && <Tooltip title="Edit"><IconButton size="small" sx={{ color: '#546e7a' }} onClick={() => navigate(`/findings/${finding.id}/edit?report=${id}`)}><Edit fontSize="small" /></IconButton></Tooltip>}
                                {!isClient && <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteConfirm(finding)}><Delete fontSize="small" /></IconButton></Tooltip>}
                                {!isClient && (
                                  <Tooltip title="Finding settings">
                                    <IconButton size="small" onClick={(e) => openFindingMenu(e, finding)} disabled={jiraSendingId === finding.id}>
                                      {jiraSendingId === finding.id ? <CircularProgress size={16} /> : <MoreVert fontSize="small" />}
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          </Box>
        );
      })()}

      </>}

      {/* ── Preview Drawer ── */}
      <Menu anchorEl={findingMenuAnchor} open={Boolean(findingMenuAnchor)} onClose={closeFindingMenu}>
        <MenuItem onClick={() => handleSendFindingToJira(findingMenuItem)}
          disabled={!findingMenuItem || jiraSendingId === findingMenuItem?.id}>
          <ListItemText primary="Send to Jira" secondary={findingMenuItem?.jira_issue_key ? `Already linked: ${findingMenuItem.jira_issue_key}` : 'Create Jira ticket'} />
        </MenuItem>
      </Menu>

      <Drawer
        anchor="right"
        open={Boolean(previewFinding)}
        onClose={() => setPreviewFinding(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 560 }, display: 'flex', flexDirection: 'column' } }}
      >
        {/* Header */}
        <Box sx={{
          px: 3, py: 2,
          borderLeft: `6px solid ${prevSev.text}`,
          backgroundColor: '#fafafa',
          borderBottom: '1px solid',
          borderBottomColor: 'divider',
          flexShrink: 0,
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, pr: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                {previewFinding && findingNumbers[previewFinding.id] && (
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem', color: '#fff', backgroundColor: prevSev.text, px: 0.75, py: 0.2, borderRadius: 0.75, flexShrink: 0, lineHeight: 1.6 }}>
                    {findingNumbers[previewFinding.id]}
                  </Typography>
                )}
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                  {previewFinding?.title}
                </Typography>
              </Box>
              {(previewFinding?.cwe_id || previewFinding?.cve_id) && (
                <Stack direction="row" spacing={1} sx={{ mb: 0.5 }}>
                  {previewFinding.cwe_id && <Typography variant="caption" color="text.secondary">{previewFinding.cwe_id}</Typography>}
                  {previewFinding.cve_id && <Typography variant="caption" color="text.secondary">{previewFinding.cve_id}</Typography>}
                </Stack>
              )}
            </Box>
            <IconButton size="small" onClick={() => setPreviewFinding(null)}><Close fontSize="small" /></IconButton>
          </Box>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center" flexWrap="wrap">
            <Chip
              label={previewFinding?.severity}
              size="small"
              sx={{ backgroundColor: prevSev.bg, color: prevSev.text, fontWeight: 700, fontSize: '0.7rem', border: `1px solid ${prevSev.border}` }}
            />
            <Chip
              label={previewFinding?.status?.replace(/_/g, ' ')}
              size="small"
              sx={{ backgroundColor: STATUS_COLORS[previewFinding?.status]?.bg || '#f5f5f5', color: STATUS_COLORS[previewFinding?.status]?.text || '#616161', fontWeight: 600, fontSize: '0.7rem' }}
            />
            {previewFinding?.impact_rating && (
              <Chip label={`Impact: ${previewFinding.impact_rating}`} size="small" sx={{
                backgroundColor: SEV_COLORS[previewFinding.impact_rating]?.bg, color: SEV_COLORS[previewFinding.impact_rating]?.text,
                fontWeight: 600, fontSize: '0.7rem', border: `1px solid ${SEV_COLORS[previewFinding.impact_rating]?.border}`,
              }} />
            )}
            {previewFinding?.likelihood_rating && (
              <Chip label={`Likelihood: ${previewFinding.likelihood_rating}`} size="small" sx={{
                backgroundColor: SEV_COLORS[previewFinding.likelihood_rating]?.bg, color: SEV_COLORS[previewFinding.likelihood_rating]?.text,
                fontWeight: 600, fontSize: '0.7rem', border: `1px solid ${SEV_COLORS[previewFinding.likelihood_rating]?.border}`,
              }} />
            )}
            {previewFinding?.cvss_score && (
              <Box sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.5,
                px: 1, py: 0.25, borderRadius: 1, fontWeight: 700, fontSize: '0.75rem',
                backgroundColor: prevCvssBg, color: prevCvssColor,
                border: '1px solid', borderColor: prevCvssBorder,
              }}>
                CVSS {previewFinding.cvss_score}
              </Box>
            )}
          </Stack>
        </Box>

        {/* Body */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
          {previewLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          {!previewLoading && [
            { label: 'Affected Asset',     value: previewFinding?.affected_asset, mono: true },
            { label: 'Description',        value: previewFinding?.description },
            { label: 'Technical Details',  value: previewFinding?.details },
            { label: 'Impact',             value: previewFinding?.impact },
            { label: 'Likelihood',         value: previewFinding?.likelihood },
            { label: 'Recommendations',    value: previewFinding?.recommendations },
            { label: 'Supporting Evidence',value: previewFinding?.supporting_evidence },
          ].map(({ label, value, mono }) => value ? (
            <Box key={label} sx={{ mb: 3 }}>
              <Typography variant="overline" sx={{ fontWeight: 700, color: theme.palette.primary.main, letterSpacing: 1 }}>
                {label}
              </Typography>
              <Divider sx={{ mb: 1 }} />
              {mono ? (
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.82rem', whiteSpace: 'pre-wrap', color: '#333', lineHeight: 1.8 }}>
                  {value}
                </Typography>
              ) : (
                <Box
                  className="ql-editor"
                  sx={{ p: '0 !important', fontSize: '0.875rem', lineHeight: 1.8, color: '#333', '& p': { margin: '0 0 6px' } }}
                  dangerouslySetInnerHTML={{ __html: value }}
                />
              )}
            </Box>
          ) : null)}
        </Box>

        {/* Footer */}
        <Box sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1, justifyContent: 'flex-end', flexShrink: 0 }}>
          <Button variant="outlined" size="small" onClick={() => setPreviewFinding(null)}>Close</Button>
          {!isClient && (
            <Button
              variant="contained" size="small" startIcon={<Edit fontSize="small" />}
              onClick={() => { setPreviewFinding(null); navigate(`/findings/${previewFinding?.id}/edit?report=${id}`); }}
              sx={{ backgroundColor: theme.palette.primary.main }}
            >
              Edit Finding
            </Button>
          )}
        </Box>
      </Drawer>

      {/* ── Choice Dialog ── */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Finding</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { borderColor: theme.palette.primary.main } }}
              onClick={() => { setAddDialog(false); navigate(`/findings/new?report=${id}&engagement=${report.engagement}`); }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Create sx={{ color: theme.palette.primary.main, fontSize: 32 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>Custom Writeup</Typography>
                  <Typography variant="body2" color="text.secondary">Write a finding from scratch</Typography>
                </Box>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { borderColor: theme.palette.primary.main } }}
              onClick={() => { setAddDialog(false); setRepoSearch(''); setRepoCategory(''); setRepoSeverity(''); setRepoFolder(''); setSelectedTemplates([]); setRepoDialog(true); }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <LibraryAdd sx={{ color: theme.palette.primary.main, fontSize: 32 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>From Repository</Typography>
                  <Typography variant="body2" color="text.secondary">Search and add pre-built findings</Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* ── Repository Picker ── */}
      <Dialog open={repoDialog} onClose={() => setRepoDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Add from Repository
          {selectedTemplates.length > 0 && (
            <Chip label={`${selectedTemplates.length} selected`} size="small"
              sx={{ ml: 2, backgroundColor: theme.palette.primary.main, color: '#fff' }} />
          )}
        </DialogTitle>
        <DialogContent>
          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField size="small" placeholder="Search findings..." value={repoSearch}
              onChange={(e) => setRepoSearch(e.target.value)} sx={{ flexGrow: 1, minWidth: 200 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Folder</InputLabel>
              <Select value={repoFolder} onChange={(e) => setRepoFolder(e.target.value)} label="Folder">
                <MenuItem value="">All folders</MenuItem>
                <MenuItem value="__none__">— No folder —</MenuItem>
                {repoFolders.map(f => (
                  <MenuItem key={f.id} value={f.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: f.color || '#999', flexShrink: 0 }} />
                      {f.is_private ? '🔒 ' : ''}{f.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Category</InputLabel>
              <Select value={repoCategory} onChange={(e) => setRepoCategory(e.target.value)} label="Category">
                {CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Severity</InputLabel>
              <Select value={repoSeverity} onChange={(e) => setRepoSeverity(e.target.value)} label="Severity">
                <MenuItem value="">All</MenuItem>
                {SEVERITIES.map(s => <MenuItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          {repoLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : filteredTemplates.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">No findings found in repository.</Typography>
              <Typography variant="body2" color="text.disabled" mt={1}>
                Add finding templates in the Repository section first.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Severity</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>CWE</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTemplates.map(t => (
                    <TableRow key={t.id} hover selected={selectedTemplates.includes(t.id)}
                      onClick={() => toggleTemplate(t.id)} sx={{ cursor: 'pointer' }}>
                      <TableCell padding="checkbox">
                        <Checkbox checked={selectedTemplates.includes(t.id)} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{t.title}</Typography>
                        {t.description && (
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 400 }}>
                            {t.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell><Chip label={t.category} size="small" variant="outlined" /></TableCell>
                      <TableCell>
                        <Chip label={t.default_severity} size="small"
                          sx={{ backgroundColor: SEV_COLORS[t.default_severity]?.bg, color: SEV_COLORS[t.default_severity]?.text, fontWeight: 600, fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell><Typography variant="caption">{t.cwe_id || '—'}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRepoDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddFromRepo} disabled={addingFromRepo || selectedTemplates.length === 0}
            sx={{ backgroundColor: theme.palette.primary.main }}>
            {addingFromRepo ? <CircularProgress size={20} /> : `Add ${selectedTemplates.length || ''} Finding${selectedTemplates.length !== 1 ? 's' : ''} to Report`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Custom Finding Form ── */}
      <Dialog open={customDialog} onClose={() => setCustomDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editFinding ? 'Edit Finding' : 'Custom Finding'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Title *" value={findingForm.title}
                onChange={(e) => setFindingForm({ ...findingForm, title: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Severity *</InputLabel>
                <Select value={findingForm.severity} label="Severity *"
                  onChange={(e) => setFindingForm({ ...findingForm, severity: e.target.value })}>
                  {SEVERITIES.map(s => (
                    <MenuItem key={s} value={s}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: SEV_COLORS[s]?.text }} />
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={findingForm.status} label="Status"
                  onChange={(e) => setFindingForm({ ...findingForm, status: e.target.value })}>
                  {STATUSES.map(s => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="CVSS Score (0–10)" value={findingForm.cvss_score}
                onChange={(e) => setFindingForm({ ...findingForm, cvss_score: e.target.value })}
                type="number" inputProps={{ min: 0, max: 10, step: 0.1 }} />
            </Grid>

            <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Finding Details</Typography></Divider></Grid>

            {[
              { key: 'description', label: 'Description' },
              { key: 'details', label: 'Technical Details' },
              { key: 'impact', label: 'Impact' },
              { key: 'likelihood', label: 'Likelihood' },
              { key: 'recommendations', label: 'Recommendations' },
              { key: 'supporting_evidence', label: 'Supporting Evidence' },
            ].map(({ key, label }) => (
              <Grid item xs={12} key={key}>
                <TextField fullWidth label={label} multiline rows={3} value={findingForm[key]}
                  onChange={(e) => setFindingForm({ ...findingForm, [key]: e.target.value })} />
              </Grid>
            ))}

            <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">References</Typography></Divider></Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="CWE ID" value={findingForm.cwe_id}
                onChange={(e) => setFindingForm({ ...findingForm, cwe_id: e.target.value })} placeholder="e.g. CWE-79" />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="CVE ID" value={findingForm.cve_id}
                onChange={(e) => setFindingForm({ ...findingForm, cve_id: e.target.value })} placeholder="e.g. CVE-2024-1234" />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="References" value={findingForm.references}
                onChange={(e) => setFindingForm({ ...findingForm, references: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCustomDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleFindingSubmit} disabled={submitting}
            sx={{ backgroundColor: theme.palette.primary.main }}>
            {submitting ? <CircularProgress size={20} /> : editFinding ? 'Save Changes' : 'Add Finding'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Client Portal Drawer ── */}
      <Drawer
        anchor="right"
        open={portalOpen}
        onClose={() => setPortalOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, display: 'flex', flexDirection: 'column' } }}
      >
        {/* Header */}
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', backgroundColor: theme.palette.primary.main, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chat sx={{ color: '#fff', fontSize: 20 }} />
              <Typography variant="h6" fontWeight={700} sx={{ color: '#fff' }}>Client Portal</Typography>
            </Box>
            <IconButton size="small" onClick={() => setPortalOpen(false)} sx={{ color: '#fff' }}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
            {report?.title} — Collaboration thread
          </Typography>
        </Box>

        {/* Messages */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5, backgroundColor: '#f7f9f8' }}>
          {messagesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={24} /></Box>
          ) : messages.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Chat sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary" variant="body2">No messages yet.</Typography>
              <Typography variant="caption" color="text.disabled">Start the conversation below.</Typography>
            </Box>
          ) : messages.map(msg => {
            const isOwn = msg.author === currentUser?.id || msg.author_email === currentUser?.email;
            return (
              <Box key={msg.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                {/* Name + time */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25, flexDirection: isOwn ? 'row-reverse' : 'row' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    {msg.author_name || msg.author_email}
                  </Typography>
                  {msg.author_role === 'CLIENT' && (
                    <Chip label="Client" size="small" sx={{ height: 16, fontSize: '0.62rem', backgroundColor: '#e3f2fd', color: '#1976d2' }} />
                  )}
                  {msg.is_internal && (
                    <Chip icon={<Lock sx={{ fontSize: '0.7rem !important' }} />} label="Internal" size="small"
                      sx={{ height: 16, fontSize: '0.62rem', backgroundColor: '#fff3e0', color: '#e65100' }} />
                  )}
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
                    {new Date(msg.created_at).toLocaleString()}
                  </Typography>
                </Box>
                {/* Bubble */}
                <Box sx={{
                  maxWidth: '80%',
                  px: 1.5, py: 1,
                  borderRadius: isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  backgroundColor: msg.is_internal ? '#fff8e1' : isOwn ? theme.palette.primary.main : '#fff',
                  color: isOwn && !msg.is_internal ? '#fff' : '#212121',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  border: msg.is_internal ? '1px dashed #ffcc02' : 'none',
                  position: 'relative',
                }}>
                  {msg.content && (
                    <Typography variant="body2" component="div" sx={{ lineHeight: 1.6 }}>
                      {renderMessageContent(msg.content, isOwn && !msg.is_internal)}
                    </Typography>
                  )}
                  {msg.attachment_url && (
                    <Box sx={{ mt: msg.content ? 1 : 0, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AttachFile sx={{ fontSize: 14, opacity: 0.7 }} />
                      <Typography
                        component="a"
                        href={msg.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        variant="caption"
                        sx={{ color: isOwn && !msg.is_internal ? 'rgba(255,255,255,0.9)' : theme.palette.primary.main, textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        {msg.attachment_name || 'Download attachment'}
                      </Typography>
                      <IconButton
                        size="small"
                        component="a"
                        href={msg.attachment_url}
                        download
                        sx={{ p: 0.25, color: isOwn && !msg.is_internal ? 'rgba(255,255,255,0.9)' : 'text.secondary' }}
                      >
                        <Download sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Box>
                  )}
                </Box>
                {/* Delete (own messages or non-client) */}
                {(isOwn || !isClient) && (
                  <IconButton size="small" onClick={() => handleDeleteMessage(msg.id)} sx={{ mt: 0.25, p: 0.25, color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                    <Delete sx={{ fontSize: 13 }} />
                  </IconButton>
                )}
              </Box>
            );
          })}
          <div ref={messagesEndRef} />
        </Box>

        {/* Compose area */}
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', px: 2, py: 2, backgroundColor: '#fff', flexShrink: 0 }}>
          {attachment && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, px: 1.5, py: 0.75, backgroundColor: '#f0f7f4', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <AttachFile sx={{ fontSize: 16, color: theme.palette.primary.main }} />
              <Typography variant="caption" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.name}</Typography>
              <IconButton size="small" onClick={() => setAttachment(null)} sx={{ p: 0.25 }}><Close sx={{ fontSize: 14 }} /></IconButton>
            </Box>
          )}
          {/* @mention suggestion dropdown */}
          {mentionOpen && mentionSuggestions.length > 0 && (
            <ClickAwayListener onClickAway={() => setMentionOpen(false)}>
              <Paper variant="outlined" sx={{ mb: 1, maxHeight: 220, overflowY: 'auto', borderRadius: 1.5, border: `1px solid ${theme.palette.primary.main}40` }}>
                <Box sx={{ px: 1.5, py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
                    LINK FINDING — type to filter
                  </Typography>
                </Box>
                {mentionSuggestions.map(f => {
                  const sev = SEV_COLORS[f.severity] || SEV_COLORS.INFORMATIONAL;
                  const code = findingNumbers[f.id];
                  return (
                    <Box
                      key={f.id}
                      onMouseDown={e => { e.preventDefault(); handleSelectMention(f); }}
                      sx={{ px: 1.5, py: 0.9, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1, '&:hover': { backgroundColor: '#f0f7f4' } }}
                    >
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.7rem', color: '#fff', backgroundColor: sev.text, px: 0.6, py: 0.1, borderRadius: 0.5, flexShrink: 0 }}>
                        {code}
                      </Typography>
                      <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{f.title}</Typography>
                      <Chip label={f.severity} size="small" sx={{ backgroundColor: sev.bg, color: sev.text, fontWeight: 700, fontSize: '0.65rem', height: 18, flexShrink: 0 }} />
                    </Box>
                  );
                })}
              </Paper>
            </ClickAwayListener>
          )}
          <Box ref={mentionAnchorRef} sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              multiline
              maxRows={4}
              fullWidth
              size="small"
              placeholder="Write a message… (type @ to link a finding)"
              value={newMessage}
              onChange={handleMessageChange}
              onKeyDown={e => {
                if (mentionOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); return; }
                if (mentionOpen && e.key === 'Escape') { setMentionOpen(false); return; }
                if (e.key === 'Enter' && !e.shiftKey && !mentionOpen) { e.preventDefault(); handleSendMessage(); }
              }}
              inputRef={mentionInputRef}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <input ref={fileInputRef} type="file" hidden onChange={e => setAttachment(e.target.files[0] || null)} />
            <Tooltip title="Attach file">
              <IconButton onClick={() => fileInputRef.current?.click()} sx={{ color: 'text.secondary', flexShrink: 0 }}>
                <AttachFile />
              </IconButton>
            </Tooltip>
            <Tooltip title="Send (Enter)">
              <span>
                <IconButton
                  onClick={handleSendMessage}
                  disabled={sending || (!newMessage.trim() && !attachment)}
                  sx={{ backgroundColor: theme.palette.primary.main, color: '#fff', flexShrink: 0, '&:hover': { backgroundColor: '#1a3530' }, '&.Mui-disabled': { backgroundColor: '#e0e0e0', color: '#9e9e9e' } }}
                >
                  {sending ? <CircularProgress size={18} color="inherit" /> : <Send fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
          {!isClient && (
            <FormControlLabel
              control={<Switch size="small" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} />}
              label={<Typography variant="caption" color="text.secondary">Internal note (hidden from client)</Typography>}
              sx={{ mt: 1, ml: 0 }}
            />
          )}
        </Box>
      </Drawer>

      {/* Delete confirm */}
      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Finding</DialogTitle>
        <DialogContent>
          <Typography>Delete <strong>{deleteConfirm?.title}</strong>? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => handleDeleteFinding(deleteConfirm)}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Generate DOCX — template picker dialog */}
      <Dialog open={docxDialogOpen} onClose={() => !docxGenerating && setDocxDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Article sx={{ color: '#24483E' }} />
          Generate DOCX Report
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose a template to populate with this report's data. Upload templates via <strong>Reports → Templates</strong>.
          </Typography>
          {docxTemplatesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <FormControl fullWidth size="small">
              <InputLabel>Template</InputLabel>
              <Select
                value={docxTemplateId}
                label="Template"
                onChange={e => setDocxTemplateId(e.target.value)}
              >
                <MenuItem value="" disabled>
                  <em>Select a DOCX template</em>
                </MenuItem>
                {docxTemplates.map(t => (
                  <MenuItem key={t.id} value={String(t.id)} disabled={!t.docx_file}>
                    {t.name}
                    {t.is_default && (
                      <Chip label="default" size="small" sx={{ ml: 1, height: 18, fontSize: 10 }} />
                    )}
                    {!t.docx_file && (
                      <Chip label="missing file" size="small" color="warning" sx={{ ml: 1, height: 18, fontSize: 10 }} />
                    )}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {!docxTemplatesLoading && docxTemplates.length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              No DOCX report templates are available. Upload one before generating.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDocxDialogOpen(false)} disabled={docxGenerating}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleGenerateDocx}
            disabled={docxGenerating || docxTemplatesLoading || !docxTemplateId}
            startIcon={docxGenerating ? <CircularProgress size={16} color="inherit" /> : <Download />}
            sx={{ bgcolor: '#24483E', '&:hover': { bgcolor: '#1a3329' } }}
          >
            {docxGenerating ? 'Generating…' : 'Download DOCX'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportDetail;
