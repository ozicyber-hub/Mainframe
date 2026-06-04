import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, Chip,
  CircularProgress, Alert, IconButton,
  TextField, Select, InputLabel, FormControl, MenuItem,
  Divider, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip,
  InputAdornment, List, ListItem, ListItemButton, ListItemText, ListItemSecondaryAction,
  FormControlLabel, Checkbox,
} from '@mui/material';
import { ArrowBack, Add, Save, Delete, AutoAwesome, CheckCircle, Error as ErrorIcon, HourglassEmpty, LibraryBooks, Search } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import Quill from 'quill';
import 'react-quill/dist/quill.snow.css';
import api from '../utils/api';
import { usePageBreadcrumbs } from '../components/MainLayout';

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];
const RATINGS = ['LOW', 'MEDIUM', 'HIGH'];

const PENTEST_TYPES = [
  { value: 'WEB_APP',    label: 'Web Application' },
  { value: 'INTERNAL',   label: 'Internal Network' },
  { value: 'EXTERNAL',   label: 'External Network' },
  { value: 'MOBILE',     label: 'Mobile Application' },
  { value: 'API',        label: 'API Testing' },
  { value: 'CLOUD',      label: 'Cloud Infrastructure' },
  { value: 'SOCIAL_ENG', label: 'Social Engineering' },
  { value: 'PHYSICAL',   label: 'Physical Security' },
  { value: 'RED_TEAM',   label: 'Red Team' },
  { value: 'WIRELESS',   label: 'Wireless' },
  { value: 'OTHER',      label: 'Other' },
];

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

// Risk matrix: likelihood x impact → severity
const RISK_MATRIX = {
  HIGH:   { HIGH: 'CRITICAL', MEDIUM: 'MEDIUM', LOW: 'LOW' },
  MEDIUM: { HIGH: 'HIGH',     MEDIUM: 'MEDIUM', LOW: 'LOW' },
  LOW:    { HIGH: 'MEDIUM',   MEDIUM: 'LOW',    LOW: 'LOW' },
};

const calcSeverity = (likelihood, impact) => {
  if (!likelihood || !impact) return null;
  return RISK_MATRIX[likelihood]?.[impact] ?? null;
};
const STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'REMEDIATED', label: 'Remediated' },
  { value: 'FALSE_POSITIVE', label: 'False Positive' },
  { value: 'ACCEPTED_RISK', label: 'Risk Accepted' },
];

const SEV_COLORS = {
  CRITICAL:      { bg: '#fde8e8', text: '#c0392b' },
  HIGH:          { bg: '#fef3e2', text: '#e67e22' },
  MEDIUM:        { bg: '#fefbe6', text: '#f39c12' },
  LOW:           { bg: '#e8f8e8', text: '#27ae60' },
  INFORMATIONAL: { bg: '#e8f0fe', text: '#2980b9' },
};

const TOOLBAR_OPTIONS = [
  [{ font: [] }, { size: ['small', false, 'large', 'huge'] }],
  ['bold', 'italic', 'underline', 'strike', { color: [] }, { background: [] }],
  [{ header: [1, 2, 3, 4, false] }, { align: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
  ['blockquote', 'code-block', 'link', 'image'],
  [{ script: 'sub' }, { script: 'super' }, 'clean'],
];

// ─── Uncontrolled Quill editor ───────────────────────────────────────────────
// Uses Quill directly instead of react-quill to avoid the infinite-loop bug:
//   react-quill's componentDidUpdate compares `value` with getEditorContents(),
//   but Quill's HTML normalization means they never match → setContents loops forever.
// Here we initialise once, never touch the DOM again, and let the parent read
// `quillRef.current.root.innerHTML` at save time.
//
// The `initializedRef` guard prevents React 18 StrictMode's double-invocation
// from creating two Quill instances (and two toolbars) in the same wrapper.
const QuillField = memo(({ label, initialValue, onMount }) => {
  const theme = useTheme();
  const wrapperRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;   // already ran — skip StrictMode second call
    initializedRef.current = true;

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const container = document.createElement('div');
    wrapper.appendChild(container);

    const quill = new Quill(container, {
      theme: 'snow',
      modules: { toolbar: TOOLBAR_OPTIONS },
    });

    if (initialValue) {
      quill.clipboard.dangerouslyPasteHTML(initialValue);
    }

    onMount(quill);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- initialValue intentionally read once on mount

  return (
    <Box>
      {label && (
        <Typography
          variant="overline"
          sx={{ fontWeight: 700, color: theme.palette.primary.main, letterSpacing: 1, display: 'block', mb: 0.5 }}
        >
          {label}
        </Typography>
      )}
      <Box
        ref={wrapperRef}
        sx={{
          '& .ql-toolbar': {
            borderRadius: '6px 6px 0 0',
            borderColor: 'rgba(0,0,0,0.2)',
            backgroundColor: '#f8f8f8',
            padding: '4px 8px',
            lineHeight: 1,
            // Tighter buttons so all rows stay compact
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
            // Drag-to-resize handle in bottom-right corner
            resize: 'vertical',
            overflow: 'auto',
          },
          '&:focus-within .ql-toolbar, &:focus-within .ql-container': {
            borderColor: theme.palette.primary.main,
          },
        }}
      />
    </Box>
  );
});

// ─── Finding Editor page ─────────────────────────────────────────────────────
const FindingEditor = () => {
  const { findingId } = useParams();
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get('report');
  const engagementId = searchParams.get('engagement');
  const navigate = useNavigate();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const isEdit = Boolean(findingId);

  // Meta fields (plain text / selects — safe as controlled state)
  const [form, setForm] = useState({
    title: '',
    severity: 'HIGH',
    status: 'DRAFT',
    pentest_type: '',
    level_of_access: '',
    is_key_finding: false,
    impact_rating: '',
    likelihood_rating: '',
    cvss_score: '',
    affected_asset: '',
    cwe_id: '',
    cve_id: '',
    references: '',
  });

  // Rich-text fields are read from Quill instances at save time
  const quillRefs = useRef({
    description: null,
    details: null,
    impact: null,
    likelihood: null,
    recommendations: null,
    supporting_evidence: null,
  });

  // Custom fields: [{name, initialValue}] — Quill instances keyed by index
  const [customFields, setCustomFields] = useState([]);
  const customQuillRefs = useRef({});

  // Controls whether QuillFields are mounted (deferred until data is loaded in edit mode)
  const [dataLoaded, setDataLoaded] = useState(!isEdit);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);

  // Auto-save
  // For new findings: auto-creates a draft on first real change, then patches.
  const [autoSavedId, setAutoSavedId] = useState(null);   // set once when draft is auto-created
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // 'idle'|'pending'|'saving'|'saved'|'error'
  const autoSaveTimer    = useRef(null);
  const autoSaveCallback = useRef(null);  // always points at latest scheduleAutoSave
  const hasInteracted    = useRef(false); // don't fire on initial data load
  const savedTimerRef    = useRef(null);  // clears "Saved" label after 3 s

  const [addFieldDialog, setAddFieldDialog] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');

  // Template picker state
  const [tmplDialogOpen, setTmplDialogOpen]   = useState(false);
  const [tmplList, setTmplList]               = useState([]);
  const [tmplSearch, setTmplSearch]           = useState('');
  const [tmplLoading, setTmplLoading]         = useState(false);
  const [tmplFolder, setTmplFolder]           = useState('');
  const [tmplFolders, setTmplFolders]         = useState([]);

  // Save-to-repo dialog state
  const [repoDialogOpen, setRepoDialogOpen] = useState(false);
  const [repoForm, setRepoForm] = useState({ title: '', category: 'WEB', tags: '', folder: '' });
  const [repoSaving, setRepoSaving] = useState(false);
  const [repoFolders, setRepoFolders] = useState([]);

  // AI enhancement state
  const [aiDialog, setAiDialog]       = useState(false);
  const [aiField, setAiField]         = useState(null);   // { key, label }
  const [aiLoading, setAiLoading]     = useState(false);
  const [aiResult, setAiResult]       = useState('');     // html
  const [aiResultPlain, setAiResultPlain] = useState(''); // plain text for display
  const [aiError, setAiError]         = useState('');

  // fieldKey: one of the standard keys, or null for custom fields
  // quillInstance: the Quill object to read from / write to
  const openAiAssist = async (fieldLabel, quillInstance, fieldKey = 'description') => {
    setAiField({ label: fieldLabel, quill: quillInstance });
    setAiResult('');
    setAiResultPlain('');
    setAiError('');
    setAiDialog(true);
    setAiLoading(true);
    try {
      const currentHtml = quillInstance?.root?.innerHTML || '';
      const tmp = document.createElement('div');
      tmp.innerHTML = currentHtml;
      const plainText = tmp.innerText || tmp.textContent || '';
      const res = await api.post('/findings/ai/enhance/', {
        field: fieldKey,
        content: plainText,
        context: {
          title: form.title,
          severity: form.severity,
          pentest_type: form.pentest_type,
        },
      });
      setAiResult(res.data.enhanced);
      setAiResultPlain(res.data.enhanced_plain);
    } catch (err) {
      const msg = err.response?.data?.error || 'AI request failed. Check that Ollama is running and a model is pulled.';
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiResult = (mode) => {
    const quill = aiField?.quill;
    if (!quill || !aiResult) return;
    if (mode === 'replace') {
      quill.setContents([]);
    }
    quill.clipboard.dangerouslyPasteHTML(
      mode === 'replace' ? 0 : quill.getLength() - 1,
      aiResult
    );
    setAiDialog(false);
    enqueueSnackbar(`AI suggestion ${mode === 'replace' ? 'applied' : 'appended'} to ${aiField.label}`, { variant: 'success' });
  };

  // Store initial rich-text values so QuillField can use them on mount
  const initialRichValues = useRef({
    description: '', details: '', impact: '',
    likelihood: '', recommendations: '', supporting_evidence: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        if (reportId) {
          const rRes = await api.get(`/reports/${reportId}/`);
          setReport(rRes.data);
        }
        if (isEdit) {
          const fRes = await api.get(`/findings/${findingId}/`);
          const f = fRes.data;
          setForm({
            title: f.title || '',
            severity: f.severity || 'HIGH',
            status: f.status || 'DRAFT',
            pentest_type: f.pentest_type || '',
            level_of_access: f.level_of_access || '',
            is_key_finding: f.is_key_finding || false,
            impact_rating: f.impact_rating || '',
            likelihood_rating: f.likelihood_rating || '',
            cvss_score: f.cvss_score || '',
            affected_asset: f.affected_asset || '',
            cwe_id: f.cwe_id || '',
            cve_id: f.cve_id || '',
            references: f.references || '',
          });
          initialRichValues.current = {
            description: f.description || '',
            details: f.details || '',
            impact: f.impact || '',
            likelihood: f.likelihood || '',
            recommendations: f.recommendations || '',
            supporting_evidence: f.supporting_evidence || '',
          };
          if (f.custom_fields && typeof f.custom_fields === 'object') {
            setCustomFields(
              Object.entries(f.custom_fields).map(([name, value]) => ({ name, initialValue: value || '' }))
            );
          }
        }
      } catch {
        setError('Failed to load finding.');
      } finally {
        setLoading(false);
        setDataLoaded(true); // now safe to mount QuillFields with correct initialValues
      }
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const breadcrumbs = useMemo(() => {
    const items = [{ label: 'Organizations', to: '/organizations' }];
    if (report) {
      items.push({ label: report.engagement_name || 'Engagement', to: `/engagements/${report.engagement}` });
    }
    if (reportId) {
      items.push({ label: report?.title || 'Report', to: `/reports/${reportId}` });
    }
    items.push({ label: isEdit ? 'Edit Finding' : 'New Finding' });
    return items;
  }, [report, reportId, isEdit]);
  usePageBreadcrumbs(breadcrumbs);

  const getRichHTML = (key) => {
    const q = quillRefs.current[key];
    if (!q) return '';
    const html = q.root.innerHTML;
    // Quill's empty state is '<p><br></p>' — normalise to ''
    return html === '<p><br></p>' ? '' : html;
  };

  const getCustomHTML = (idx) => {
    const q = customQuillRefs.current[idx];
    if (!q) return '';
    const html = q.root.innerHTML;
    return html === '<p><br></p>' ? '' : html;
  };

  const buildPayload = useCallback(() => ({
    ...form,
    description:        getRichHTML('description'),
    details:            getRichHTML('details'),
    impact:             getRichHTML('impact'),
    likelihood:         getRichHTML('likelihood'),
    recommendations:    getRichHTML('recommendations'),
    supporting_evidence: getRichHTML('supporting_evidence'),
    custom_fields: customFields.reduce((acc, f, idx) => {
      if (f.name) acc[f.name] = getCustomHTML(idx);
      return acc;
    }, {}),
  }), [form, customFields]); // eslint-disable-line react-hooks/exhaustive-deps

  const performAutoSave = useCallback(async () => {
    const effectiveId = findingId || autoSavedId;
    const canPatch    = Boolean(effectiveId);
    const canCreate   = !isEdit && !autoSavedId && engagementId && form.title.trim();

    if (!canPatch && !canCreate) return;

    setAutoSaveStatus('saving');
    try {
      const payload = buildPayload();

      if (canPatch) {
        await api.patch(`/findings/${effectiveId}/`, payload);
      } else {
        // Auto-create a draft on first change for new findings
        const res = await api.post('/findings/', { ...payload, engagement: parseInt(engagementId) });
        const newId = res.data.id;
        setAutoSavedId(newId);
        // Silently update the URL so refresh/back works correctly
        window.history.replaceState(null, '', `/findings/${newId}/edit${window.location.search}`);
      }

      setAutoSaveStatus('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setAutoSaveStatus('idle'), 3000);
    } catch {
      setAutoSaveStatus('error');
    }
  }, [findingId, autoSavedId, isEdit, engagementId, form.title, buildPayload]);

  const scheduleAutoSave = useCallback(() => {
    if (!hasInteracted.current) return;
    setAutoSaveStatus('pending');
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => performAutoSave(), 1500);
  }, [performAutoSave]);

  // Keep ref in sync so Quill text-change listeners always call the latest version
  autoSaveCallback.current = scheduleAutoSave;

  // Watch form (controlled fields)
  useEffect(() => {
    if (!hasInteracted.current) return;
    scheduleAutoSave();
  }, [form]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark first interaction once data is fully loaded
  useEffect(() => {
    if (dataLoaded) {
      // Small delay so the initial setState calls from load() don't trigger auto-save
      const t = setTimeout(() => { hasInteracted.current = true; }, 500);
      return () => clearTimeout(t);
    }
  }, [dataLoaded]);

  // ── Template picker ──────────────────────────────────────────────────────────
  const openTemplatePicker = async () => {
    setTmplSearch('');
    setTmplFolder('');
    setTmplDialogOpen(true);
    setTmplLoading(true);
    try {
      const [tmplRes, folderRes] = await Promise.all([
        api.get('/repository/templates/'),
        api.get('/repository/folders/'),
      ]);
      setTmplList(tmplRes.data?.results ?? tmplRes.data);
      setTmplFolders(folderRes.data?.results ?? folderRes.data);
    } catch {
      enqueueSnackbar('Failed to load templates', { variant: 'error' });
    } finally {
      setTmplLoading(false);
    }
  };

  const applyTemplate = async (tmpl) => {
    const TEXT_FIELDS = ['description', 'details', 'impact', 'likelihood', 'recommendations', 'supporting_evidence', 'references'];
    // repository model uses default_severity, not severity
    setForm(prev => ({
      ...prev,
      title:    prev.title || tmpl.title,
      severity: tmpl.default_severity || prev.severity,
      pentest_type: prev.pentest_type || inferPentestTypeFromTemplate(tmpl),
      cwe_id:   tmpl.cwe_id || prev.cwe_id,
    }));
    // Push plain-text content into Quill editors (only fills empty fields)
    TEXT_FIELDS.forEach((field) => {
      if (tmpl[field]) {
        const q = quillRefs.current[field];
        if (q && !q.getText().trim()) {
          q.clipboard.dangerouslyPasteHTML(`<p>${tmpl[field].replace(/\n/g, '</p><p>')}</p>`);
        }
      }
    });
    // Increment usage count
    try { await api.post(`/repository/templates/${tmpl.id}/apply/`, { engagement_id: engagementId || 0 }); } catch {}
    enqueueSnackbar(`Loaded template: ${tmpl.title}`, { variant: 'success' });
    setTmplDialogOpen(false);
  };

  const openRepoDialog = async () => {
    setRepoForm({ title: form.title, category: 'WEB', tags: '', folder: '' });
    setRepoDialogOpen(true);
    try {
      const res = await api.get('/repository/folders/');
      setRepoFolders(res.data.results || res.data);
    } catch { setRepoFolders([]); }
  };

  const handleSaveToRepo = async () => {
    if (!repoForm.title.trim()) { enqueueSnackbar('Title is required', { variant: 'warning' }); return; }
    setRepoSaving(true);
    try {
      await api.post('/repository/templates/', {
        title:              repoForm.title,
        category:           repoForm.category,
        tags:               repoForm.tags ? repoForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        folder:             repoForm.folder || null,
        default_severity:   form.severity || 'MEDIUM',
        cwe_id:             form.cwe_id || '',
        description:        getRichHTML('description'),
        details:            getRichHTML('details'),
        impact:             getRichHTML('impact'),
        likelihood:         getRichHTML('likelihood'),
        recommendations:    getRichHTML('recommendations'),
        supporting_evidence: getRichHTML('supporting_evidence'),
        references:         form.references || '',
      });
      enqueueSnackbar('Saved to repository!', { variant: 'success' });
      setRepoDialogOpen(false);
    } catch {
      enqueueSnackbar('Failed to save to repository', { variant: 'error' });
    }
    setRepoSaving(false);
  };

  const filteredTmpls = tmplList.filter((t) => {
    const q = tmplSearch.toLowerCase();
    const tagsStr = Array.isArray(t.tags) ? t.tags.join(' ') : (t.tags || '');
    const matchesSearch = !q || t.title.toLowerCase().includes(q) || tagsStr.toLowerCase().includes(q) || (t.cwe_id || '').toLowerCase().includes(q);
    const matchesFolder = !tmplFolder || (tmplFolder === '__none__' ? !t.folder : String(t.folder) === String(tmplFolder));
    return matchesSearch && matchesFolder;
  });

  const handleSave = async () => {
    if (!form.title.trim()) {
      enqueueSnackbar('Title is required', { variant: 'error' });
      return;
    }
    if (!engagementId && !isEdit) {
      enqueueSnackbar('Missing engagement context', { variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const customFieldsObj = customFields.reduce((acc, f, idx) => {
        if (f.name) acc[f.name] = getCustomHTML(idx);
        return acc;
      }, {});

      const payload = {
        ...form,
        description: getRichHTML('description'),
        details: getRichHTML('details'),
        impact: getRichHTML('impact'),
        likelihood: getRichHTML('likelihood'),
        recommendations: getRichHTML('recommendations'),
        supporting_evidence: getRichHTML('supporting_evidence'),
        custom_fields: customFieldsObj,
      };
      if (!isEdit) payload.engagement = parseInt(engagementId);

      if (isEdit) {
        await api.patch(`/findings/${findingId}/`, payload);
        enqueueSnackbar('Finding saved', { variant: 'success' });
      } else if (autoSavedId) {
        await api.patch(`/findings/${autoSavedId}/`, payload);
        enqueueSnackbar('Finding saved', { variant: 'success' });
      } else {
        await api.post('/findings/', payload);
        enqueueSnackbar('Finding added to report', { variant: 'success' });
      }

      if (reportId) navigate(`/reports/${reportId}`);
      else navigate(-1);
    } catch (err) {
      const msg = err.response?.data
        ? Object.values(err.response.data).flat().join(' ')
        : 'Failed to save finding';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const addCustomField = () => {
    if (!newFieldName.trim()) return;
    setCustomFields(prev => [...prev, { name: newFieldName.trim(), initialValue: '' }]);
    setNewFieldName('');
    setAddFieldDialog(false);
  };

  const removeCustomField = (idx) => {
    delete customQuillRefs.current[idx];
    setCustomFields(prev => prev.filter((_, i) => i !== idx));
  };

  const sevColor = SEV_COLORS[form.severity] || SEV_COLORS.HIGH;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => reportId ? navigate(`/reports/${reportId}`) : navigate(-1)} size="small">
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight={700}>
            {isEdit ? 'Edit Finding' : 'New Finding'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Auto-save status indicator */}
          {autoSaveStatus === 'pending' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <HourglassEmpty sx={{ fontSize: 14, color: 'text.disabled', animation: 'spin 1.5s linear infinite', '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }} />
              <Typography variant="caption" color="text.disabled">Unsaved changes</Typography>
            </Box>
          )}
          {autoSaveStatus === 'saving' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CircularProgress size={12} sx={{ color: 'text.disabled' }} />
              <Typography variant="caption" color="text.disabled">Saving…</Typography>
            </Box>
          )}
          {autoSaveStatus === 'saved' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CheckCircle sx={{ fontSize: 14, color: '#2e7d32' }} />
              <Typography variant="caption" sx={{ color: '#2e7d32' }}>Saved</Typography>
            </Box>
          )}
          {autoSaveStatus === 'error' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ErrorIcon sx={{ fontSize: 14, color: 'error.main' }} />
              <Typography variant="caption" color="error">Auto-save failed</Typography>
            </Box>
          )}
          <Button variant="outlined" startIcon={<LibraryBooks />} onClick={openTemplatePicker} size="small">
            Load Template
          </Button>
          <Button variant="outlined" startIcon={<LibraryBooks />} onClick={openRepoDialog} size="small"
            sx={{ borderColor: '#24483E', color: '#24483E' }}>
            Save to Repo
          </Button>
          <Button variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
            onClick={handleSave} disabled={saving}
            sx={{ backgroundColor: theme.palette.primary.main }}>
            {isEdit || autoSavedId ? 'Save & Close' : 'Add Finding'}
          </Button>
        </Box>
      </Box>

      {/* Meta fields */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Finding Title *" value={form.title}
                onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                inputProps={{ style: { fontSize: 18, fontWeight: 600 } }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Pentest Type</InputLabel>
                <Select value={form.pentest_type} label="Pentest Type"
                  onChange={(e) => setForm(p => ({ ...p, pentest_type: e.target.value }))}>
                  <MenuItem value=""><em>Not set</em></MenuItem>
                  {PENTEST_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Level of Access</InputLabel>
                <Select value={form.level_of_access} label="Level of Access"
                  onChange={(e) => setForm(p => ({ ...p, level_of_access: e.target.value }))}>
                  <MenuItem value=""><em>Not set</em></MenuItem>
                  <MenuItem value="UNAUTHENTICATED">Unauthenticated</MenuItem>
                  <MenuItem value="AUTHENTICATED">Authenticated</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Severity *</InputLabel>
                <Select value={form.severity} label="Severity *"
                  onChange={(e) => setForm(p => ({ ...p, severity: e.target.value }))}>
                  {SEVERITIES.map(s => (
                    <MenuItem key={s} value={s}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: SEV_COLORS[s]?.text, flexShrink: 0 }} />
                        <span>{s.charAt(0) + s.slice(1).toLowerCase()}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={form.status} label="Status"
                  onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}>
                  {STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.is_key_finding}
                    onChange={(e) => setForm(p => ({ ...p, is_key_finding: e.target.checked }))}
                    color="warning"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>Key Finding</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Surfaces in executive summary
                    </Typography>
                  </Box>
                }
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="CVSS Score (0–10)" value={form.cvss_score}
                onChange={(e) => setForm(p => ({ ...p, cvss_score: e.target.value }))}
                type="number" inputProps={{ min: 0, max: 10, step: 0.1 }} />
            </Grid>

            {/* Risk matrix ratings */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Impact Rating</InputLabel>
                <Select
                  value={form.impact_rating}
                  label="Impact Rating"
                  onChange={(e) => {
                    const impact = e.target.value;
                    const derived = calcSeverity(form.likelihood_rating, impact);
                    setForm(p => ({ ...p, impact_rating: impact, ...(derived && { severity: derived }) }));
                  }}
                >
                  <MenuItem value=""><em>Not set</em></MenuItem>
                  {RATINGS.map(r => (
                    <MenuItem key={r} value={r}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, backgroundColor: SEV_COLORS[r]?.text }} />
                        <span>{r.charAt(0) + r.slice(1).toLowerCase()}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Likelihood Rating</InputLabel>
                <Select
                  value={form.likelihood_rating}
                  label="Likelihood Rating"
                  onChange={(e) => {
                    const likelihood = e.target.value;
                    const derived = calcSeverity(likelihood, form.impact_rating);
                    setForm(p => ({ ...p, likelihood_rating: likelihood, ...(derived && { severity: derived }) }));
                  }}
                >
                  <MenuItem value=""><em>Not set</em></MenuItem>
                  {RATINGS.map(r => (
                    <MenuItem key={r} value={r}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, backgroundColor: SEV_COLORS[r]?.text }} />
                        <span>{r.charAt(0) + r.slice(1).toLowerCase()}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="CWE ID" value={form.cwe_id}
                onChange={(e) => setForm(p => ({ ...p, cwe_id: e.target.value }))} placeholder="e.g. CWE-79" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="CVE ID" value={form.cve_id}
                onChange={(e) => setForm(p => ({ ...p, cve_id: e.target.value }))} placeholder="e.g. CVE-2024-1234" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="References / Links" value={form.references}
                onChange={(e) => setForm(p => ({ ...p, references: e.target.value }))} />
            </Grid>
          </Grid>

          {/* Severity badge */}
          <Box sx={{ mt: 2, px: 2, py: 1, borderRadius: 1, backgroundColor: sevColor.bg, display: 'inline-flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: sevColor.text }} />
            <Typography variant="body2" fontWeight={600} sx={{ color: sevColor.text }}>
              {form.severity.charAt(0) + form.severity.slice(1).toLowerCase()} severity
              {form.cvss_score ? ` · CVSS ${form.cvss_score}` : ''}
              {form.impact_rating && form.likelihood_rating
                ? ` · Risk matrix: ${form.likelihood_rating.charAt(0) + form.likelihood_rating.slice(1).toLowerCase()} likelihood × ${form.impact_rating.charAt(0) + form.impact_rating.slice(1).toLowerCase()} impact`
                : ''}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Affected Asset */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>Affected Asset</Typography>
            <Typography variant="caption" color="text.secondary">URLs, IP addresses, hostnames, or components affected by this finding</Typography>
          </Box>
          <TextField
            fullWidth
            multiline
            minRows={2}
            placeholder="e.g. https://example.com/login, 192.168.1.10, /api/v1/users"
            value={form.affected_asset}
            onChange={(e) => setForm(p => ({ ...p, affected_asset: e.target.value }))}
            sx={{ '& .MuiOutlinedInput-root': { fontFamily: 'monospace', fontSize: '0.875rem' } }}
          />
        </CardContent>
      </Card>

      {/* Rich text sections — one card each */}
      {dataLoaded && [
        { key: 'description',         label: 'Description',        hint: 'Executive summary of the finding' },
        { key: 'details',             label: 'Technical Details',  hint: 'How the vulnerability was discovered and how it works' },
        { key: 'impact',              label: 'Impact',             hint: 'Business or technical impact if exploited' },
        { key: 'likelihood',          label: 'Likelihood',         hint: 'Likelihood of exploitation in the real world' },
        { key: 'recommendations',     label: 'Recommendations',    hint: 'Remediation steps and mitigations' },
        { key: 'supporting_evidence', label: 'Supporting Evidence',hint: 'Logs, screenshots, or additional proof' },
      ].map(({ key, label, hint }) => (
        <Card key={key} sx={{ mb: 2 }}>
          <CardContent sx={{ pb: '16px !important' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>{label}</Typography>
                <Typography variant="caption" color="text.secondary">{hint}</Typography>
              </Box>
              <Tooltip title={`AI: improve ${label.toLowerCase()}`}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AutoAwesome sx={{ fontSize: '0.9rem !important' }} />}
                  onClick={() => openAiAssist(label, quillRefs.current[key], key)}
                  sx={{
                    flexShrink: 0, ml: 1, fontSize: '0.72rem', py: 0.3, px: 1,
                    borderColor: '#9c27b0', color: '#9c27b0',
                    '&:hover': { borderColor: '#7b1fa2', backgroundColor: '#f3e5f5' },
                  }}
                >
                  AI Assist
                </Button>
              </Tooltip>
            </Box>
            <QuillField
              label=""
              initialValue={initialRichValues.current[key]}
              onMount={(q) => {
                quillRefs.current[key] = q;
                q.on('text-change', (delta, old, source) => {
                  if (source === 'user') autoSaveCallback.current?.();
                });
              }}
            />
          </CardContent>
        </Card>
      ))}

      {/* Custom fields — one card each */}
      {dataLoaded && customFields.map((field, idx) => (
        <Card key={idx} sx={{ mb: 2 }}>
          <CardContent sx={{ pb: '16px !important' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>{field.name}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Tooltip title={`AI: improve ${field.name}`}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AutoAwesome sx={{ fontSize: '0.9rem !important' }} />}
                    onClick={() => openAiAssist(field.name, customQuillRefs.current[idx])}
                    sx={{
                      fontSize: '0.72rem', py: 0.3, px: 1,
                      borderColor: '#9c27b0', color: '#9c27b0',
                      '&:hover': { borderColor: '#7b1fa2', backgroundColor: '#f3e5f5' },
                    }}
                  >
                    AI Assist
                  </Button>
                </Tooltip>
                <IconButton size="small" color="error" onClick={() => removeCustomField(idx)}>
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <QuillField
              label=""
              initialValue={field.initialValue}
              onMount={(q) => {
                customQuillRefs.current[idx] = q;
                q.on('text-change', (delta, old, source) => {
                  if (source === 'user') autoSaveCallback.current?.();
                });
              }}
            />
          </CardContent>
        </Card>
      ))}

      {/* Bottom actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6 }}>
        <Button variant="outlined" startIcon={<Add />} onClick={() => setAddFieldDialog(true)}>
          Add Custom Field
        </Button>
        <Button variant="contained" size="large"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
          onClick={handleSave} disabled={saving}
          sx={{ backgroundColor: theme.palette.primary.main, px: 4 }}>
          {isEdit || autoSavedId ? 'Save & Close' : 'Add Finding to Report'}
        </Button>
      </Box>

      {/* ── AI Assist Dialog ── */}
      <Dialog open={aiDialog} onClose={() => !aiLoading && setAiDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <AutoAwesome sx={{ color: '#9c27b0' }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700}>AI Assist — {aiField?.label}</Typography>
            <Typography variant="caption" color="text.secondary">
              Powered by {process.env.REACT_APP_AI_PROVIDER === 'gemini' ? 'Google Gemini' : 'Ollama (local)'} · Data stays on your infrastructure
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {aiLoading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
              <CircularProgress sx={{ color: '#9c27b0' }} />
              <Typography color="text.secondary" variant="body2">Generating suggestion…</Typography>
            </Box>
          )}
          {aiError && !aiLoading && (
            <Alert severity="error" sx={{ mt: 1 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>AI unavailable</Typography>
              <Typography variant="body2">{aiError}</Typography>
              {aiError.includes('Ollama') && (
                <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: '#f5f5f5', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  1. docker compose up ollama -d<br />
                  2. docker exec ozireport-ollama ollama pull mistral
                </Box>
              )}
            </Alert>
          )}
          {aiResult && !aiLoading && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Suggested content
              </Typography>
              <Box
                sx={{
                  mt: 1, p: 2, borderRadius: 1.5,
                  border: '1px solid #ce93d8',
                  backgroundColor: '#fdf4ff',
                  fontSize: '0.9rem', lineHeight: 1.8, color: '#212121',
                  maxHeight: 360, overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {aiResultPlain}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Review the suggestion above. "Replace" clears the current field and inserts this. "Append" adds it below existing content.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setAiDialog(false)} disabled={aiLoading}>Discard</Button>
          {aiResult && !aiLoading && (
            <>
              <Button
                variant="outlined"
                onClick={() => applyAiResult('append')}
                sx={{ borderColor: '#9c27b0', color: '#9c27b0' }}
              >
                Append to field
              </Button>
              <Button
                variant="contained"
                onClick={() => applyAiResult('replace')}
                sx={{ backgroundColor: '#9c27b0', '&:hover': { backgroundColor: '#7b1fa2' } }}
              >
                Replace field
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Add custom field dialog */}
      <Dialog open={addFieldDialog} onClose={() => setAddFieldDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Custom Field</DialogTitle>
        <DialogContent>
          <TextField fullWidth autoFocus label="Field Name" value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomField()}
            margin="dense" placeholder="e.g. Proof of Concept, OWASP Category" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddFieldDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={addCustomField}
            sx={{ backgroundColor: theme.palette.primary.main }}>
            Add Field
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template picker dialog */}
      <Dialog open={tmplDialogOpen} onClose={() => setTmplDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Load from Finding Template</DialogTitle>
        <DialogContent sx={{ pt: 1, pb: 0 }}>
          <TextField
            fullWidth size="small" placeholder="Search title, tags, CWE…"
            value={tmplSearch} onChange={(e) => setTmplSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            sx={{ mb: 1 }}
          />
          <TextField
            select fullWidth size="small" label="Filter by folder" value={tmplFolder}
            onChange={e => setTmplFolder(e.target.value)}
            sx={{ mb: 1.5 }}
          >
            <MenuItem value="">All folders</MenuItem>
            <MenuItem value="__none__">— No folder —</MenuItem>
            {tmplFolders.map(f => (
              <MenuItem key={f.id} value={f.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: f.color || '#999', flexShrink: 0 }} />
                  {f.is_private ? '🔒 ' : ''}{f.name}
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                    {f.template_count} template{f.template_count !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </TextField>
          {tmplLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : filteredTmpls.length === 0 ? (
            <Alert severity="info" sx={{ my: 1 }}>No templates found. Add some in the Repository section.</Alert>
          ) : (
            <List dense disablePadding>
              {filteredTmpls.map((t) => (
                <ListItem key={t.id} disablePadding divider>
                  <ListItemButton onClick={() => applyTemplate(t)} sx={{ py: 1 }}>
                    <ListItemText
                      primary={t.title}
                      secondary={
                        <Box component="span" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                          {[t.default_severity, t.category_display, t.cwe_id].filter(Boolean).join(' · ')}
                          {t.folder_name && (
                            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, ml: 0.5 }}>
                              <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: t.folder_color || '#999', display: 'inline-block' }} />
                              <Box component="span" sx={{ fontSize: '0.7rem' }}>{t.folder_name}</Box>
                            </Box>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={t.default_severity} size="small"
                        sx={{ backgroundColor: { CRITICAL: '#d32f2f', HIGH: '#f57c00', MEDIUM: '#f9a825', LOW: '#388e3c', INFORMATIONAL: '#1976d2' }[t.default_severity] || '#999', color: '#fff', fontSize: '0.7rem' }}
                      />
                    </ListItemSecondaryAction>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTmplDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Save to Repository Dialog */}
      <Dialog open={repoDialogOpen} onClose={() => setRepoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Finding to Repository</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Template Title" value={repoForm.title}
            onChange={e => setRepoForm(p => ({ ...p, title: e.target.value }))}
            fullWidth size="small" required
          />
          <TextField
            label="Category" value={repoForm.category}
            onChange={e => setRepoForm(p => ({ ...p, category: e.target.value }))}
            select fullWidth size="small"
          >
            {[
              ['WEB','Web Application'],['NETWORK','Network'],['API','API'],['MOBILE','Mobile'],
              ['CLOUD','Cloud'],['AUTH','Authentication'],['ENCRYPTION','Encryption'],
              ['SESSION','Session'],['INPUT','Input Validation'],['ACCESS','Access Control'],
              ['CONFIG','Misconfiguration'],['LOGGING','Logging'],['OTHER','Other'],
            ].map(([v,l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
          </TextField>
          <TextField
            label="Tags (comma separated)" value={repoForm.tags}
            onChange={e => setRepoForm(p => ({ ...p, tags: e.target.value }))}
            fullWidth size="small" placeholder="e.g. injection, owasp, sql"
          />
          <TextField
            label="Folder (optional)" value={repoForm.folder}
            onChange={e => setRepoForm(p => ({ ...p, folder: e.target.value }))}
            select fullWidth size="small"
          >
            <MenuItem value="">— No folder —</MenuItem>
            {repoFolders.map(f => (
              <MenuItem key={f.id} value={f.id}>
                {f.is_private ? '🔒 ' : '📁 '}{f.name}
              </MenuItem>
            ))}
          </TextField>
          <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
            This will save the current finding content (description, details, impact, recommendations) as a reusable repository template.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRepoDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveToRepo} disabled={repoSaving}
            sx={{ bgcolor: '#24483E' }}>
            {repoSaving ? 'Saving…' : 'Save to Repository'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FindingEditor;
