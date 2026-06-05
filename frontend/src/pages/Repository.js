import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Grid, Card, CardContent, CardActions,
  Chip, TextField, InputAdornment, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Tab, Tabs, CircularProgress, Alert,
  Tooltip, Divider, MenuItem, List, ListItem, ListItemButton,
  ListItemText, ListItemIcon, Paper, Switch, FormControlLabel,
  Avatar, Collapse, Breadcrumbs, Link,
} from '@mui/material';
import {
  Search, Add, Edit, Delete, ContentCopy, Upload, Download,
  Star, StarBorder, Description, Article, ViewModule,
  FolderOpen, Folder as FolderIcon, Lock, LockOpen, ExpandMore,
  ExpandLess, Settings as SettingsIcon, NavigateNext,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import api from '../utils/api';

const SEV_COLOR = {
  CRITICAL: '#d32f2f', HIGH: '#f57c00', MEDIUM: '#f9a825',
  LOW: '#388e3c', INFORMATIONAL: '#1976d2',
};
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];
const CATEGORIES = [
  { value: '',           label: 'All Categories' },
  { value: 'WEB',        label: 'Web Application' },
  { value: 'MOBILE',     label: 'Mobile' },
  { value: 'NETWORK',    label: 'Network' },
  { value: 'API',        label: 'API' },
  { value: 'CLOUD',      label: 'Cloud' },
  { value: 'AUTH',       label: 'Authentication' },
  { value: 'ENCRYPTION', label: 'Encryption' },
  { value: 'SESSION',    label: 'Session' },
  { value: 'INPUT',      label: 'Input Validation' },
  { value: 'ACCESS',     label: 'Access Control' },
  { value: 'SOCIAL',     label: 'Social Engineering' },
  { value: 'PHYSICAL',   label: 'Physical' },
  { value: 'WIRELESS',   label: 'Wireless' },
  { value: 'CONFIG',     label: 'Misconfiguration' },
  { value: 'LOGGING',    label: 'Logging' },
  { value: 'OTHER',      label: 'Other' },
];
const EMPTY_FORM = {
  title: '', default_severity: 'MEDIUM', category: 'WEB',
  cwe_id: '', tags: '', folder: '',
  description: '', details: '', impact: '',
  likelihood: '', recommendations: '', supporting_evidence: '', references: '',
};
const EMPTY_FOLDER_FORM = { name: '', description: '', color: '#24483E', is_private: false, allowed_users: [], parent: null };
const FOLDER_COLORS = ['#24483E','#2980b9','#8e44ad','#c0392b','#d35400','#16a085','#7f8c8d','#e67e22'];

// ─── Leaf-folder sidebar ─────────────────────────────────────────────────────
function FolderSidebar({ folders, selectedFolder, onSelect, onCreateFolder, onEditFolder, onDeleteFolder, loading, allLabel }) {
  const theme = useTheme();
  const [expand, setExpand] = useState(true);
  return (
    <Paper sx={{ height: '100%', minHeight: 300 }}>
      <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary"
          sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 1 }}>Folders</Typography>
      </Box>
      <List dense disablePadding>
        <ListItemButton selected={selectedFolder === null} onClick={() => onSelect(null)}
          sx={{ mx: 0.5, my: 0.2, borderRadius: 1,
            '&.Mui-selected': { bgcolor: `${theme.palette.primary.main}18`, color: theme.palette.primary.main } }}>
          <ListItemIcon sx={{ minWidth: 32 }}><ViewModule fontSize="small" /></ListItemIcon>
          <ListItemText primary={<Typography variant="body2" fontWeight={selectedFolder === null ? 700 : 400}>{allLabel || 'All Templates'}</Typography>} />
        </ListItemButton>
        <Divider sx={{ my: 0.5 }} />
        <ListItem sx={{ py: 0.3 }}
          secondaryAction={<Tooltip title="New Folder"><IconButton size="small" onClick={onCreateFolder}><Add fontSize="small" /></IconButton></Tooltip>}>
          <ListItemButton onClick={() => setExpand(e => !e)} sx={{ p: 0, '&:hover': { bgcolor: 'transparent' } }}>
            <ListItemIcon sx={{ minWidth: 28 }}>{expand ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}</ListItemIcon>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Folders
            </Typography>
          </ListItemButton>
        </ListItem>
        <Collapse in={expand}>
          {loading ? <Box sx={{ textAlign: 'center', py: 1 }}><CircularProgress size={16} /></Box>
            : folders.length === 0
              ? <Typography variant="caption" color="text.secondary" sx={{ px: 2, display: 'block', pb: 1 }}>No folders yet</Typography>
              : folders.map(f => (
                <ListItemButton key={f.id} selected={selectedFolder === f.id} onClick={() => onSelect(f.id)}
                  sx={{ mx: 0.5, my: 0.2, borderRadius: 1, pr: 0.5,
                    '&.Mui-selected': { bgcolor: `${f.color || '#24483E'}18` } }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {f.is_private
                      ? <Lock fontSize="small" sx={{ color: f.color || '#24483E' }} />
                      : <FolderOpen fontSize="small" sx={{ color: f.color || '#24483E' }} />}
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography variant="body2" fontWeight={selectedFolder === f.id ? 700 : 400} noWrap
                      sx={{ color: selectedFolder === f.id ? f.color : 'inherit' }}>{f.name}</Typography>}
                    secondary={<Typography variant="caption" color="text.secondary">{f.template_count} templates</Typography>}
                  />
                  <Tooltip title="Settings">
                    <IconButton size="small" onClick={e => { e.stopPropagation(); onEditFolder(f); }}
                      sx={{ opacity: 0, '.MuiListItemButton-root:hover &': { opacity: 1 } }}>
                      <SettingsIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </ListItemButton>
              ))}
        </Collapse>
      </List>
    </Paper>
  );
}

// ─── Folder card grid (used at every level for sub-categories) ───────────────
function FolderCardGrid({ folders, allFolders, templates, onEnter, onCreateFolder, onEditFolder, createLabel, loading }) {
  const theme = useTheme();

  const getStats = (f) => {
    const childIds = allFolders.filter(c => c.parent === f.id).map(c => c.id);
    const templateCount = templates.filter(t => t.folder === f.id).length;
    const subCount = childIds.length;
    return { templateCount, subCount };
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;

  return (
    <Grid container spacing={2}>
      {folders.map(f => {
        const { templateCount, subCount } = getStats(f);
        return (
          <Grid item xs={12} sm={6} md={4} key={f.id}>
            <Card onClick={() => onEnter(f)} sx={{
              cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column',
              borderTop: `4px solid ${f.color || '#24483E'}`,
              transition: 'box-shadow 0.2s, transform 0.15s',
              '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
            }}>
              <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                  <FolderOpen sx={{ fontSize: 38, color: f.color || '#24483E', flexShrink: 0, mt: 0.3 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2, mb: 0.3 }}>{f.name}</Typography>
                    {f.is_private && (
                      <Chip icon={<Lock sx={{ fontSize: '0.7rem !important' }} />} label="Private" size="small"
                        sx={{ height: 16, fontSize: '0.6rem', mb: 0.5 }} />
                    )}
                  </Box>
                </Box>
                {f.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.82rem' }}>
                    {f.description}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {subCount > 0 && (
                    <Chip icon={<FolderIcon sx={{ fontSize: '0.75rem !important' }} />}
                      label={`${subCount} folder${subCount !== 1 ? 's' : ''}`} size="small"
                      sx={{ bgcolor: `${f.color || '#24483E'}15`, color: f.color || '#24483E', fontWeight: 600, fontSize: '0.7rem' }} />
                  )}
                  <Chip icon={<Description sx={{ fontSize: '0.75rem !important' }} />}
                    label={`${templateCount} template${templateCount !== 1 ? 's' : ''}`} size="small"
                    sx={{ bgcolor: `${f.color || '#24483E'}15`, color: f.color || '#24483E', fontWeight: 600, fontSize: '0.7rem' }} />
                </Box>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', pt: 0, borderTop: '1px solid', borderColor: 'divider' }}>
                <Tooltip title="Settings">
                  <IconButton size="small" onClick={e => { e.stopPropagation(); onEditFolder(f); }}>
                    <SettingsIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Grid>
        );
      })}

      {/* New folder card */}
      <Grid item xs={12} sm={6} md={4}>
        <Card onClick={onCreateFolder} sx={{
          cursor: 'pointer', height: '100%', minHeight: 120,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `2px dashed ${theme.palette.divider}`, boxShadow: 'none',
          transition: 'border-color 0.2s, background 0.2s',
          '&:hover': { borderColor: theme.palette.primary.main, bgcolor: `${theme.palette.primary.main}08` },
        }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Add sx={{ fontSize: 34, color: 'text.disabled', mb: 0.5 }} />
            <Typography variant="body1" color="text.secondary" fontWeight={600}>{createLabel || 'New Folder'}</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

// ─── Finding Templates Tab ───────────────────────────────────────────────────
const FindingTemplatesTab = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const [templates,      setTemplates]      = useState([]);
  const [allFolders,     setAllFolders]     = useState([]);
  const [members,        setMembers]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [search,         setSearch]         = useState('');
  const [filterSev,      setFilterSev]      = useState('');
  const [filterCat,      setFilterCat]      = useState('');

  // Navigation stack — each entry is a folder object
  // [] = root, [f1] = inside f1, [f1, f2] = inside f1 > f2, etc.
  const [folderStack, setFolderStack] = useState([]);
  // Which leaf-folder to filter templates by (null = all)
  const [selectedLeaf, setSelectedLeaf] = useState(null);

  // Template + folder dialogs
  const [dialogOpen,    setDialogOpen]    = useState(false);
  const [editTarget,    setEditTarget]    = useState(null);
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [saving,        setSaving]        = useState(false);
  const [folderDlg,     setFolderDlg]     = useState(false);
  const [folderEditDlg, setFolderEditDlg] = useState(null);
  const [folderForm,    setFolderForm]    = useState(EMPTY_FOLDER_FORM);
  const [folderSaving,  setFolderSaving]  = useState(false);
  const [moveDlg,       setMoveDlg]       = useState(null);
  const [moveFolder,    setMoveFolder]    = useState('');

  // Derived navigation state
  const currentFolder = folderStack.length > 0 ? folderStack[folderStack.length - 1] : null;
  const isRoot = folderStack.length === 0;

  // Direct children of the current location
  const currentChildren = allFolders.filter(f =>
    currentFolder ? f.parent === currentFolder.id : !f.parent
  );

  // Children that have sub-folders of their own → shown as cards
  const subCategories = currentChildren.filter(f => f.child_count > 0);
  // Children with no sub-folders → shown in sidebar
  const leafFolders = currentChildren.filter(f => f.child_count === 0);

  // Templates visible at this level (in leaf folders OR directly in currentFolder)
  const leafFolderIds = leafFolders.map(f => f.id);
  const contextTemplates = templates.filter(t =>
    currentFolder
      ? (selectedLeaf ? t.folder === selectedLeaf : leafFolderIds.includes(t.folder) || t.folder === currentFolder.id)
      : false
  );

  const filtered = contextTemplates.filter(t => {
    const q = search.toLowerCase();
    const tagsArr = Array.isArray(t.tags) ? t.tags : [];
    const matchSearch = !q || t.title.toLowerCase().includes(q) || tagsArr.join(' ').toLowerCase().includes(q) || (t.cwe_id || '').toLowerCase().includes(q);
    const matchSev = !filterSev || t.default_severity === filterSev;
    const matchCat = !filterCat || t.category === filterCat;
    return matchSearch && matchSev && matchCat;
  });

  const load = useCallback(async () => {
    try {
      const res = await api.get('/repository/templates/');
      setTemplates(res.data?.results ?? res.data);
    } catch { enqueueSnackbar('Failed to load finding templates', { variant: 'error' }); }
    finally { setLoading(false); }
  }, [enqueueSnackbar]);

  const loadFolders = useCallback(async () => {
    setFoldersLoading(true);
    try {
      const res = await api.get('/repository/folders/');
      setAllFolders(res.data?.results ?? res.data);
    } catch {} finally { setFoldersLoading(false); }
  }, []);

  const loadMembers = useCallback(async () => {
    try { const res = await api.get('/auth/users/'); setMembers(res.data?.results ?? res.data); } catch {}
  }, []);

  useEffect(() => { load(); loadFolders(); loadMembers(); }, [load, loadFolders, loadMembers]);

  // Sync folderStack with fresh allFolders data (names/colours may change after edit)
  useEffect(() => {
    if (allFolders.length === 0) return;
    setFolderStack(prev => prev.map(f => allFolders.find(a => a.id === f.id) || f));
  }, [allFolders]);

  // Navigation
  const pushFolder = (f) => { setFolderStack(prev => [...prev, f]); setSelectedLeaf(null); };
  const goToIndex  = (idx) => { setFolderStack(prev => prev.slice(0, idx + 1)); setSelectedLeaf(null); };
  const goToRoot   = () => { setFolderStack([]); setSelectedLeaf(null); };

  // Template CRUD
  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, folder: selectedLeaf || currentFolder?.id || '' });
    setDialogOpen(true);
  };
  const openEdit = (t) => {
    setEditTarget(t);
    setForm({ ...t, tags: Array.isArray(t.tags) ? t.tags.join(', ') : (t.tags || ''), folder: t.folder || '' });
    setDialogOpen(true);
  };
  const handleSave = async () => {
    if (!form.title.trim()) { enqueueSnackbar('Title is required', { variant: 'warning' }); return; }
    setSaving(true);
    const payload = { ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [], folder: form.folder || null };
    try {
      editTarget
        ? await api.patch(`/repository/templates/${editTarget.id}/`, payload)
        : await api.post('/repository/templates/', payload);
      enqueueSnackbar(editTarget ? 'Template updated' : 'Template created', { variant: 'success' });
      setDialogOpen(false); load(); loadFolders();
    } catch { enqueueSnackbar('Save failed', { variant: 'error' }); }
    finally { setSaving(false); }
  };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try { await api.delete(`/repository/templates/${id}/`); enqueueSnackbar('Deleted', { variant: 'success' }); load(); loadFolders(); }
    catch { enqueueSnackbar('Delete failed', { variant: 'error' }); }
  };
  const handleDuplicate = async (t) => {
    try { await api.post(`/repository/templates/${t.id}/duplicate/`); enqueueSnackbar(`"${t.title}" copied`, { variant: 'success' }); load(); }
    catch { enqueueSnackbar('Copy failed', { variant: 'error' }); }
  };
  const handleMove = async () => {
    try {
      await api.patch(`/repository/templates/${moveDlg.id}/`, { folder: moveFolder || null });
      enqueueSnackbar('Moved', { variant: 'success' }); setMoveDlg(null); load(); loadFolders();
    } catch { enqueueSnackbar('Move failed', { variant: 'error' }); }
  };

  // Folder CRUD
  const openCreateFolder = (parentId = null) => { setFolderForm({ ...EMPTY_FOLDER_FORM, parent: parentId }); setFolderDlg(true); };

  const handleCreateFolder = async () => {
    if (!folderForm.name.trim()) return;
    setFolderSaving(true);
    try {
      const res = await api.post('/repository/folders/', {
        name: folderForm.name, description: folderForm.description,
        color: folderForm.color, is_private: folderForm.is_private,
        parent: folderForm.parent || null,
      });
      if (folderForm.is_private && folderForm.allowed_users.length > 0) {
        await api.post(`/repository/folders/${res.data.id}/set_users/`, { user_ids: folderForm.allowed_users });
      }
      enqueueSnackbar('Folder created', { variant: 'success' });
      setFolderDlg(false); setFolderForm(EMPTY_FOLDER_FORM); loadFolders();
    } catch { enqueueSnackbar('Failed to create folder', { variant: 'error' }); }
    finally { setFolderSaving(false); }
  };

  const handleUpdateFolder = async () => {
    setFolderSaving(true);
    try {
      await api.patch(`/repository/folders/${folderEditDlg.id}/`, {
        name: folderForm.name, description: folderForm.description,
        color: folderForm.color, is_private: folderForm.is_private,
        parent: folderForm.parent || null,
      });
      await api.post(`/repository/folders/${folderEditDlg.id}/set_users/`, {
        user_ids: folderForm.is_private ? folderForm.allowed_users : [],
      });
      enqueueSnackbar('Folder updated', { variant: 'success' });
      setFolderEditDlg(null); loadFolders();
    } catch { enqueueSnackbar('Failed to update folder', { variant: 'error' }); }
    finally { setFolderSaving(false); }
  };

  const handleDeleteFolder = async (f) => {
    if (!window.confirm(`Delete "${f.name}"? Templates will become uncategorized.`)) return;
    try {
      await api.delete(`/repository/folders/${f.id}/`);
      enqueueSnackbar('Folder deleted', { variant: 'success' });
      if (selectedLeaf === f.id) setSelectedLeaf(null);
      // Pop any stack entries that were inside the deleted folder
      setFolderStack(prev => {
        const idx = prev.findIndex(s => s.id === f.id);
        return idx >= 0 ? prev.slice(0, idx) : prev;
      });
      loadFolders(); load();
    } catch { enqueueSnackbar('Failed to delete folder', { variant: 'error' }); }
  };

  const openEditFolder = (f) => {
    setFolderForm({
      name: f.name, description: f.description || '',
      color: f.color || '#24483E', is_private: f.is_private || false,
      allowed_users: (f.allowed_users_list || []).map(u => u.id),
      parent: f.parent || null,
    });
    setFolderEditDlg(f);
  };

  // Folder options for template dropdown — leaf folders in current context
  const templateFolderOptions = currentFolder
    ? allFolders.filter(f => f.parent === currentFolder.id && f.child_count === 0)
    : allFolders.filter(f => !f.parent);

  const TemplateCard = ({ t }) => (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', '&:hover': { boxShadow: 3 } }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Chip label={t.default_severity} size="small"
            sx={{ backgroundColor: SEV_COLOR[t.default_severity] || '#999', color: '#fff', fontWeight: 600 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {t.folder_name && (
              <Chip label={t.folder_name} size="small"
                sx={{ fontSize: '0.6rem', height: 16, bgcolor: `${t.folder_color || '#24483E'}20`, color: t.folder_color || '#24483E' }} />
            )}
            <Typography variant="caption" color="text.secondary">{t.usage_count} uses</Typography>
          </Box>
        </Box>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5, fontSize: '0.9rem' }}>{t.title}</Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
          {t.category_display && <Chip label={t.category_display} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />}
          {t.cwe_id && <Chip label={t.cwe_id} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />}
          {t.is_global && <Chip label="Global" size="small" color="info" sx={{ fontSize: '0.65rem', height: 18 }} />}
        </Box>
      </CardContent>
      <CardActions sx={{ pt: 0, gap: 0.3 }}>
        <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(t)}><Edit fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Copy"><IconButton size="small" onClick={() => handleDuplicate(t)}><ContentCopy fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Move to folder">
          <IconButton size="small" onClick={() => { setMoveDlg(t); setMoveFolder(t.folder || ''); }}>
            <FolderIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDelete(t.id)}><Delete fontSize="small" /></IconButton></Tooltip>
      </CardActions>
    </Card>
  );

  return (
    <Box>
      {/* ── Breadcrumb (hidden at root) ── */}
      {!isRoot && (
        <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 2 }}>
          <Link component="button" underline="hover" color="inherit" variant="body2"
            onClick={goToRoot} sx={{ cursor: 'pointer' }}>
            Repository
          </Link>
          {folderStack.map((f, idx) => {
            const isLast = idx === folderStack.length - 1;
            return isLast ? (
              <Box key={f.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FolderOpen sx={{ fontSize: 16, color: f.color || '#24483E' }} />
                <Typography variant="body2" fontWeight={700} sx={{ color: f.color || '#24483E' }}>{f.name}</Typography>
              </Box>
            ) : (
              <Link key={f.id} component="button" underline="hover" color="inherit" variant="body2"
                onClick={() => goToIndex(idx)} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FolderOpen sx={{ fontSize: 14, color: f.color || '#24483E' }} />
                {f.name}
              </Link>
            );
          })}
        </Breadcrumbs>
      )}

      {/* ── ROOT VIEW ── */}
      {isRoot && (
        <>
          {(foldersLoading && allFolders.length === 0) ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
          ) : (
            <FolderCardGrid
              folders={currentChildren}
              allFolders={allFolders}
              templates={templates}
              onEnter={pushFolder}
              onCreateFolder={() => openCreateFolder(null)}
              onEditFolder={openEditFolder}
              createLabel="New Category"
              loading={false}
            />
          )}
          {currentChildren.length === 0 && !foldersLoading && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <FolderIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>No categories yet</Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
                Create your first top-level category to organise your finding templates
              </Typography>
              <Button variant="contained" startIcon={<Add />} onClick={() => openCreateFolder(null)}>
                New Category
              </Button>
            </Box>
          )}
        </>
      )}

      {/* ── INSIDE A FOLDER ── */}
      {!isRoot && (
        <Box>
          {/* Sub-categories as cards (folders with children) */}
          {subCategories.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary"
                  sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 1 }}>
                  Sub-categories
                </Typography>
                <Button size="small" startIcon={<Add />}
                  onClick={() => openCreateFolder(currentFolder.id)}
                  sx={{ fontSize: '0.72rem' }}>
                  New Sub-category
                </Button>
              </Box>
              <FolderCardGrid
                folders={subCategories}
                allFolders={allFolders}
                templates={templates}
                onEnter={pushFolder}
                onCreateFolder={() => openCreateFolder(currentFolder.id)}
                onEditFolder={openEditFolder}
                createLabel="New Sub-category"
                loading={false}
              />
            </Box>
          )}

          {/* Leaf folders + templates */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Sidebar — only shown if there are leaf folders or there are no sub-categories (so something is visible) */}
            <Box sx={{ width: 220, flexShrink: 0 }}>
              <FolderSidebar
                folders={leafFolders}
                selectedFolder={selectedLeaf}
                onSelect={setSelectedLeaf}
                onCreateFolder={() => openCreateFolder(currentFolder.id)}
                onEditFolder={openEditFolder}
                onDeleteFolder={handleDeleteFolder}
                loading={foldersLoading}
                allLabel={`All in ${currentFolder?.name}`}
              />
            </Box>

            {/* Template content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* Controls */}
              <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                <TextField size="small" placeholder="Search title, tags, CWE…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                  sx={{ flexGrow: 1, minWidth: 200 }} />
                <TextField size="small" select value={filterSev} onChange={e => setFilterSev(e.target.value)} sx={{ width: 150 }}>
                  <MenuItem value="">All Severities</MenuItem>
                  {SEVERITIES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
                <TextField size="small" select value={filterCat} onChange={e => setFilterCat(e.target.value)} sx={{ width: 170 }}>
                  {CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                </TextField>
                <Button variant="contained" startIcon={<Add />} onClick={openCreate}
                  sx={{ backgroundColor: theme.palette.primary.main, whiteSpace: 'nowrap' }}>
                  New Template
                </Button>
              </Box>

              {selectedLeaf !== null && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  {(() => { const f = leafFolders.find(x => x.id === selectedLeaf); return f ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FolderOpen sx={{ fontSize: 16, color: f.color }} />
                      <Typography variant="body2" color="text.secondary">Showing: <strong style={{ color: f.color }}>{f.name}</strong></Typography>
                    </Box>
                  ) : null; })()}
                  <Chip label="Clear" size="small" onClick={() => setSelectedLeaf(null)} sx={{ height: 18, fontSize: '0.65rem' }} />
                </Box>
              )}

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
              ) : leafFolders.length === 0 && subCategories.length > 0 ? (
                <Alert severity="info">Navigate into a sub-category above to see templates, or create a folder here to add templates directly.</Alert>
              ) : filtered.length === 0 ? (
                <Alert severity="info">
                  No templates found. {selectedLeaf !== null ? 'This folder is empty. ' : ''}
                  {leafFolders.length === 0 ? 'Create a folder first, then add templates to it.' : 'Create one to get started.'}
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {filtered.map(t => (
                    <Grid item xs={12} md={6} lg={4} key={t.id}>
                      <TemplateCard t={t} />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Box>

          {/* Add sub-category button when none exist yet */}
          {subCategories.length === 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button size="small" startIcon={<Add />} variant="outlined"
                onClick={() => openCreateFolder(currentFolder.id)}>
                New Sub-category
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* ── Create / Edit Template Dialog ── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle>{editTarget ? 'Edit Finding Template' : 'New Finding Template'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth label="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Grid>
            <Grid item xs={6}>
              <TextField fullWidth select label="Default Severity" value={form.default_severity} onChange={e => setForm({ ...form, default_severity: e.target.value })}>
                {SEVERITIES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth select label="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.filter(c => c.value).map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}><TextField fullWidth label="CWE ID" placeholder="e.g. CWE-79" value={form.cwe_id} onChange={e => setForm({ ...form, cwe_id: e.target.value })} /></Grid>
            <Grid item xs={6}>
              <TextField fullWidth select label="Folder" value={form.folder} onChange={e => setForm({ ...form, folder: e.target.value })}>
                <MenuItem value="">— None (Uncategorized) —</MenuItem>
                {templateFolderOptions.map(f => <MenuItem key={f.id} value={f.id}>{f.is_private ? '🔒 ' : '📁 '}{f.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}><TextField fullWidth label="Tags (comma separated)" placeholder="injection, owasp, database" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></Grid>
            <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Content</Typography></Divider></Grid>
            {[
              ['description', 'Description (executive summary)', 3],
              ['details', 'Technical Details', 4],
              ['impact', 'Impact', 3],
              ['likelihood', 'Likelihood', 2],
              ['recommendations', 'Recommendations', 4],
              ['supporting_evidence', 'Supporting Evidence', 2],
              ['references', 'References', 2],
            ].map(([field, label, rows]) => (
              <Grid item xs={12} key={field}>
                <TextField fullWidth multiline rows={rows} label={label}
                  value={form[field] || ''} onChange={e => setForm({ ...form, [field]: e.target.value })} />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ backgroundColor: theme.palette.primary.main }}>
            {saving ? 'Saving…' : editTarget ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Create Folder Dialog ── */}
      <Dialog open={folderDlg} onClose={() => setFolderDlg(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{folderForm.parent ? 'New Folder' : 'New Category'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label={folderForm.parent ? 'Folder Name *' : 'Category Name *'} value={folderForm.name}
            onChange={e => setFolderForm(p => ({ ...p, name: e.target.value }))} fullWidth size="small" />
          <TextField label="Description" value={folderForm.description}
            onChange={e => setFolderForm(p => ({ ...p, description: e.target.value }))} fullWidth size="small" multiline rows={2} />
          <Box>
            <Typography variant="caption" color="text.secondary">Colour</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
              {FOLDER_COLORS.map(c => (
                <Box key={c} onClick={() => setFolderForm(p => ({ ...p, color: c }))}
                  sx={{ width: 28, height: 28, bgcolor: c, borderRadius: '50%', cursor: 'pointer',
                    border: folderForm.color === c ? '3px solid #000' : '2px solid transparent', transition: 'border 0.15s' }} />
              ))}
            </Box>
          </Box>
          <FormControlLabel
            control={<Switch checked={folderForm.is_private} onChange={e => setFolderForm(p => ({ ...p, is_private: e.target.checked }))} />}
            label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {folderForm.is_private ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}
              <Typography variant="body2">{folderForm.is_private ? 'Private' : 'Shared with team'}</Typography>
            </Box>}
          />
          {folderForm.is_private && (
            <TextField select fullWidth size="small" label="Allowed Users"
              SelectProps={{ multiple: true, renderValue: sel => `${sel.length} user(s) selected` }}
              value={folderForm.allowed_users} onChange={e => setFolderForm(p => ({ ...p, allowed_users: e.target.value }))}>
              {members.filter(m => m.role !== 'CLIENT').map(m => (
                <MenuItem key={m.id} value={m.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 22, height: 22, fontSize: '0.65rem', bgcolor: '#24483E' }}>{m.first_name?.[0]}{m.last_name?.[0]}</Avatar>
                    {m.first_name} {m.last_name} <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>({m.role})</Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFolderDlg(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateFolder} disabled={folderSaving || !folderForm.name.trim()}
            sx={{ bgcolor: folderForm.color }}>
            {folderSaving ? 'Creating…' : folderForm.parent ? 'Create Folder' : 'Create Category'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Folder Dialog ── */}
      <Dialog open={!!folderEditDlg} onClose={() => setFolderEditDlg(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Folder Settings</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="Name" value={folderForm.name} onChange={e => setFolderForm(p => ({ ...p, name: e.target.value }))} fullWidth size="small" />
          <TextField label="Description" value={folderForm.description} onChange={e => setFolderForm(p => ({ ...p, description: e.target.value }))} fullWidth size="small" multiline rows={2} />
          <Box>
            <Typography variant="caption" color="text.secondary">Colour</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
              {FOLDER_COLORS.map(c => (
                <Box key={c} onClick={() => setFolderForm(p => ({ ...p, color: c }))}
                  sx={{ width: 28, height: 28, bgcolor: c, borderRadius: '50%', cursor: 'pointer',
                    border: folderForm.color === c ? '3px solid #000' : '2px solid transparent' }} />
              ))}
            </Box>
          </Box>
          <TextField select fullWidth size="small" label="Parent Category"
            value={folderForm.parent || ''}
            onChange={e => setFolderForm(p => ({ ...p, parent: e.target.value || null }))}
            helperText="Change parent to reorganise this folder">
            <MenuItem value="">— Top-level category —</MenuItem>
            {allFolders.filter(f => f.id !== folderEditDlg?.id).map(f => (
              <MenuItem key={f.id} value={f.id}>
                {'  '.repeat(f.parent ? 1 : 0)}{f.parent ? '↳ ' : ''}{f.name}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={<Switch checked={folderForm.is_private} onChange={e => setFolderForm(p => ({ ...p, is_private: e.target.checked }))} />}
            label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {folderForm.is_private ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}
              <Typography variant="body2">{folderForm.is_private ? 'Private' : 'Shared with team'}</Typography>
            </Box>}
          />
          {folderForm.is_private && (
            <TextField select fullWidth size="small" label="Allowed Users"
              SelectProps={{ multiple: true, renderValue: sel => `${sel.length} user(s) selected` }}
              value={folderForm.allowed_users} onChange={e => setFolderForm(p => ({ ...p, allowed_users: e.target.value }))}>
              {members.filter(m => m.role !== 'CLIENT').map(m => (
                <MenuItem key={m.id} value={m.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 22, height: 22, fontSize: '0.65rem', bgcolor: '#24483E' }}>{m.first_name?.[0]}{m.last_name?.[0]}</Avatar>
                    {m.first_name} {m.last_name}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          <Button color="error" size="small" onClick={() => { setFolderEditDlg(null); handleDeleteFolder(folderEditDlg); }}>Delete</Button>
          <Box>
            <Button onClick={() => setFolderEditDlg(null)}>Cancel</Button>
            <Button variant="contained" onClick={handleUpdateFolder} disabled={folderSaving} sx={{ bgcolor: folderForm.color, ml: 1 }}>
              {folderSaving ? 'Saving…' : 'Save'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* ── Move to Folder Dialog ── */}
      <Dialog open={!!moveDlg} onClose={() => setMoveDlg(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Move to Folder</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>Move <strong>"{moveDlg?.title}"</strong> to:</Typography>
          <TextField select fullWidth size="small" label="Folder" value={moveFolder} onChange={e => setMoveFolder(e.target.value)}>
            <MenuItem value="">— Uncategorized —</MenuItem>
            {allFolders.filter(f => f.child_count === 0).map(f => <MenuItem key={f.id} value={f.id}>{f.is_private ? '🔒 ' : '📁 '}{f.name}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveDlg(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleMove} sx={{ bgcolor: theme.palette.primary.main }}>Move</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ─── Report Templates Tab ────────────────────────────────────────────────────
const ReportTemplatesTab = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm]           = useState({ name: '', description: '', file: null });
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async () => {
    try { const res = await api.get('/reports/templates/'); setTemplates(res.data?.results ?? res.data); }
    catch { enqueueSnackbar('Failed to load report templates', { variant: 'error' }); }
    finally { setLoading(false); }
  }, [enqueueSnackbar]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name.trim()) { enqueueSnackbar('Name is required', { variant: 'warning' }); return; }
    if (!form.file) { enqueueSnackbar('Please select a .docx file', { variant: 'warning' }); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name); fd.append('description', form.description); fd.append('docx_file', form.file);
      await api.post('/reports/templates/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      enqueueSnackbar('Template uploaded', { variant: 'success' });
      setDialogOpen(false); setForm({ name: '', description: '', file: null }); load();
    } catch { enqueueSnackbar('Upload failed', { variant: 'error' }); }
    finally { setSaving(false); }
  };

  const handleSetDefault = async (id) => {
    try { await api.post(`/reports/templates/${id}/set_default/`); enqueueSnackbar('Set as default', { variant: 'success' }); load(); }
    catch { enqueueSnackbar('Failed', { variant: 'error' }); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try { await api.delete(`/reports/templates/${id}/`); enqueueSnackbar('Deleted', { variant: 'success' }); load(); }
    catch { enqueueSnackbar('Delete failed', { variant: 'error' }); }
  };

  const handleDownload = async (template) => {
    try {
      const resp = await api.get(`/reports/templates/${template.id}/download_docx/`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      const cd = resp.headers['content-disposition'] || '';
      const match = cd.match(/filename="?([^"]+)"?/);
      link.href = url;
      link.download = match ? match[1] : `${template.name || 'report_template'}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let msg = 'Download failed';
      const blob = err?.response?.data;
      if (blob instanceof Blob) {
        try {
          const text = await blob.text();
          const parsed = JSON.parse(text);
          if (parsed?.error) msg = parsed.error;
        } catch {}
      } else if (err?.response?.data?.error) {
        msg = err.response.data.error;
      }
      enqueueSnackbar(msg, { variant: 'error' });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button variant="contained" startIcon={<Upload />} onClick={() => setDialogOpen(true)} sx={{ backgroundColor: theme.palette.primary.main }}>
          Upload Template
        </Button>
      </Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        Upload a <strong>.docx file</strong>. Use <code>{'<<placeholder>>'}</code> markers —
        e.g. <code>{'<<client_name>>'}</code>, <code>{'<<report_title>>'}</code>, <code>{'<<today>>'}</code>.
      </Alert>
      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        : templates.length === 0 ? <Alert severity="info">No report templates uploaded yet.</Alert>
        : (
          <Grid container spacing={2}>
            {templates.map(t => (
              <Grid item xs={12} md={6} key={t.id}>
                <Card sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2 }}>
                  <Article sx={{ fontSize: 40, color: theme.palette.primary.main, flexShrink: 0 }} />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography fontWeight={600} noWrap>{t.name}</Typography>
                      {t.is_default && <Chip label="Default" size="small" color="success" />}
                      {t.is_global && <Chip label="Global" size="small" color="info" />}
                    </Box>
                    {t.description && <Typography variant="body2" color="text.secondary" noWrap>{t.description}</Typography>}
                    <Typography variant="caption" color="text.secondary">
                      {t.docx_file ? 'Has .docx file' : 'No file'} · {new Date(t.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                    {t.docx_url && (
                      <Tooltip title="Download"><IconButton size="small" onClick={() => handleDownload(t)}><Download fontSize="small" /></IconButton></Tooltip>
                    )}
                    <Tooltip title={t.is_default ? 'Already default' : 'Set as default'}>
                      <span>
                        <IconButton size="small" onClick={() => handleSetDefault(t.id)} disabled={t.is_default}>
                          {t.is_default ? <Star fontSize="small" color="warning" /> : <StarBorder fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDelete(t.id)}><Delete fontSize="small" /></IconButton></Tooltip>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Report Template</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField fullWidth label="Template Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Grid>
            <Grid item xs={12}>
              <Button variant="outlined" component="label" startIcon={<Upload />} fullWidth>
                {form.file ? form.file.name : 'Choose .docx file'}
                <input type="file" hidden accept=".docx" onChange={e => setForm({ ...form, file: e.target.files[0] || null })} />
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ backgroundColor: theme.palette.primary.main }}>
            {saving ? 'Uploading…' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ─── Main Repository page ────────────────────────────────────────────────────
const Repository = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Repository</Typography>
        <Typography variant="body1" color="text.secondary">Manage reusable finding templates and Word report templates</Typography>
      </Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Finding Templates" icon={<ContentCopy fontSize="small" />} iconPosition="start" />
        <Tab label="Report Templates" icon={<Description fontSize="small" />} iconPosition="start" />
      </Tabs>
      {tab === 0 && <FindingTemplatesTab />}
      {tab === 1 && <ReportTemplatesTab />}
    </Box>
  );
};

export default Repository;
