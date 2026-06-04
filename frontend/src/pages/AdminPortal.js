import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Tabs, Tab, Chip, CircularProgress, Alert,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Drawer, Stepper, Step, StepLabel,
  Button, TextField, MenuItem, Select, InputLabel, FormControl,
  IconButton, Tooltip, Avatar, Divider, Grid, Card, CardContent,
  Switch, FormControlLabel, List, ListItem, ListItemText, ListItemIcon,
  Badge, Accordion, AccordionSummary, AccordionDetails, Slider, Menu,
} from '@mui/material';
import {
  AdminPanelSettings, People, Extension, Email, Security,
  Key, Edit, Delete, Add, Check, Close, Refresh, Shield,
  VpnKey, VerifiedUser, Business, LockPerson, Notifications,
  Receipt, Circle, ExpandMore, ManageAccounts, Palette, Upload,
  RestartAlt, MoreVert, PhonelinkLock, LockReset, Block, Password,
  Search, ArrowBack,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { useAuthStore } from '../store/authStore';
import { useBrandingStore } from '../store/brandingStore';
import api from '../utils/api';
import TenanciesAdmin from './TenanciesAdmin';

const ROLE_CHOICES = [
  { value: 'SUPERADMIN',      label: 'Super Admin' },
  { value: 'ADMIN',           label: 'Admin' },
  { value: 'PENTESTER',       label: 'Pentester' },
  { value: 'PROJECT_MANAGER', label: 'Project Manager' },
  { value: 'GRC_CONSULTANT',  label: 'GRC Consultant' },
  { value: 'CLIENT',          label: 'Client' },
];

const ROLE_COLORS = {
  SUPERADMIN:      '#7b1fa2',
  ADMIN:           '#1565c0',
  PENTESTER:       '#2e7d32',
  PROJECT_MANAGER: '#e65100',
  GRC_CONSULTANT:  '#7c3aed',
  CLIENT:          '#37474f',
};

function TabPanel({ value, index, children }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

// ── Permission definitions ────────────────────────────────────────────────────
const PERMISSION_GROUPS = [
  {
    group: 'Users & Access',
    perms: [
      { key: 'manage_users',   label: 'Manage Users',         desc: 'Create, edit and delete user accounts' },
      { key: 'manage_org',     label: 'Manage Organisations', desc: 'Create and configure organisations' },
      { key: 'manage_clients', label: 'Manage Clients',       desc: 'Create and manage client accounts' },
      { key: 'view_clients',   label: 'View Clients',         desc: 'Read-only access to client information' },
    ],
  },
  {
    group: 'Engagements',
    perms: [
      { key: 'manage_engagements', label: 'Manage Engagements', desc: 'Create, edit and configure engagements' },
      { key: 'view_engagements',   label: 'View Engagements',   desc: 'Read-only access to engagements' },
      { key: 'close_engagements',  label: 'Close Engagements',  desc: 'Archive and close completed engagements' },
    ],
  },
  {
    group: 'Findings',
    perms: [
      { key: 'manage_findings',      label: 'Manage Findings',       desc: 'Create, edit and delete findings' },
      { key: 'view_findings',        label: 'View All Findings',     desc: 'Read all findings across engagements' },
      { key: 'view_own_findings',    label: 'View Own Findings',     desc: 'Read only findings assigned to this user' },
      { key: 'comment_findings',     label: 'Comment on Findings',   desc: 'Add comments and internal notes' },
      { key: 'change_finding_status',label: 'Change Finding Status', desc: 'Move findings between draft / review / published states' },
      { key: 'publish_findings',     label: 'Publish Findings',      desc: 'Approve and publish findings for client delivery' },
    ],
  },
  {
    group: 'Reports',
    perms: [
      { key: 'manage_reports',  label: 'Manage Reports',  desc: 'Create, edit and delete reports' },
      { key: 'view_reports',    label: 'View Reports',    desc: 'Read and download reports' },
      { key: 'export_reports',  label: 'Export Reports',  desc: 'Export reports to DOCX / PDF' },
      { key: 'approve_reports', label: 'Approve Reports', desc: 'Sign off and approve reports before client delivery' },
      { key: 'deliver_reports', label: 'Deliver Reports', desc: 'Mark reports as delivered to clients' },
    ],
  },
  {
    group: 'Assessments',
    perms: [
      { key: 'manage_assessments',  label: 'Manage Assessments',  desc: 'Create, edit and delete assessments' },
      { key: 'view_assessments',    label: 'View Assessments',    desc: 'Read-only access to assessments and results' },
      { key: 'conduct_assessments', label: 'Conduct Assessments', desc: 'Fill out and submit assessment responses' },
      { key: 'export_assessments',  label: 'Export Assessments',  desc: 'Export assessment results and reports' },
    ],
  },
  {
    group: 'Repository & Templates',
    perms: [
      { key: 'manage_repository',        label: 'Manage Repository',       desc: 'Add, edit and delete finding templates' },
      { key: 'view_repository',          label: 'View Repository',         desc: 'Browse and use finding templates' },
      { key: 'manage_repository_folders',label: 'Manage Folders',          desc: 'Create, rename and delete repository folders' },
      { key: 'import_export_repository', label: 'Import / Export Repo',    desc: 'Bulk import or export repository items' },
      { key: 'manage_templates',         label: 'Manage Report Templates', desc: 'Upload and configure DOCX report templates' },
    ],
  },
  {
    group: 'Platform',
    perms: [
      { key: 'manage_calendar',     label: 'Manage Calendar',     desc: 'Create and edit calendar events' },
      { key: 'view_calendar',       label: 'View Calendar',       desc: 'Read-only access to the calendar' },
      { key: 'admin_portal',        label: 'Admin Portal Access', desc: 'Access platform administration settings' },
      { key: 'manage_integrations', label: 'Manage Integrations', desc: 'Configure SSO and third-party integrations' },
      { key: 'view_audit_log',      label: 'View Audit Log',      desc: 'Access system audit logs and activity history' },
    ],
  },
];

const ALL_PERMS = PERMISSION_GROUPS.flatMap(g => g.perms.map(p => p.key));

const SYSTEM_ROLE_PERMS = {
  SUPERADMIN: ALL_PERMS,
  ADMIN: [
    'manage_users','manage_org','manage_clients','view_clients',
    'manage_engagements','view_engagements','close_engagements',
    'manage_findings','view_findings','comment_findings','change_finding_status','publish_findings',
    'manage_reports','view_reports','export_reports','approve_reports','deliver_reports',
    'manage_assessments','view_assessments','conduct_assessments','export_assessments',
    'manage_repository','view_repository','manage_repository_folders','import_export_repository','manage_templates',
    'manage_calendar','view_calendar','admin_portal','manage_integrations','view_audit_log',
  ],
  PENTESTER: [
    'view_engagements',
    'manage_findings','view_findings','comment_findings','change_finding_status',
    'view_reports','export_reports',
    'manage_assessments','view_assessments','conduct_assessments',
    'manage_repository','view_repository','manage_repository_folders',
    'manage_calendar','view_calendar',
  ],
  PROJECT_MANAGER: [
    'manage_engagements','view_engagements','close_engagements',
    'view_findings','comment_findings','change_finding_status',
    'manage_reports','view_reports','export_reports','approve_reports','deliver_reports',
    'manage_assessments','view_assessments','export_assessments',
    'view_repository',
    'manage_calendar','view_calendar',
  ],
  GRC_CONSULTANT: [
    'view_engagements',
    'manage_assessments','view_assessments','conduct_assessments','export_assessments',
    'view_repository','manage_repository_folders',
    'manage_calendar','view_calendar',
  ],
  CLIENT: [
    'view_own_findings','comment_findings',
    'view_reports',
    'view_assessments',
    'view_calendar',
  ],
};

// ── RBAC Tab ─────────────────────────────────────────────────────────────────
function RBACTab() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const { user: me } = useAuthStore();

  // Users state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', first_name: '', last_name: '', role: 'PENTESTER' });
  const [inviting, setInviting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Custom roles state
  const [customRoles, setCustomRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [roleDialog, setRoleDialog] = useState(false);
  const [roleForm, setRoleForm] = useState({ id: null, name: '', description: '', permissions: [] });
  const [roleSaving, setRoleSaving] = useState(false);
  const [deleteRoleConfirm, setDeleteRoleConfirm] = useState(null);

  // User action menu
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuUser, setMenuUser]     = useState(null);

  // Set password dialog
  const [setPwdUser, setSetPwdUser]   = useState(null);
  const [newPwd, setNewPwd]           = useState('');
  const [newPwdConfirm, setNewPwdConfirm] = useState('');
  const [pwdSaving, setPwdSaving]     = useState(false);

  // System roles edit state
  const [sysRolePerms, setSysRolePerms] = useState({ ...SYSTEM_ROLE_PERMS });
  const [editSysRole, setEditSysRole] = useState(null); // { value, label, permissions }
  const [sysRoleSaving, setSysRoleSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await api.get('/auth/users/');
      setUsers(res.data.results || res.data);
    } catch { enqueueSnackbar('Failed to load users', { variant: 'error' }); }
    setUsersLoading(false);
  }, [enqueueSnackbar]);

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const res = await api.get('/auth/roles/');
      setCustomRoles(res.data.results || res.data);
    } catch { setCustomRoles([]); }
    setRolesLoading(false);
  }, []);

  useEffect(() => { loadUsers(); loadRoles(); }, [loadUsers, loadRoles]);

  const handleSaveUserRole = async () => {
    setSaving(true);
    try {
      await api.patch(`/auth/users/${editUser.id}/`, { role: editRole });
      enqueueSnackbar('Role updated', { variant: 'success' });
      setEditUser(null);
      loadUsers();
    } catch { enqueueSnackbar('Failed to update role', { variant: 'error' }); }
    setSaving(false);
  };

  const handleInvite = async () => {
    if (!inviteForm.email) { enqueueSnackbar('Email is required', { variant: 'warning' }); return; }
    setInviting(true);
    try {
      await api.post('/auth/register/', inviteForm);
      enqueueSnackbar('User created — activation email sent', { variant: 'success' });
      setInviteDialog(false);
      setInviteForm({ email: '', first_name: '', last_name: '', role: 'PENTESTER' });
      loadUsers();
    } catch (err) {
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Failed to create user';
      enqueueSnackbar(msg, { variant: 'error' });
    }
    setInviting(false);
  };

  const handleDeleteUser = async () => {
    try {
      await api.delete(`/auth/users/${deleteConfirm.id}/`);
      enqueueSnackbar('User removed', { variant: 'success' });
      setDeleteConfirm(null);
      loadUsers();
    } catch { enqueueSnackbar('Failed to remove user', { variant: 'error' }); }
  };

  const openMenu = (e, u) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); setMenuUser(u); };
  const closeMenu = () => { setMenuAnchor(null); setMenuUser(null); };

  const handleToggleFlag = async (field, label) => {
    const u = menuUser;
    closeMenu();
    try {
      const current = u[field];
      await api.patch(`/auth/users/${u.id}/`, { [field]: !current });
      enqueueSnackbar(`${label} ${!current ? 'enabled' : 'disabled'}`, { variant: 'success' });
      loadUsers();
    } catch { enqueueSnackbar(`Failed to update ${label}`, { variant: 'error' }); }
  };

  const handleSetPassword = async () => {
    if (!newPwd) { enqueueSnackbar('Password is required', { variant: 'warning' }); return; }
    if (newPwd !== newPwdConfirm) { enqueueSnackbar('Passwords do not match', { variant: 'warning' }); return; }
    setPwdSaving(true);
    try {
      await api.patch(`/auth/users/${setPwdUser.id}/`, { password: newPwd });
      enqueueSnackbar('Password updated', { variant: 'success' });
      setSetPwdUser(null); setNewPwd(''); setNewPwdConfirm('');
    } catch { enqueueSnackbar('Failed to set password', { variant: 'error' }); }
    setPwdSaving(false);
  };

  const openNewRole = () => setRoleForm({ id: null, name: '', description: '', permissions: [] }) || setRoleDialog(true);
  const openEditRole = (r) => { setRoleForm({ id: r.id, name: r.name, description: r.description, permissions: [...(r.permissions || [])] }); setRoleDialog(true); };

  const togglePerm = (key) => setRoleForm(prev => ({
    ...prev,
    permissions: prev.permissions.includes(key)
      ? prev.permissions.filter(p => p !== key)
      : [...prev.permissions, key],
  }));

  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) { enqueueSnackbar('Role name is required', { variant: 'warning' }); return; }
    setRoleSaving(true);
    try {
      if (roleForm.id) {
        await api.patch(`/auth/roles/${roleForm.id}/`, { name: roleForm.name, description: roleForm.description, permissions: roleForm.permissions });
      } else {
        await api.post('/auth/roles/', { name: roleForm.name, description: roleForm.description, permissions: roleForm.permissions });
      }
      enqueueSnackbar(roleForm.id ? 'Role updated' : 'Role created', { variant: 'success' });
      setRoleDialog(false);
      loadRoles();
    } catch (err) {
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Failed to save role';
      enqueueSnackbar(msg, { variant: 'error' });
    }
    setRoleSaving(false);
  };

  const handleDeleteRole = async () => {
    try {
      await api.delete(`/auth/roles/${deleteRoleConfirm.id}/`);
      enqueueSnackbar('Role deleted', { variant: 'success' });
      setDeleteRoleConfirm(null);
      loadRoles();
    } catch { enqueueSnackbar('Failed to delete role', { variant: 'error' }); }
  };

  const openEditSysRole = (r, e) => {
    e.stopPropagation();
    setEditSysRole({ value: r.value, label: r.label, permissions: [...(sysRolePerms[r.value] || [])] });
  };

  const toggleSysPerm = (key) => setEditSysRole(prev => ({
    ...prev,
    permissions: prev.permissions.includes(key)
      ? prev.permissions.filter(p => p !== key)
      : [...prev.permissions, key],
  }));

  const handleSaveSysRole = async () => {
    setSysRoleSaving(true);
    try {
      await api.patch(`/auth/system-roles/${editSysRole.value}/`, { permissions: editSysRole.permissions });
    } catch {
      // Backend may not support this yet — update local state only
    }
    setSysRolePerms(prev => ({ ...prev, [editSysRole.value]: editSysRole.permissions }));
    enqueueSnackbar(`${editSysRole.label} permissions updated`, { variant: 'success' });
    setEditSysRole(null);
    setSysRoleSaving(false);
  };

  return (
    <Box>

      {/* ── Section: Users ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Users</Typography>
          <Typography variant="body2" color="text.secondary">Manage user accounts and role assignments</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setInviteDialog(true)}
          sx={{ bgcolor: theme.palette.primary.main }}>
          Add User
        </Button>
      </Box>

      {usersLoading ? <CircularProgress /> : (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 5 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Organisation</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>MFA</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Verified</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar src={u.avatar} sx={{ width: 30, height: 30, fontSize: '0.8rem', bgcolor: ROLE_COLORS[u.role] || '#555' }}>
                        {u.first_name?.[0]}{u.last_name?.[0]}
                      </Avatar>
                      <Typography variant="body2" fontWeight={600}>{u.first_name} {u.last_name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell><Typography variant="body2">{u.email}</Typography></TableCell>
                  <TableCell>
                    <Chip label={u.role_display || u.role} size="small"
                      sx={{ bgcolor: (ROLE_COLORS[u.role] || '#555') + '20', color: ROLE_COLORS[u.role] || '#555', fontWeight: 700, fontSize: '0.7rem' }} />
                  </TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{u.organization_name || '—'}</Typography></TableCell>
                  <TableCell>
                    <Chip label={u.mfa_enabled ? 'On' : 'Off'} size="small" color={u.mfa_enabled ? 'success' : 'default'} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {u.is_verified ? <Check sx={{ fontSize: 18, color: 'success.main' }} /> : <Close sx={{ fontSize: 18, color: 'text.disabled' }} />}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={(e) => openMenu(e, u)}>
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Section: System Roles ── */}
      <Divider sx={{ mb: 3 }} />
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>System Roles</Typography>
        <Typography variant="body2" color="text.secondary">Built-in roles with preset permissions — expand to review</Typography>
      </Box>

      {ROLE_CHOICES.map(r => {
        const perms = sysRolePerms[r.value] || [];
        return (
          <Accordion key={r.value} variant="outlined" sx={{ mb: 1, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Chip label={r.label} size="small"
                  sx={{ bgcolor: (ROLE_COLORS[r.value] || '#555') + '20', color: ROLE_COLORS[r.value] || '#555', fontWeight: 700, minWidth: 130 }} />
                <Typography variant="body2" color="text.secondary">
                  {r.value === 'SUPERADMIN' ? 'Full system access' : `${perms.length} permissions`}
                </Typography>
                <Box sx={{ ml: 'auto', mr: 1 }} onClick={e => e.stopPropagation()}>
                  <Tooltip title="Edit permissions">
                    <IconButton size="small" onClick={(e) => openEditSysRole(r, e)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              {PERMISSION_GROUPS.map(group => (
                <Box key={group.group} sx={{ mb: 2 }}>
                  <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {group.group}
                  </Typography>
                  <Grid container spacing={0.5} sx={{ mt: 0.5 }}>
                    {group.perms.map(p => {
                      const has = r.value === 'SUPERADMIN' || perms.includes(p.key);
                      return (
                        <Grid item xs={12} sm={6} md={4} key={p.key}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                            <Box sx={{ width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              bgcolor: has ? 'success.main' : 'grey.200', flexShrink: 0 }}>
                              {has && <Check sx={{ fontSize: 12, color: '#fff' }} />}
                            </Box>
                            <Box>
                              <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: has ? 600 : 400, color: has ? 'text.primary' : 'text.disabled' }}>
                                {p.label}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* ── Section: Custom Roles ── */}
      <Divider sx={{ my: 3 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Custom Roles</Typography>
          <Typography variant="body2" color="text.secondary">Create tailored roles with specific permission sets</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openNewRole}
          sx={{ bgcolor: theme.palette.primary.main }}>
          Create Custom Role
        </Button>
      </Box>

      {rolesLoading ? <CircularProgress size={20} /> : customRoles.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <ManageAccounts sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">No custom roles yet</Typography>
          <Typography variant="body2" color="text.disabled">Create a custom role to assign granular permissions beyond the system defaults</Typography>
        </Paper>
      ) : (
        customRoles.map(r => (
          <Accordion key={r.id} variant="outlined" sx={{ mb: 1, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Chip label={r.name} size="small" sx={{ bgcolor: '#37474f20', color: '#37474f', fontWeight: 700, minWidth: 130 }} />
                <Typography variant="body2" color="text.secondary">{(r.permissions || []).length} permissions</Typography>
                <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5, mr: 1 }} onClick={e => e.stopPropagation()}>
                  <Tooltip title="Edit role"><IconButton size="small" onClick={() => openEditRole(r)}><Edit fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Delete role"><IconButton size="small" color="error" onClick={() => setDeleteRoleConfirm(r)}><Delete fontSize="small" /></IconButton></Tooltip>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              {r.description && <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{r.description}</Typography>}
              {PERMISSION_GROUPS.map(group => (
                <Box key={group.group} sx={{ mb: 2 }}>
                  <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {group.group}
                  </Typography>
                  <Grid container spacing={0.5} sx={{ mt: 0.5 }}>
                    {group.perms.map(p => {
                      const has = (r.permissions || []).includes(p.key);
                      return (
                        <Grid item xs={12} sm={6} md={4} key={p.key}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                            <Box sx={{ width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              bgcolor: has ? 'success.main' : 'grey.200', flexShrink: 0 }}>
                              {has && <Check sx={{ fontSize: 12, color: '#fff' }} />}
                            </Box>
                            <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: has ? 600 : 400, color: has ? 'text.primary' : 'text.disabled' }}>
                              {p.label}
                            </Typography>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
        ))
      )}

      {/* ── User action menu ── */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={() => { closeMenu(); setEditUser(menuUser); setEditRole(menuUser?.role); }}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon>Change Role
        </MenuItem>
        <MenuItem onClick={() => { closeMenu(); setSetPwdUser(menuUser); setNewPwd(''); setNewPwdConfirm(''); }}>
          <ListItemIcon><Password fontSize="small" /></ListItemIcon>Set Password
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleToggleFlag('mfa_required', 'Enforce MFA')}>
          <ListItemIcon><PhonelinkLock fontSize="small" /></ListItemIcon>
          {menuUser?.mfa_required ? 'Remove MFA Enforcement' : 'Enforce MFA'}
        </MenuItem>
        <MenuItem onClick={() => handleToggleFlag('force_password_reset', 'Force Password Reset')}>
          <ListItemIcon><LockReset fontSize="small" /></ListItemIcon>Force Password Reset
        </MenuItem>
        <MenuItem onClick={() => handleToggleFlag('is_active', 'User account')}>
          <ListItemIcon><Block fontSize="small" /></ListItemIcon>
          {menuUser?.is_active === false ? 'Enable User' : 'Disable User'}
        </MenuItem>
        {menuUser?.id !== me?.id && (
          <MenuItem onClick={() => { closeMenu(); setDeleteConfirm(menuUser); }} sx={{ color: 'error.main' }}>
            <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>Delete User
          </MenuItem>
        )}
      </Menu>

      {/* ── Dialogs ── */}

      {/* Change user role */}
      <Dialog open={!!editUser} onClose={() => setEditUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Change Role — {editUser?.first_name} {editUser?.last_name}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Role</InputLabel>
            <Select value={editRole} label="Role" onChange={e => setEditRole(e.target.value)}>
              {ROLE_CHOICES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveUserRole} disabled={saving}
            sx={{ bgcolor: theme.palette.primary.main }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Add user */}
      <Dialog open={inviteDialog} onClose={() => setInviteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="First Name" value={inviteForm.first_name}
                onChange={e => setInviteForm(p => ({ ...p, first_name: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Last Name" value={inviteForm.last_name}
                onChange={e => setInviteForm(p => ({ ...p, last_name: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Email *" value={inviteForm.email}
                onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select value={inviteForm.role} label="Role"
                  onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}>
                  {ROLE_CHOICES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                An activation email will be sent so the user can set their own password. If email is not configured, use <strong>Set Password</strong> from the user's action menu after creation.
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleInvite} disabled={inviting}
            sx={{ bgcolor: theme.palette.primary.main }}>
            {inviting ? <CircularProgress size={18} /> : 'Create & Send Invite'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create / Edit custom role */}
      <Dialog open={roleDialog} onClose={() => setRoleDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{roleForm.id ? 'Edit Role' : 'Create Custom Role'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5, mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Role Name *" value={roleForm.name}
                onChange={e => setRoleForm(p => ({ ...p, name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Description" value={roleForm.description}
                onChange={e => setRoleForm(p => ({ ...p, description: e.target.value }))} />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Permissions</Typography>

          {PERMISSION_GROUPS.map(group => (
            <Box key={group.group} sx={{ mb: 2.5 }}>
              <Typography variant="caption" fontWeight={700} color="text.disabled"
                sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
                {group.group}
              </Typography>
              <Grid container spacing={0.5}>
                {group.perms.map(p => {
                  const on = roleForm.permissions.includes(p.key);
                  return (
                    <Grid item xs={12} sm={6} md={4} key={p.key}>
                      <Box
                        onClick={() => togglePerm(p.key)}
                        sx={{
                          display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1, borderRadius: 1, cursor: 'pointer',
                          border: '1px solid', borderColor: on ? 'primary.main' : 'divider',
                          bgcolor: on ? `${theme.palette.primary.main}10` : 'transparent',
                          transition: 'all 0.15s',
                          '&:hover': { borderColor: 'primary.light', bgcolor: `${theme.palette.primary.main}08` },
                        }}
                      >
                        <Switch checked={on} size="small" onChange={() => togglePerm(p.key)}
                          onClick={e => e.stopPropagation()}
                          sx={{ mt: -0.25, flexShrink: 0,
                            '& .MuiSwitch-track': { bgcolor: on ? theme.palette.primary.main : undefined },
                          }} />
                        <Box>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 600, lineHeight: 1.3 }}>{p.label}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>{p.desc}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto', pl: 1 }}>
            {roleForm.permissions.length} permission{roleForm.permissions.length !== 1 ? 's' : ''} selected
          </Typography>
          <Button onClick={() => setRoleDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveRole} disabled={roleSaving}
            sx={{ bgcolor: theme.palette.primary.main }}>
            {roleSaving ? <CircularProgress size={18} /> : roleForm.id ? 'Save Changes' : 'Create Role'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Set password */}
      <Dialog open={!!setPwdUser} onClose={() => setSetPwdUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Set Password — {setPwdUser?.first_name} {setPwdUser?.last_name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="New Password" type="password"
                value={newPwd} onChange={e => setNewPwd(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Confirm Password" type="password"
                value={newPwdConfirm} onChange={e => setNewPwdConfirm(e.target.value)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSetPwdUser(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSetPassword} disabled={pwdSaving}
            sx={{ bgcolor: theme.palette.primary.main }}>
            {pwdSaving ? <CircularProgress size={18} /> : 'Set Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete user confirm */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove User</DialogTitle>
        <DialogContent>
          <Typography>Remove <strong>{deleteConfirm?.first_name} {deleteConfirm?.last_name}</strong> ({deleteConfirm?.email})?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteUser}>Remove</Button>
        </DialogActions>
      </Dialog>

      {/* Delete role confirm */}
      <Dialog open={!!deleteRoleConfirm} onClose={() => setDeleteRoleConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Role</DialogTitle>
        <DialogContent>
          <Typography>Delete the <strong>{deleteRoleConfirm?.name}</strong> role? Users assigned this role will need to be reassigned.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteRoleConfirm(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteRole}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Edit system role permissions */}
      <Dialog open={!!editSysRole} onClose={() => setEditSysRole(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          Edit Permissions — <Chip label={editSysRole?.label} size="small"
            sx={{ bgcolor: (ROLE_COLORS[editSysRole?.value] || '#555') + '20', color: ROLE_COLORS[editSysRole?.value] || '#555', fontWeight: 700, ml: 1 }} />
        </DialogTitle>
        <DialogContent>
          {editSysRole?.value === 'SUPERADMIN' && (
            <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
              Super Admin always has full access to all permissions regardless of this configuration.
            </Alert>
          )}
          <Divider sx={{ mb: 2 }} />
          {PERMISSION_GROUPS.map(group => (
            <Box key={group.group} sx={{ mb: 2.5 }}>
              <Typography variant="caption" fontWeight={700} color="text.disabled"
                sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
                {group.group}
              </Typography>
              <Grid container spacing={0.5}>
                {group.perms.map(p => {
                  const on = editSysRole?.value === 'SUPERADMIN' || (editSysRole?.permissions || []).includes(p.key);
                  const disabled = editSysRole?.value === 'SUPERADMIN';
                  return (
                    <Grid item xs={12} sm={6} md={4} key={p.key}>
                      <Box
                        onClick={() => !disabled && toggleSysPerm(p.key)}
                        sx={{
                          display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1, borderRadius: 1,
                          cursor: disabled ? 'default' : 'pointer',
                          border: '1px solid', borderColor: on ? 'primary.main' : 'divider',
                          bgcolor: on ? `${theme.palette.primary.main}10` : 'transparent',
                          transition: 'all 0.15s',
                          opacity: disabled ? 0.6 : 1,
                          '&:hover': !disabled ? { borderColor: 'primary.light', bgcolor: `${theme.palette.primary.main}08` } : {},
                        }}
                      >
                        <Switch checked={on} size="small" disabled={disabled}
                          onChange={() => !disabled && toggleSysPerm(p.key)}
                          onClick={e => e.stopPropagation()}
                          sx={{ mt: -0.25, flexShrink: 0 }} />
                        <Box>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 600, lineHeight: 1.3 }}>{p.label}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>{p.desc}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto', pl: 1 }}>
            {editSysRole?.value === 'SUPERADMIN' ? 'All permissions' : `${(editSysRole?.permissions || []).length} permission${(editSysRole?.permissions || []).length !== 1 ? 's' : ''} selected`}
          </Typography>
          <Button onClick={() => setEditSysRole(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSysRole} disabled={sysRoleSaving}
            sx={{ bgcolor: theme.palette.primary.main }}>
            {sysRoleSaving ? <CircularProgress size={18} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Integrations Tab ──────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
function IntegrationsTab() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/sso-providers/')
      .then(r => {
        const data = r.data;
        setProviders(Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []);
      })
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, []);

  const integrations = [
    { key: 'jira', label: 'Jira', icon: '🔧', desc: 'Sync findings as Jira tickets', status: 'coming_soon' },
    { key: 'slack', label: 'Slack', icon: '💬', desc: 'Send report and finding alerts to Slack', status: 'coming_soon' },
    { key: 'teams', label: 'Microsoft Teams', icon: '🟦', desc: 'Post notifications to Teams channels', status: 'coming_soon' },
    { key: 'splunk', label: 'Splunk', icon: '🔍', desc: 'Forward audit logs to Splunk', status: 'coming_soon' },
    { key: 'webhook', label: 'Webhooks', icon: '🔗', desc: 'POST events to any HTTP endpoint', status: 'coming_soon' },
  ];

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>Integrations</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Connect MainFrame to your existing tooling and workflows.
      </Typography>

      {/* SSO Providers */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Single Sign-On (SSO)</Typography>
      {loading ? <CircularProgress size={20} /> : (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[{ key: 'google', label: 'Google OAuth', icon: '🔵' }, { key: 'azure', label: 'Azure AD / Microsoft', icon: '🟦' }, { key: 'saml', label: 'SAML 2.0', icon: '🔐' }].map(p => {
            const active = providers.find(pr => pr.provider === p.key);
            return (
              <Grid item xs={12} md={4} key={p.key}>
                <Card variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography sx={{ fontSize: '1.5rem' }}>{p.icon}</Typography>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{p.label}</Typography>
                      <Chip label={active ? 'Configured' : 'Not configured'} size="small"
                        color={active ? 'success' : 'default'} variant="outlined" sx={{ mt: 0.25 }} />
                    </Box>
                  </Box>
                  <Button size="small" variant="outlined" disabled>Configure</Button>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Third-party integrations */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Third-Party Tools</Typography>
      <Grid container spacing={2}>
        {integrations.map(i => (
          <Grid item xs={12} md={6} key={i.key}>
            <Card variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.75 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontSize: '1.5rem' }}>{i.icon}</Typography>
                <Box>
                  <Typography variant="body2" fontWeight={700}>{i.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{i.desc}</Typography>
                </Box>
              </Box>
              <Chip label="Coming soon" size="small" variant="outlined" color="default" />
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// ── Email Notifications Tab ───────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
function IntegrationsLiveTab() {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const eventOptions = ['finding.created', 'finding.updated', 'finding.status_changed', 'finding.published'];
  const [overview, setOverview] = useState(null);
  const [webhook, setWebhook] = useState({ enabled: false, config: { url: '', secret: '', events: eventOptions } });
  const [jira, setJira] = useState({ enabled: false, config: { site_url: '', email: '', api_token: '', project_key: '', issue_type: 'Task', events: ['finding.published'] } });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, logsRes] = await Promise.all([
        api.get('/integrations/'),
        api.get('/integrations/logs/'),
      ]);
      const data = overviewRes.data || {};
      setOverview(data);
      setWebhook({
        enabled: data.webhook?.enabled || false,
        config: {
          url: data.webhook?.config?.url || '',
          secret: data.webhook?.config?.secret || '',
          events: data.webhook?.config?.events || eventOptions,
        },
      });
      setJira({
        enabled: data.jira?.enabled || false,
        config: {
          site_url: data.jira?.config?.site_url || '',
          email: data.jira?.config?.email || '',
          api_token: data.jira?.config?.api_token || '',
          project_key: data.jira?.config?.project_key || '',
          issue_type: data.jira?.config?.issue_type || 'Task',
          events: data.jira?.config?.events || ['finding.published'],
        },
      });
      setLogs(logsRes.data || []);
    } catch (err) {
      enqueueSnackbar('Failed to load integrations', { variant: 'error' });
    }
    setLoading(false);
  }, [enqueueSnackbar]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const updateConfig = (target, setTarget, key, value) => {
    setTarget({ ...target, config: { ...target.config, [key]: value } });
  };

  const toggleEvent = (target, setTarget, event) => {
    const events = target.config.events || [];
    updateConfig(target, setTarget, 'events', events.includes(event) ? events.filter(e => e !== event) : [...events, event]);
  };

  const saveIntegration = async (provider, data) => {
    setSaving(provider);
    try {
      await api.patch(`/integrations/${provider}/`, data);
      enqueueSnackbar(`${provider === 'jira' ? 'Jira' : 'Webhook'} settings saved`, { variant: 'success' });
      load();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || `Failed to save ${provider}`, { variant: 'error' });
    }
    setSaving('');
  };

  const testIntegration = async (provider) => {
    setSaving(`${provider}-test`);
    try {
      await api.post(`/integrations/${provider}/test/`);
      enqueueSnackbar(`${provider === 'jira' ? 'Jira' : 'Webhook'} test passed`, { variant: 'success' });
      load();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || `${provider} test failed`, { variant: 'error' });
    }
    setSaving('');
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  }

  const googleConfigured = overview?.google?.enabled;

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>Integrations</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Connect MainFrame to identity, ticketing and event-driven workflows.
      </Typography>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Single Sign-On</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" fontWeight={700}>Google OAuth</Typography>
                <Chip label={googleConfigured ? 'Configured' : 'Needs client ID'} size="small"
                  color={googleConfigured ? 'success' : 'warning'} variant="outlined" />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Uses the Google button on the login page. For local dev, add http://localhost:3000 as an authorized JavaScript origin in Google Cloud.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {['Azure AD / Microsoft', 'SAML 2.0'].map(label => (
          <Grid item xs={12} md={4} key={label}>
            <Card variant="outlined" sx={{ height: '100%', opacity: 0.7 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" fontWeight={700}>{label}</Typography>
                  <Chip label="Later" size="small" variant="outlined" />
                </Box>
                <Typography variant="caption" color="text.secondary">Placeholder for future enterprise SSO.</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Workflow Integrations</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="body1" fontWeight={700}>Outgoing Webhook</Typography>
                  <Typography variant="caption" color="text.secondary">POST finding events to an HTTP endpoint.</Typography>
                </Box>
                <Switch checked={webhook.enabled} onChange={e => setWebhook({ ...webhook, enabled: e.target.checked })} />
              </Box>
              <TextField fullWidth label="Webhook URL" size="small" sx={{ mb: 2 }}
                value={webhook.config.url}
                onChange={e => updateConfig(webhook, setWebhook, 'url', e.target.value)}
                placeholder="https://example.com/webhooks/ozireport" />
              <TextField fullWidth label="Signing secret" size="small" sx={{ mb: 2 }}
                value={webhook.config.secret}
                onChange={e => updateConfig(webhook, setWebhook, 'secret', e.target.value)}
                helperText="Optional HMAC SHA-256 signature in X-OziReport-Signature." />
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0.5, mb: 2 }}>
                {eventOptions.map(event => (
                  <FormControlLabel key={event}
                    control={<Switch size="small" checked={(webhook.config.events || []).includes(event)}
                      onChange={() => toggleEvent(webhook, setWebhook, event)} />}
                    label={<Typography variant="caption">{event}</Typography>} />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" size="small" disabled={saving === 'webhook'}
                  onClick={() => saveIntegration('webhook', webhook)}
                  sx={{ bgcolor: theme.palette.primary.main }}>
                  {saving === 'webhook' ? <CircularProgress size={18} /> : 'Save'}
                </Button>
                <Button variant="outlined" size="small" disabled={saving === 'webhook-test' || !webhook.config.url}
                  onClick={() => testIntegration('webhook')}>
                  {saving === 'webhook-test' ? <CircularProgress size={18} /> : 'Send Test'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="body1" fontWeight={700}>Jira Cloud</Typography>
                  <Typography variant="caption" color="text.secondary">Create Jira issues from findings.</Typography>
                </Box>
                <Switch checked={jira.enabled} onChange={e => setJira({ ...jira, enabled: e.target.checked })} />
              </Box>
              <Grid container spacing={1.5}>
                <Grid item xs={12}>
                  <TextField fullWidth label="Jira site URL" size="small"
                    value={jira.config.site_url}
                    onChange={e => updateConfig(jira, setJira, 'site_url', e.target.value)}
                    placeholder="https://your-domain.atlassian.net" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Email" size="small"
                    value={jira.config.email}
                    onChange={e => updateConfig(jira, setJira, 'email', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="API token" size="small" type="password"
                    value={jira.config.api_token}
                    onChange={e => updateConfig(jira, setJira, 'api_token', e.target.value)} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="Project key" size="small"
                    value={jira.config.project_key}
                    onChange={e => updateConfig(jira, setJira, 'project_key', e.target.value)}
                    placeholder="SEC" />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="Issue type" size="small"
                    value={jira.config.issue_type}
                    onChange={e => updateConfig(jira, setJira, 'issue_type', e.target.value)}
                    placeholder="Task" />
                </Grid>
              </Grid>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0.5, my: 2 }}>
                {eventOptions.map(event => (
                  <FormControlLabel key={event}
                    control={<Switch size="small" checked={(jira.config.events || []).includes(event)}
                      onChange={() => toggleEvent(jira, setJira, event)} />}
                    label={<Typography variant="caption">{event}</Typography>} />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" size="small" disabled={saving === 'jira'}
                  onClick={() => saveIntegration('jira', jira)}
                  sx={{ bgcolor: theme.palette.primary.main }}>
                  {saving === 'jira' ? <CircularProgress size={18} /> : 'Save'}
                </Button>
                <Button variant="outlined" size="small" disabled={saving === 'jira-test'}
                  onClick={() => testIntegration('jira')}>
                  {saving === 'jira-test' ? <CircularProgress size={18} /> : 'Test Jira'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Recent Integration Activity</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Finding</TableCell>
                <TableCell>Response</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow><TableCell colSpan={6}><Typography variant="body2" color="text.secondary">No integration events yet.</Typography></TableCell></TableRow>
              ) : logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                  <TableCell>{log.provider}</TableCell>
                  <TableCell>{log.event}</TableCell>
                  <TableCell><Chip size="small" label={log.status} color={log.status === 'SUCCESS' ? 'success' : log.status === 'FAILED' ? 'error' : 'default'} variant="outlined" /></TableCell>
                  <TableCell>{log.finding_title || '-'}</TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Typography variant="caption" noWrap component="div">
                      {log.error_message || log.response_body || log.response_status || '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}

function IntegrationsMarketplaceTab() {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const logos = {
    jira: 'https://cdn.simpleicons.org/jira/0052CC',
    webhook: 'https://cdn.simpleicons.org/webhook/7C3AED',
    google: 'https://cdn.simpleicons.org/google/4285F4',
    teams: 'https://cdn.simpleicons.org/microsoftteams/6264A7',
    servicenow: 'https://cdn.simpleicons.org/servicenow/81B5A1',
  };
  const steps = ['Authenticate', 'Project', 'Pipeline', 'Mappings', 'Confirm'];
  const sourceFields = [
    { key: 'title', label: 'Title' },
    { key: 'severity', label: 'Severity Risk' },
    { key: 'cvss_score', label: 'CVSS Score' },
    { key: 'cvss_vector', label: 'CVSS Vector' },
    { key: 'affected_asset', label: 'Affected Asset' },
    { key: 'details', label: 'Details' },
    { key: 'description', label: 'Description' },
    { key: 'impact', label: 'Impact (Consequence)' },
    { key: 'likelihood', label: 'Likelihood' },
    { key: 'proof_of_concept', label: 'Proof of Concept' },
    { key: 'recommendations', label: 'Recommendation' },
    { key: 'cwe_id', label: 'CWE' },
    { key: 'cve_id', label: 'CVE' },
    { key: 'supporting_evidence', label: 'Supporting Evidence Images' },
  ];
  const defaultMappings = {
    title: 'summary',
    severity: 'description',
    cvss_score: 'description',
    cvss_vector: 'description',
    affected_asset: 'description',
    details: 'description',
    description: 'description',
    impact: 'description',
    likelihood: 'description',
    proof_of_concept: 'description',
    recommendations: 'description',
    cwe_id: 'description',
    cve_id: 'description',
    supporting_evidence: 'attachment',
  };
  const defaultSlaDays = { CRITICAL: 7, HIGH: 14, MEDIUM: 30, LOW: 90, INFORMATIONAL: 180 };
  const defaultPriorityMap = { CRITICAL: 'Highest', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low', INFORMATIONAL: 'Lowest' };
  const defaultPipelineConfig = {
    priority_enabled: true,
    due_date_enabled: true,
    sla_days: defaultSlaDays,
    priority_map: defaultPriorityMap,
    component_ids: [],
    assignee_account_id: '',
    parent_key: '',
    target_transition_name: '',
    sync_status_to_finding: true,
    app_base_url: typeof window !== 'undefined' ? window.location.origin : '',
    jira_webhook_secret: '',
    default_labels: ['security-finding'],
  };

  const [overview, setOverview] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [serviceNowDrawerOpen, setServiceNowDrawerOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testingIssue, setTestingIssue] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [issueTypes, setIssueTypes] = useState([]);
  const [jiraFields, setJiraFields] = useState([]);
  const [components, setComponents] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [parentIssues, setParentIssues] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [syncingStatus, setSyncingStatus] = useState(false);
  const [jira, setJira] = useState({
    enabled: false,
    config: {
      ...defaultPipelineConfig,
      site_url: '',
      email: '',
      api_token: '',
      project_key: '',
      issue_type: 'Task',
      field_mappings: defaultMappings,
      events: ['finding.published'],
    },
  });
  const [serviceNow, setServiceNow] = useState({
    enabled: false,
    config: {
      instance_url: '',
      username: '',
      password: '',
      auth_method: 'basic',
      target_table: 'incident',
      assignment_group: '',
      state: 'draft',
    },
  });

  const selectedOrganization = organizations.find(org => String(org.id) === String(selectedOrgId));
  const clientSearchText = (org) => [
    org?.name,
    org?.slug,
    org?.website,
    org?.primary_contact?.email,
    org?.primary_contact?.name,
  ].filter(Boolean).join(' ').toLowerCase();
  const filteredOrganizations = organizations
    .filter(org => !clientSearch.trim() || clientSearchText(org).includes(clientSearch.trim().toLowerCase()))
    .slice(0, 100);

  const loadOrganizations = useCallback(async () => {
    try {
      const res = await api.get('/organizations/');
      const orgs = res.data?.results || res.data || [];
      setOrganizations(orgs);
    } catch {
      enqueueSnackbar('Failed to load clients for integrations', { variant: 'error' });
    }
  }, [enqueueSnackbar]);

  const loadOverview = useCallback(async (organizationId = selectedOrgId) => {
    try {
      const query = organizationId ? `?organization_id=${encodeURIComponent(organizationId)}` : '';
      const res = await api.get(`/integrations/${query}`);
      const data = res.data || {};
      setOverview(data);
      setJira({
        enabled: data.jira?.enabled || false,
        config: {
          site_url: data.jira?.config?.site_url || '',
          email: data.jira?.config?.email || '',
          api_token: data.jira?.config?.api_token || '',
          project_key: data.jira?.config?.project_key || '',
          issue_type: data.jira?.config?.issue_type || 'Task',
          field_mappings: { ...defaultMappings, ...(data.jira?.config?.field_mappings || {}) },
          ...defaultPipelineConfig,
          ...(data.jira?.config || {}),
          sla_days: { ...defaultSlaDays, ...(data.jira?.config?.sla_days || {}) },
          priority_map: { ...defaultPriorityMap, ...(data.jira?.config?.priority_map || {}) },
          component_ids: data.jira?.config?.component_ids || [],
          default_labels: data.jira?.config?.default_labels || ['security-finding'],
          events: data.jira?.config?.events || ['finding.published'],
        },
      });
      setServiceNow({
        enabled: data.servicenow?.enabled || false,
        config: {
          instance_url: data.servicenow?.config?.instance_url || '',
          username: data.servicenow?.config?.username || '',
          password: data.servicenow?.config?.password || '',
          auth_method: data.servicenow?.config?.auth_method || 'basic',
          target_table: data.servicenow?.config?.target_table || 'incident',
          assignment_group: data.servicenow?.config?.assignment_group || '',
          state: data.servicenow?.config?.state || 'draft',
        },
      });
    } catch {
      enqueueSnackbar('Failed to load integrations', { variant: 'error' });
    }
  }, [enqueueSnackbar, selectedOrgId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadOrganizations(); }, [loadOrganizations]);
  useEffect(() => {
    if (selectedOrgId) {
      loadOverview(selectedOrgId);
      setProjects([]);
      setIssueTypes([]);
      setJiraFields([]);
      setComponents([]);
      setAssignableUsers([]);
      setParentIssues([]);
      setPriorities([]);
    }
  }, [selectedOrgId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setJiraConfig = (key, value) => {
    setJira(prev => ({ ...prev, config: { ...prev.config, [key]: value } }));
  };

  const setServiceNowConfig = (key, value) => {
    setServiceNow(prev => ({ ...prev, config: { ...prev.config, [key]: value } }));
  };

  const saveJira = async (extra = {}) => {
    if (!selectedOrgId) throw new Error('Choose a client before configuring Jira.');
    const next = { ...jira, ...extra, config: { ...jira.config, ...(extra.config || {}) } };
    await api.patch(`/integrations/jira/?organization_id=${encodeURIComponent(selectedOrgId)}`, {
      ...next,
      organization: selectedOrgId,
    });
    setJira(next);
    return next;
  };

  const saveServiceNow = async (extra = {}) => {
    if (!selectedOrgId) throw new Error('Choose a client before configuring ServiceNow.');
    const next = { ...serviceNow, ...extra, config: { ...serviceNow.config, ...(extra.config || {}) } };
    await api.patch(`/integrations/servicenow/?organization_id=${encodeURIComponent(selectedOrgId)}`, {
      ...next,
      organization: selectedOrgId,
    });
    setServiceNow(next);
    await loadOverview(selectedOrgId);
    return next;
  };

  const saveServiceNowDraft = async () => {
    setSaving(true);
    try {
      await saveServiceNow({ enabled: false, config: { state: 'draft' } });
      enqueueSnackbar('ServiceNow draft settings saved', { variant: 'success' });
      setServiceNowDrawerOpen(false);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to save ServiceNow draft', { variant: 'error' });
    }
    setSaving(false);
  };

  const revokeServiceNow = async () => {
    if (!window.confirm('Clear the ServiceNow draft settings for this client?')) return;
    setSaving(true);
    try {
      await api.patch(`/integrations/servicenow/?organization_id=${encodeURIComponent(selectedOrgId)}`, {
        organization: selectedOrgId,
        enabled: false,
        config: {
          instance_url: '',
          username: '',
          password: '',
          auth_method: 'basic',
          target_table: 'incident',
          assignment_group: '',
          state: 'draft',
        },
      });
      enqueueSnackbar('ServiceNow draft cleared', { variant: 'success' });
      setServiceNowDrawerOpen(false);
      await loadOverview(selectedOrgId);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to clear ServiceNow draft', { variant: 'error' });
    }
    setSaving(false);
  };

  const testAndContinue = async () => {
    setSaving(true);
    try {
      await saveJira();
      await api.post('/integrations/jira/test/', { organization_id: selectedOrgId });
      enqueueSnackbar('Jira service account connected', { variant: 'success' });
      setStep(1);
      await loadProjects();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Jira connection failed', { variant: 'error' });
    }
    setSaving(false);
  };

  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      if (!selectedOrgId) throw new Error('Choose a client before loading Jira projects.');
      const res = await api.get(`/integrations/jira/projects/?organization_id=${encodeURIComponent(selectedOrgId)}`);
      const foundProjects = res.data || [];
      setProjects(foundProjects);
      if (foundProjects.length > 0) {
        const selected = foundProjects.find(p => p.key === jira.config.project_key) || foundProjects[0];
        setJira(prev => ({
          ...prev,
          config: { ...prev.config, project_key: selected.key },
        }));
        await loadIssueTypes(selected.key);
      }
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Could not load Jira projects', { variant: 'error' });
    }
    setProjectsLoading(false);
  };

  const loadIssueTypes = async (projectKey) => {
    if (!projectKey) return;
    try {
      const res = await api.get(`/integrations/jira/issue-types/?organization_id=${encodeURIComponent(selectedOrgId)}&project_key=${encodeURIComponent(projectKey)}`);
      const types = res.data || [];
      setIssueTypes(types);
      if (types.length && !types.find(t => t.name === jira.config.issue_type)) {
        setJiraConfig('issue_type', types[0].name);
      }
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Could not load Jira issue types', { variant: 'error' });
    }
  };

  const loadPipelineOptions = async (projectKey = jira.config.project_key) => {
    if (!projectKey) return;
    const encodedProject = encodeURIComponent(projectKey);
    const requests = [
      api.get(`/integrations/jira/components/?organization_id=${encodeURIComponent(selectedOrgId)}&project_key=${encodedProject}`),
      api.get(`/integrations/jira/users/?organization_id=${encodeURIComponent(selectedOrgId)}&project_key=${encodedProject}`),
      api.get(`/integrations/jira/parents/?organization_id=${encodeURIComponent(selectedOrgId)}&project_key=${encodedProject}`),
      api.get(`/integrations/jira/priorities/?organization_id=${encodeURIComponent(selectedOrgId)}`),
    ];
    const [componentRes, userRes, parentRes, priorityRes] = await Promise.allSettled(requests);
    setComponents(componentRes.status === 'fulfilled' ? componentRes.value.data || [] : []);
    setAssignableUsers(userRes.status === 'fulfilled' ? userRes.value.data || [] : []);
    setParentIssues(parentRes.status === 'fulfilled' ? parentRes.value.data || [] : []);
    setPriorities(priorityRes.status === 'fulfilled' ? priorityRes.value.data || [] : []);
  };

  const loadFields = async () => {
    try {
      const res = await api.get(`/integrations/jira/fields/?organization_id=${encodeURIComponent(selectedOrgId)}&project_key=${encodeURIComponent(jira.config.project_key)}&issue_type=${encodeURIComponent(jira.config.issue_type || 'Task')}`);
      setJiraFields(res.data || []);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Could not load Jira fields', { variant: 'error' });
    }
  };

  const continueProject = async () => {
    if (!projects.length || !jira.config.project_key) {
      enqueueSnackbar('Choose a Jira project first', { variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      await saveJira({ enabled: true });
      await loadPipelineOptions(jira.config.project_key);
      setStep(2);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to save Jira project', { variant: 'error' });
    }
    setSaving(false);
  };

  const savePipeline = async () => {
    setSaving(true);
    try {
      await saveJira({ enabled: true });
      await loadFields();
      enqueueSnackbar('Jira pipeline settings saved', { variant: 'success' });
      setStep(3);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to save Jira pipeline settings', { variant: 'error' });
    }
    setSaving(false);
  };

  const saveMappings = async () => {
    setSaving(true);
    try {
      await saveJira({ enabled: true });
      enqueueSnackbar('Jira field mappings saved', { variant: 'success' });
      setStep(4);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to save mappings', { variant: 'error' });
    }
    setSaving(false);
  };

  const sendTestIssue = async () => {
    setSaving(true);
    try {
      await saveJira({ enabled: true });
      const res = await api.post('/integrations/jira/test-issue/', { organization_id: selectedOrgId });
      enqueueSnackbar(`Test issue created: ${res.data.issue_key}`, { variant: 'success' });
      loadOverview(selectedOrgId);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to create Jira test issue', { variant: 'error' });
    }
    setSaving(false);
  };

  const sendManagedTestIssue = async () => {
    setTestingIssue(true);
    try {
      const res = await api.post('/integrations/jira/test-issue/', { organization_id: selectedOrgId });
      enqueueSnackbar(`Test finding sent to Jira: ${res.data.issue_key}`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to send Jira test finding', { variant: 'error' });
    }
    setTestingIssue(false);
  };

  const testJiraNow = async () => {
    setTestingConnection(true);
    try {
      await api.post('/integrations/jira/test/', { organization_id: selectedOrgId });
      enqueueSnackbar('Jira connection test passed', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Jira connection test failed', { variant: 'error' });
    }
    setTestingConnection(false);
  };

  const syncJiraStatus = async () => {
    setSyncingStatus(true);
    try {
      const res = await api.post('/integrations/jira/sync-status/', { update_findings: true, organization_id: selectedOrgId });
      enqueueSnackbar(res.data?.message || 'Jira status synced', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to sync Jira status', { variant: 'error' });
    }
    setSyncingStatus(false);
  };

  const revokeJira = async () => {
    if (!window.confirm('Revoke the Jira connection? This removes the saved service account token and mappings.')) return;
    setSaving(true);
    try {
      await api.patch(`/integrations/jira/?organization_id=${encodeURIComponent(selectedOrgId)}`, {
        organization: selectedOrgId,
        enabled: false,
        config: {
          site_url: '',
          email: '',
          api_token: '',
          project_key: '',
          issue_type: 'Task',
          field_mappings: defaultMappings,
          ...defaultPipelineConfig,
          events: ['finding.published'],
        },
      });
      enqueueSnackbar('Jira connection revoked', { variant: 'success' });
      setProjects([]);
      setIssueTypes([]);
      setJiraFields([]);
      await loadOverview(selectedOrgId);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to revoke Jira connection', { variant: 'error' });
    }
    setSaving(false);
  };

  const updateMapping = (source, target) => {
    setJiraConfig('field_mappings', { ...jira.config.field_mappings, [source]: target });
  };

  const updateSlaDay = (severity, value) => {
    const parsed = Math.max(1, Number(value) || defaultSlaDays[severity]);
    setJiraConfig('sla_days', { ...(jira.config.sla_days || defaultSlaDays), [severity]: parsed });
  };

  const updatePriorityMap = (severity, value) => {
    setJiraConfig('priority_map', { ...(jira.config.priority_map || defaultPriorityMap), [severity]: value });
  };

  const updateDefaultLabels = (value) => {
    const labels = value.split(',').map(label => label.trim()).filter(Boolean);
    setJiraConfig('default_labels', labels);
  };

  const fieldOptions = [
    { id: 'description', name: 'Description' },
    { id: 'summary', name: 'Summary' },
    { id: 'attachment', name: 'Attachment' },
    ...jiraFields.filter(f => !['summary', 'description'].includes(f.id)),
  ];

  const openJira = (targetStep = 0) => {
    setDrawerOpen(true);
    setStep(targetStep);
    if (targetStep >= 1) loadProjects();
    if (targetStep >= 2) loadPipelineOptions();
    if (targetStep === 3) loadFields();
  };

  const openClientIntegrations = (orgId) => {
    setSelectedOrgId(String(orgId));
    setClientSearch('');
  };

  const returnToClientList = () => {
    setSelectedOrgId('');
    setOverview(null);
    setProjects([]);
    setIssueTypes([]);
    setJiraFields([]);
    setComponents([]);
    setAssignableUsers([]);
    setParentIssues([]);
    setPriorities([]);
  };

  const jiraConfigured = overview?.jira?.enabled;
  const serviceNowDrafted = Boolean(overview?.servicenow?.config?.instance_url || overview?.servicenow?.config?.username || overview?.servicenow?.config?.target_table);
  const selectedProject = projects.find(project => project.key === jira.config.project_key);

  const IntegrationLogo = ({ keyName, src, label, color = '#0052CC' }) => {
    if (keyName === 'webhook') {
      return <Extension sx={{ color: '#7C3AED', fontSize: 29 }} />;
    }
    if (keyName === 'teams') {
      return <People sx={{ color: '#6264A7', fontSize: 29 }} />;
    }
    if (keyName === 'servicenow') {
      return <Business sx={{ color: '#81B5A1', fontSize: 29 }} />;
    }
    return src ? (
      <Box component="img" src={src} alt={`${label} logo`} sx={{ width: 28, height: 28, objectFit: 'contain' }} />
    ) : (
      <Typography variant="body2" fontWeight={800} sx={{ color }}>{label?.[0]}</Typography>
    );
  };

  const LogoTile = ({ src, label, color = '#0052CC', keyName = '' }) => (
    <Box sx={{
      width: 46, height: 46, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: '#fff', border: '1px solid', borderColor: 'divider', boxShadow: '0 3px 10px rgba(15,23,42,0.08)', flexShrink: 0,
    }}>
      <IntegrationLogo keyName={keyName} src={src} label={label} color={color} />
    </Box>
  );

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>Integrations</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Connect MainFrame to the tools your clients already use.
      </Typography>

      {!selectedOrgId ? (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: { xs: 'stretch', md: 'center' }, mb: 2, flexDirection: { xs: 'column', md: 'row' } }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>Clients</Typography>
              <Typography variant="body2" color="text.secondary">
                Select a client to manage their integration marketplace.
              </Typography>
            </Box>
            <TextField
              size="small"
              label="Search clients"
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              placeholder="Name, slug, website, contact"
              sx={{ width: { xs: '100%', md: 360 } }}
              InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }}
            />
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Client</TableCell>
                  <TableCell>Identifier</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrganizations.map(org => (
                  <TableRow key={org.id} hover sx={{ cursor: 'pointer' }} onClick={() => openClientIntegrations(org.id)}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                        <Avatar sx={{ width: 34, height: 34, bgcolor: org.primary_color || 'primary.main', fontSize: 13 }}>
                          {(org.name || '?').slice(0, 2).toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>{org.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {org.engagement_count || 0} engagement{org.engagement_count === 1 ? '' : 's'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>{org.slug || org.website || `Client #${org.id}`}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>{org.primary_contact?.email || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={org.is_active === false ? 'Inactive' : 'Active'}
                        color={org.is_active === false ? 'default' : 'success'} variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); openClientIntegrations(org.id); }}>
                        Manage integrations
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrganizations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Business sx={{ fontSize: 42, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary">No clients match that search.</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
              <IconButton size="small" onClick={returnToClientList}>
                <ArrowBack fontSize="small" />
              </IconButton>
              <Avatar sx={{ width: 42, height: 42, bgcolor: selectedOrganization?.primary_color || 'primary.main', fontSize: 15 }}>
                {(selectedOrganization?.name || '?').slice(0, 2).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary">Integration marketplace for</Typography>
                <Typography variant="h6" fontWeight={800} noWrap>{selectedOrganization?.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedOrganization?.slug || selectedOrganization?.website || selectedOrganization?.primary_contact?.email || `Client #${selectedOrganization?.id}`}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip size="small" label={jiraConfigured ? 'Jira configured' : 'Jira not configured'}
                color={jiraConfigured ? 'success' : 'default'} variant="outlined" />
              <Chip size="small" label={overview?.webhook?.enabled ? 'Webhook configured' : 'Webhook not configured'}
                color={overview?.webhook?.enabled ? 'success' : 'default'} variant="outlined" />
            </Box>
          </Box>

          <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <LogoTile src={logos.jira} label="Jira" keyName="jira" />
                  <Box>
                    <Typography variant="body1" fontWeight={700}>Jira</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Send {selectedOrganization?.name || 'client'} findings into Jira projects.
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Box sx={{ mt: 1 }}>
                    <Chip size="small" label={jiraConfigured ? 'Configured' : 'Not configured'}
                      color={jiraConfigured ? 'success' : 'default'} variant="outlined" />
                  </Box>
                  <Button variant="outlined" size="small" disabled={!selectedOrgId}
                    onClick={() => openJira(jiraConfigured ? 4 : 0)} sx={{ mt: 1 }}>
                    {jiraConfigured ? 'Manage' : 'Configure'}
                  </Button>
                </Box>
              </Box>
              {jiraConfigured && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Site</Typography>
                      <Typography variant="body2" noWrap>{jira.config.site_url || '-'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Service account</Typography>
                      <Typography variant="body2" noWrap>{jira.config.email || '-'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Project</Typography>
                      <Typography variant="body2">{jira.config.project_key || '-'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Issue type</Typography>
                      <Typography variant="body2">{jira.config.issue_type || '-'}</Typography>
                    </Grid>
                  </Grid>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                    <Button size="small" variant="outlined" onClick={testJiraNow} disabled={testingConnection}>
                      {testingConnection ? <CircularProgress size={16} /> : 'Test Connection'}
                    </Button>
                    <Button size="small" variant="contained" onClick={sendManagedTestIssue} disabled={testingIssue}
                      sx={{ bgcolor: theme.palette.primary.main }}>
                      {testingIssue ? <CircularProgress size={16} color="inherit" /> : 'Send Test Finding'}
                    </Button>
                    <Button size="small" variant="outlined" onClick={syncJiraStatus} disabled={syncingStatus}>
                      {syncingStatus ? <CircularProgress size={16} /> : 'Sync Jira Status'}
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => openJira(0)}>Credentials</Button>
                    <Button size="small" variant="outlined" onClick={() => openJira(1)}>Project</Button>
                    <Button size="small" variant="outlined" onClick={() => openJira(2)}>Pipeline</Button>
                    <Button size="small" variant="outlined" onClick={() => openJira(3)}>Mappings</Button>
                    <Button size="small" color="error" variant="outlined" onClick={revokeJira} disabled={saving}>Revoke</Button>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        {[
          { key: 'servicenow', label: 'ServiceNow', desc: 'Prepare ITSM/SecOps workflow settings while the PDI is pending.', configured: serviceNowDrafted, logo: logos.servicenow, action: () => setServiceNowDrawerOpen(true), actionLabel: serviceNowDrafted ? 'Edit Draft' : 'Configure Draft' },
          { key: 'webhook', label: 'Webhooks', desc: 'POST events to an external HTTP endpoint.', configured: overview?.webhook?.enabled, logo: logos.webhook },
          { key: 'google', label: 'Google SSO', desc: 'Restrict tenant access by Google Workspace domain.', configured: overview?.google?.enabled, logo: logos.google },
          { key: 'teams', label: 'Microsoft Teams', desc: 'Post report and finding alerts to Teams.', configured: false, logo: logos.teams },
        ].map(item => (
          <Grid item xs={12} md={6} key={item.key}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <LogoTile src={item.logo} label={item.label} keyName={item.key} />
                  <Box>
                    <Typography variant="body1" fontWeight={700}>{item.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
                    <Box sx={{ mt: 1 }}>
                      <Chip size="small" label={item.configured ? 'Configured' : 'Not configured'}
                        color={item.configured ? 'success' : 'default'} variant="outlined" />
                    </Box>
                  </Box>
                </Box>
                <Button variant="outlined" size="small" disabled={!item.action} onClick={item.action || undefined}>
                  {item.actionLabel || 'Configure'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))} 
          </Grid>
        </Box>
      )}

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', md: 940, lg: 1040 }, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{
          px: 3, py: 2.5, color: '#fff',
          background: 'linear-gradient(135deg, #0747A6 0%, #0052CC 48%, #6554C0 100%)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LogoTile src={logos.jira} label="Jira" keyName="jira" />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={800}>Configure Jira</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.82)' }}>
                Connect {selectedOrganization?.name || 'this client'} findings to their Jira workspace.
              </Typography>
            </Box>
          </Box>
          {jira.config.project_key && (
            <Box sx={{
              mt: 2, p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', gap: 1.5,
            }}>
              <Box sx={{
                width: 42, height: 42, borderRadius: 1.5,
                background: 'linear-gradient(135deg, #8777D9 0%, #6554C0 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
              }}>
                <Typography fontWeight={900} sx={{ color: '#fff' }}>{jira.config.project_key.slice(0, 2)}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={800}>{selectedProject?.name || 'Selected Jira Project'}</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.82)' }}>
                  {jira.config.project_key} · {jira.config.issue_type || 'Task'} issues
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stepper activeStep={step} alternativeLabel>
            {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 3 }}>
          {step === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert severity="info">
                  This must be a service Jira account, not a named consultant account. API token is preferred for Jira Cloud.
                </Alert>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Jira site URL" value={jira.config.site_url}
                  onChange={e => setJiraConfig('site_url', e.target.value)}
                  placeholder="https://customer.atlassian.net" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Service Jira account email" value={jira.config.email}
                  onChange={e => setJiraConfig('email', e.target.value)}
                  placeholder="mainframe-service@customer.com" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Jira API token" type="password" value={jira.config.api_token}
                  helperText="Use the service account token, not the account password."
                  onChange={e => setJiraConfig('api_token', e.target.value)} />
              </Grid>
            </Grid>
          )}

          {step === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Button variant="outlined" size="small" onClick={loadProjects} disabled={projectsLoading}>
                  {projectsLoading ? <CircularProgress size={18} /> : 'Refresh Jira Projects'}
                </Button>
              </Grid>
              {!projectsLoading && projects.length === 0 && (
                <Grid item xs={12}>
                  <Alert severity="warning">
                    Jira did not return any projects for this service account. Give it project access, then refresh.
                  </Alert>
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField fullWidth select label="Jira project"
                  value={projects.some(project => project.key === jira.config.project_key) ? jira.config.project_key : ''}
                  helperText="Projects are loaded from the authenticated Jira account."
                  onChange={e => { setJiraConfig('project_key', e.target.value); loadIssueTypes(e.target.value); }}>
                  {projects.map(project => (
                    <MenuItem key={project.key} value={project.key}>{project.name} ({project.key})</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth select label="Create Jira ticket as" value={jira.config.issue_type}
                  onChange={e => setJiraConfig('issue_type', e.target.value)}>
                  {(issueTypes.length ? issueTypes : [{ name: 'Task' }, { name: 'Bug' }]).map(type => (
                    <MenuItem key={type.name} value={type.name}>{type.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          )}

          {step === 2 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert severity="info">
                  These settings make Jira tickets land in the client's remediation pipeline with priority, ownership, due dates, routing, and sync metadata.
                </Alert>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={<Switch checked={jira.config.priority_enabled !== false} onChange={e => setJiraConfig('priority_enabled', e.target.checked)} />}
                  label="Map severity to Jira Priority"
                />
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                  <Table size="small">
                    <TableBody>
                      {Object.keys(defaultPriorityMap).map(severity => (
                        <TableRow key={severity}>
                          <TableCell sx={{ width: 150 }}>{severity}</TableCell>
                          <TableCell>
                            <TextField fullWidth select size="small"
                              value={(jira.config.priority_map || defaultPriorityMap)[severity] || defaultPriorityMap[severity]}
                              onChange={e => updatePriorityMap(severity, e.target.value)}>
                              {(priorities.length ? priorities : ['Highest', 'High', 'Medium', 'Low', 'Lowest'].map(name => ({ name }))).map(priority => (
                                <MenuItem key={`${severity}-${priority.id || priority.name}`} value={priority.name}>{priority.name}</MenuItem>
                              ))}
                            </TextField>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={<Switch checked={jira.config.due_date_enabled !== false} onChange={e => setJiraConfig('due_date_enabled', e.target.checked)} />}
                  label="Set remediation due dates"
                />
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                  <Table size="small">
                    <TableBody>
                      {Object.keys(defaultSlaDays).map(severity => (
                        <TableRow key={severity}>
                          <TableCell sx={{ width: 150 }}>{severity}</TableCell>
                          <TableCell>
                            <TextField fullWidth size="small" type="number" label="Days"
                              value={(jira.config.sla_days || defaultSlaDays)[severity] || defaultSlaDays[severity]}
                              onChange={e => updateSlaDay(severity, e.target.value)} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth select label="Default components" value={jira.config.component_ids || []}
                  helperText="Optional. Routes findings to Jira components such as API, Frontend, Infrastructure."
                  onChange={e => setJiraConfig('component_ids', e.target.value)}
                  SelectProps={{ multiple: true }}>
                  {components.map(component => (
                    <MenuItem key={component.id} value={component.id}>{component.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth select label="Default assignee" value={jira.config.assignee_account_id || ''}
                  helperText="Optional. Leave blank to let the client's Jira triage queue assign it."
                  onChange={e => setJiraConfig('assignee_account_id', e.target.value)}>
                  <MenuItem value="">Unassigned</MenuItem>
                  {assignableUsers.map(user => (
                    <MenuItem key={user.account_id} value={user.account_id}>{user.display_name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth select label="Parent / Epic" value={jira.config.parent_key || ''}
                  helperText="Optional. Groups all findings under a remediation epic when Jira exposes one."
                  onChange={e => setJiraConfig('parent_key', e.target.value)}>
                  <MenuItem value="">No parent</MenuItem>
                  {parentIssues.map(issue => (
                    <MenuItem key={issue.key} value={issue.key}>{issue.key} - {issue.summary}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Create then transition to" value={jira.config.target_transition_name || ''}
                  helperText="Optional. Example: To Do, Backlog, Selected for Development. Leave blank to use Jira default."
                  onChange={e => setJiraConfig('target_transition_name', e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Default Jira labels" value={(jira.config.default_labels || []).join(', ')}
                  helperText="Comma separated. Severity/CWE/CVE labels are added automatically."
                  onChange={e => updateDefaultLabels(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="MainFrame public URL" value={jira.config.app_base_url || ''}
                  helperText="Optional. Used to add a View in MainFrame link on Jira issues once hosted."
                  onChange={e => setJiraConfig('app_base_url', e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Jira webhook secret" type="password" value={jira.config.jira_webhook_secret || ''}
                  helperText="Optional. Jira webhooks can send this as ?secret=... when the app is hosted."
                  onChange={e => setJiraConfig('jira_webhook_secret', e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={<Switch checked={jira.config.sync_status_to_finding !== false} onChange={e => setJiraConfig('sync_status_to_finding', e.target.checked)} />}
                  label="Sync Jira Done/In Progress status back to findings"
                />
              </Grid>
            </Grid>
          )}

          {step === 3 && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Supporting Evidence Images should map to Attachment. Text evidence is also included in the Jira description.
              </Alert>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>MainFrame finding field</TableCell>
                      <TableCell>Jira field</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sourceFields.map(field => (
                      <TableRow key={field.key}>
                        <TableCell>{field.label}</TableCell>
                        <TableCell>
                          <TextField fullWidth select size="small" value={jira.config.field_mappings?.[field.key] || 'description'}
                            onChange={e => updateMapping(field.key, e.target.value)}>
                            {fieldOptions.map(option => (
                              <MenuItem key={`${field.key}-${option.id}`} value={option.id}>{option.name}</MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {step === 4 && (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Jira is ready. Test Integration creates a fake placeholder finding and three evidence images in the selected Jira project. This drawer stays open so you can keep managing the connection.
              </Alert>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableBody>
                    <TableRow><TableCell>Jira site</TableCell><TableCell>{jira.config.site_url}</TableCell></TableRow>
                    <TableRow><TableCell>Client</TableCell><TableCell>{selectedOrganization?.name || '-'}</TableCell></TableRow>
                    <TableRow><TableCell>Service account</TableCell><TableCell>{jira.config.email}</TableCell></TableRow>
                    <TableRow><TableCell>Project</TableCell><TableCell>{jira.config.project_key}</TableCell></TableRow>
                    <TableRow><TableCell>Issue type</TableCell><TableCell>{jira.config.issue_type}</TableCell></TableRow>
                    <TableRow><TableCell>Priority mapping</TableCell><TableCell>{jira.config.priority_enabled !== false ? 'Enabled' : 'Disabled'}</TableCell></TableRow>
                    <TableRow><TableCell>Due dates</TableCell><TableCell>{jira.config.due_date_enabled !== false ? 'Enabled' : 'Disabled'}</TableCell></TableRow>
                    <TableRow><TableCell>Status sync</TableCell><TableCell>{jira.config.sync_status_to_finding !== false ? 'Enabled' : 'Disabled'}</TableCell></TableRow>
                    <TableRow><TableCell>Webhook receiver</TableCell><TableCell>/api/integrations/jira/webhook/</TableCell></TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>

        <Box sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={() => step === 0 ? setDrawerOpen(false) : setStep(step - 1)}>
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step === 0 && (
            <Button variant="contained" onClick={testAndContinue} disabled={saving}
              sx={{ bgcolor: theme.palette.primary.main }}>
              {saving ? <CircularProgress size={18} /> : 'Test Connectivity'}
            </Button>
          )}
          {step === 1 && (
            <Button variant="contained" onClick={continueProject} disabled={saving}
              sx={{ bgcolor: theme.palette.primary.main }}>
              {saving ? <CircularProgress size={18} /> : 'Continue'}
            </Button>
          )}
          {step === 2 && (
            <Button variant="contained" onClick={savePipeline} disabled={saving}
              sx={{ bgcolor: theme.palette.primary.main }}>
              {saving ? <CircularProgress size={18} /> : 'Save Pipeline'}
            </Button>
          )}
          {step === 3 && (
            <Button variant="contained" onClick={saveMappings} disabled={saving}
              sx={{ bgcolor: theme.palette.primary.main }}>
              {saving ? <CircularProgress size={18} /> : 'Save Mappings'}
            </Button>
          )}
          {step === 4 && (
            <Button variant="contained" onClick={sendTestIssue} disabled={saving}
              sx={{ bgcolor: theme.palette.primary.main }}>
              {saving ? <CircularProgress size={18} /> : 'Test Integration'}
            </Button>
          )}
        </Box>
      </Drawer>

      <Drawer anchor="right" open={serviceNowDrawerOpen} onClose={() => setServiceNowDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', md: 720 }, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{
          px: 3, py: 2.5, color: '#102027',
          background: 'linear-gradient(135deg, #D8F1E4 0%, #A7D7C5 52%, #81B5A1 100%)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LogoTile src={logos.servicenow} label="ServiceNow" keyName="servicenow" />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={800}>ServiceNow Draft</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(16,32,39,0.75)' }}>
                Stage {selectedOrganization?.name || 'this client'} settings until the PDI is available.
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Live ServiceNow testing is intentionally disabled until a Personal Developer Instance is available. These settings are saved as a client-scoped draft only.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="ServiceNow instance URL"
                value={serviceNow.config.instance_url}
                onChange={e => setServiceNowConfig('instance_url', e.target.value)}
                placeholder="https://your-instance.service-now.com" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Auth method" value={serviceNow.config.auth_method}
                onChange={e => setServiceNowConfig('auth_method', e.target.value)}>
                <MenuItem value="basic">Basic service account</MenuItem>
                <MenuItem value="oauth">OAuth / token later</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Target workflow" value={serviceNow.config.target_table}
                onChange={e => setServiceNowConfig('target_table', e.target.value)}>
                <MenuItem value="incident">Incident</MenuItem>
                <MenuItem value="sc_task">Service Catalog Task</MenuItem>
                <MenuItem value="sn_vul_vulnerable_item">Vulnerability Response Item</MenuItem>
                <MenuItem value="custom">Custom table later</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Service account username"
                value={serviceNow.config.username}
                onChange={e => setServiceNowConfig('username', e.target.value)}
                placeholder="mainframe.integration" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Password / token placeholder" type="password"
                value={serviceNow.config.password}
                onChange={e => setServiceNowConfig('password', e.target.value)}
                helperText="Stored masked by the API response; replace once PDI details are ready." />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Default assignment group"
                value={serviceNow.config.assignment_group}
                onChange={e => setServiceNowConfig('assignment_group', e.target.value)}
                placeholder="Security Operations / Vulnerability Management" />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Button onClick={() => setServiceNowDrawerOpen(false)}>Close</Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button color="error" variant="outlined" onClick={revokeServiceNow} disabled={saving}>Clear Draft</Button>
            <Button variant="contained" onClick={saveServiceNowDraft} disabled={saving}
              sx={{ bgcolor: theme.palette.primary.main }}>
              {saving ? <CircularProgress size={18} /> : 'Save Draft'}
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
}

function EmailNotificationsTab() {
  const { enqueueSnackbar } = useSnackbar();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTmpl, setEditTmpl] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications/templates/');
      setTemplates(res.data.results || res.data);
    } catch { setTemplates([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editTmpl.id) {
        await api.patch(`/notifications/templates/${editTmpl.id}/`, editTmpl);
      } else {
        await api.post('/notifications/templates/', editTmpl);
      }
      enqueueSnackbar('Template saved', { variant: 'success' });
      setEditTmpl(null);
      load();
    } catch { enqueueSnackbar('Failed to save template', { variant: 'error' }); }
    setSaving(false);
  };

  const notificationEvents = [
    { key: 'new_finding',        label: 'New Finding Added',      icon: <Notifications fontSize="small" /> },
    { key: 'finding_published',  label: 'Finding Published',      icon: <Notifications fontSize="small" /> },
    { key: 'report_ready',       label: 'Report Ready for Review', icon: <Notifications fontSize="small" /> },
    { key: 'engagement_update',  label: 'Engagement Updated',     icon: <Notifications fontSize="small" /> },
    { key: 'new_assignment',     label: 'New Assignment',         icon: <Notifications fontSize="small" /> },
    { key: 'comment',            label: 'New Comment',            icon: <Notifications fontSize="small" /> },
  ];

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>Email Notification Settings</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure which events trigger email notifications and customise the email templates.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Notification Events</Typography>
            <List dense disablePadding>
              {notificationEvents.map(ev => (
                <ListItem key={ev.key} disablePadding sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>{ev.icon}</ListItemIcon>
                  <ListItemText primary={ev.label} primaryTypographyProps={{ variant: 'body2' }} />
                  <FormControlLabel control={<Switch defaultChecked size="small" />} label="" sx={{ mr: 0 }} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700}>Email Templates</Typography>
              <Button size="small" startIcon={<Add />} onClick={() => setEditTmpl({ name: '', subject: '', body: '', event_type: '' })}>
                New Template
              </Button>
            </Box>
            {loading ? <CircularProgress size={20} /> : templates.length === 0 ? (
              <Alert severity="info" sx={{ fontSize: '0.8rem' }}>No custom email templates configured. System defaults are in use.</Alert>
            ) : (
              <List dense disablePadding>
                {templates.map(t => (
                  <ListItem key={t.id} divider
                    secondaryAction={
                      <IconButton size="small" onClick={() => setEditTmpl(t)}><Edit fontSize="small" /></IconButton>
                    }>
                    <ListItemText primary={t.name} secondary={t.event_type}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                      secondaryTypographyProps={{ variant: 'caption' }} />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Edit Template Dialog */}
      <Dialog open={!!editTmpl} onClose={() => setEditTmpl(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editTmpl?.id ? 'Edit Template' : 'New Template'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Template Name" value={editTmpl?.name || ''}
                onChange={e => setEditTmpl(p => ({ ...p, name: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Subject" value={editTmpl?.subject || ''}
                onChange={e => setEditTmpl(p => ({ ...p, subject: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Body" value={editTmpl?.body || ''}
                onChange={e => setEditTmpl(p => ({ ...p, body: e.target.value }))}
                multiline rows={5} placeholder="Use {{user_name}}, {{finding_title}}, {{report_url}} etc." />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTmpl(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Security Tab ──────────────────────────────────────────────────────────────
function SecurityTab() {
  const theme = useTheme();

  const settings = [
    { label: 'Enforce MFA for all users', desc: 'Require multi-factor authentication on login for every account', defaultOn: false },
    { label: 'Enforce MFA for Admins only', desc: 'Require MFA only for Admin and Super Admin roles', defaultOn: true },
    { label: 'Session timeout (30 min)', desc: 'Automatically log out inactive sessions after 30 minutes', defaultOn: true },
    { label: 'Restrict login to SSO only', desc: 'Disable password login and require SSO authentication', defaultOn: false },
    { label: 'IP allowlist enforcement', desc: 'Restrict access to specific IP ranges (configure ranges below)', defaultOn: false },
    { label: 'Audit log retention (90 days)', desc: 'Keep audit logs for 90 days before purging', defaultOn: true },
  ];

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>Security Settings</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Control authentication requirements, session policy, and access restrictions.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Authentication & Access</Typography>
            <List disablePadding>
              {settings.map((s, i) => (
                <React.Fragment key={i}>
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <ListItemText
                      primary={s.label}
                      secondary={s.desc}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                      secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                    />
                    <FormControlLabel control={<Switch defaultChecked={s.defaultOn} size="small" />} label="" sx={{ mr: 0, ml: 2 }} />
                  </ListItem>
                  {i < settings.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Password Policy</Typography>
            <Grid container spacing={1.5}>
              {[
                { label: 'Minimum length', value: '12' },
                { label: 'Max age (days)', value: '90' },
                { label: 'History count', value: '5' },
              ].map(f => (
                <Grid item xs={12} key={f.label}>
                  <TextField fullWidth size="small" label={f.label} defaultValue={f.value} type="number" />
                </Grid>
              ))}
              <Grid item xs={12}>
                <FormControlLabel control={<Switch defaultChecked size="small" />} label={<Typography variant="body2">Require uppercase + numbers</Typography>} />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel control={<Switch defaultChecked size="small" />} label={<Typography variant="body2">Require special characters</Typography>} />
              </Grid>
            </Grid>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>IP Allowlist</Typography>
            <TextField fullWidth size="small" multiline rows={3}
              placeholder={"192.168.1.0/24\n10.0.0.0/8"}
              helperText="One CIDR range per line. Leave blank to allow all IPs." />
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" sx={{ bgcolor: theme.palette.primary.main }}>Save Security Settings</Button>
      </Box>
    </Box>
  );
}

// ── Licensing Tab ─────────────────────────────────────────────────────────────
function LicensingTab() {
  const theme = useTheme();

  const stats = [
    { label: 'Active Users', value: '—', icon: <People /> },
    { label: 'Organisations', value: '—', icon: <Business /> },
    { label: 'Reports Generated', value: '—', icon: <Receipt /> },
    { label: 'Findings Created', value: '—', icon: <Shield /> },
  ];

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>Licensing & Usage</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Current licence status and platform usage metrics.
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderColor: theme.palette.primary.main, borderWidth: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <VerifiedUser sx={{ fontSize: 40, color: theme.palette.primary.main }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>MainFrame — Self-Hosted</Typography>
            <Chip label="Active" color="success" size="small" sx={{ mt: 0.5 }} />
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {[
            { label: 'Licence Type', value: 'Self-Hosted / Unlimited' },
            { label: 'Version', value: '1.0.0' },
            { label: 'Issued To', value: 'OziCyber' },
            { label: 'Support', value: 'Internal' },
          ].map(f => (
            <Grid item xs={6} md={3} key={f.label}>
              <Typography variant="caption" color="text.secondary" display="block">{f.label}</Typography>
              <Typography variant="body2" fontWeight={600}>{f.value}</Typography>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Usage Metrics</Typography>
      <Grid container spacing={2}>
        {stats.map(s => (
          <Grid item xs={6} md={3} key={s.label}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ color: theme.palette.primary.main, mb: 0.5 }}>{s.icon}</Box>
                <Typography variant="h5" fontWeight={700}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// ── Audit Log Tab ─────────────────────────────────────────────────────────────
function AuditLogTab() {
  const mockLogs = [
    { id: 1, time: '2026-04-19 09:14:22', user: 'alex.young@ozicyber.com.au', action: 'User login', resource: 'auth', level: 'info' },
    { id: 2, time: '2026-04-19 09:15:01', user: 'alex.young@ozicyber.com.au', action: 'Report exported (DOCX)', resource: 'reports', level: 'info' },
    { id: 3, time: '2026-04-19 08:50:44', user: 'alex.young@ozicyber.com.au', action: 'Finding created', resource: 'findings', level: 'info' },
    { id: 4, time: '2026-04-19 08:30:10', user: 'system', action: 'Scheduled backup completed', resource: 'system', level: 'success' },
    { id: 5, time: '2026-04-18 17:22:15', user: 'alex.young@ozicyber.com.au', action: 'User role changed', resource: 'auth', level: 'warning' },
  ];

  const levelColor = { info: '#1976d2', success: '#2e7d32', warning: '#e65100', error: '#c62828' };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Audit Log</Typography>
          <Typography variant="body2" color="text.secondary">System and user activity history</Typography>
        </Box>
        <Button variant="outlined" startIcon={<Refresh />} size="small">Refresh</Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
        Full audit logging will be wired to backend events in a future update. Showing sample entries.
      </Alert>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Resource</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Level</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mockLogs.map(log => (
              <TableRow key={log.id} hover>
                <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{log.time}</Typography></TableCell>
                <TableCell><Typography variant="body2">{log.user}</Typography></TableCell>
                <TableCell><Typography variant="body2">{log.action}</Typography></TableCell>
                <TableCell><Chip label={log.resource} size="small" variant="outlined" /></TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Circle sx={{ fontSize: 8, color: levelColor[log.level] }} />
                    <Typography variant="caption" sx={{ color: levelColor[log.level], fontWeight: 600, textTransform: 'capitalize' }}>{log.level}</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ── Branding Tab ─────────────────────────────────────────────────────────────
const COLOR_PRESETS = [
  { label: 'OziCyber (Default)', primary: '#24483E', secondary: '#FFF1AA' },
  { label: 'Midnight Blue',      primary: '#1a237e', secondary: '#e3f2fd' },
  { label: 'Corporate Navy',     primary: '#0d1b2a', secondary: '#e8c547' },
  { label: 'Cyber Red',          primary: '#b71c1c', secondary: '#f5f5f5' },
  { label: 'Purple Pro',         primary: '#4a148c', secondary: '#e1bee7' },
  { label: 'Slate & Teal',       primary: '#263238', secondary: '#80cbc4' },
];

function BrandingTab() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const { primaryColor, secondaryColor, logoUrl, logoSize, companyName, poweredByVisible, faviconUrl, update, reset } = useBrandingStore();

  const [localPrimary, setLocalPrimary]     = useState(primaryColor);
  const [localSecondary, setLocalSecondary] = useState(secondaryColor);
  const [localName, setLocalName]           = useState(companyName);
  const [localPowered, setLocalPowered]     = useState(poweredByVisible);
  const [localLogo, setLocalLogo]           = useState(logoUrl);
  const [localLogoSize, setLocalLogoSize]   = useState(logoSize || 52);
  const [localFavicon, setLocalFavicon]     = useState(faviconUrl);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { enqueueSnackbar('Logo must be under 500 KB', { variant: 'warning' }); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setLocalLogo(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleFaviconUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024) { enqueueSnackbar('Favicon must be under 100 KB', { variant: 'warning' }); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setLocalFavicon(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    update({
      primaryColor:    localPrimary,
      secondaryColor:  localSecondary,
      companyName:     localName,
      poweredByVisible: localPowered,
      logoUrl:         localLogo,
      logoSize:        localLogoSize,
      faviconUrl:      localFavicon,
    });
    enqueueSnackbar('Branding saved — reload to see all changes', { variant: 'success' });
  };

  const handleReset = () => {
    reset();
    setLocalPrimary('#24483E');
    setLocalSecondary('#FFF1AA');
    setLocalName('MainFrame');
    setLocalPowered(true);
    setLocalLogo(null);
    setLocalLogoSize(52);
    setLocalFavicon(null);
    enqueueSnackbar('Branding reset to OziCyber defaults', { variant: 'info' });
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>Branding & White-Label</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Customise the platform appearance for your organisation or reseller tenants.
      </Typography>

      <Grid container spacing={3}>
        {/* Left column — controls */}
        <Grid item xs={12} md={7}>

          {/* Company name */}
          <Paper variant="outlined" sx={{ p: 2.5, mb: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Organisation Name</Typography>
            <TextField
              fullWidth size="small"
              label="Display name shown in the sidebar"
              value={localName}
              onChange={e => setLocalName(e.target.value)}
            />
          </Paper>

          {/* Logo upload */}
          <Paper variant="outlined" sx={{ p: 2.5, mb: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Logo</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
              Upload a PNG or SVG (max 500 KB). The logo fills the sidebar header width — use the size slider to control max height.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {localLogo ? (
                <Box
                  component="img" src={localLogo} alt="preview"
                  sx={{ height: 38, maxWidth: 160, objectFit: 'contain', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5 }}
                />
              ) : (
                <Box sx={{ height: 38, width: 100, border: '1px dashed', borderColor: 'divider', borderRadius: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="caption" color="text.disabled">No logo</Typography>
                </Box>
              )}
              <Button variant="outlined" component="label" startIcon={<Upload />} size="small">
                Upload
                <input type="file" hidden accept="image/png,image/svg+xml,image/jpeg" onChange={handleLogoUpload} />
              </Button>
              {localLogo && (
                <Button size="small" color="error" onClick={() => setLocalLogo(null)}>Remove</Button>
              )}
            </Box>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
              When a logo is uploaded the company name text is hidden. Upload a logo that includes your text, or leave blank to show the name.
            </Typography>
            {localLogo && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Logo size</Typography>
                  <Typography variant="caption" fontWeight={700} sx={{ fontFamily: 'monospace' }}>{localLogoSize}px</Typography>
                </Box>
                <Slider
                  value={localLogoSize}
                  onChange={(_, v) => { setLocalLogoSize(v); update({ logoSize: v }); }}
                  min={24} max={200} step={2}
                  size="small"
                  marks={[{ value: 24, label: 'S' }, { value: 112, label: 'M' }, { value: 200, label: 'L' }]}
                />
              </Box>
            )}
          </Paper>

          {/* Favicon upload */}
          <Paper variant="outlined" sx={{ p: 2.5, mb: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Browser Tab Icon (Favicon)</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
              Upload a square PNG, SVG or ICO (max 100 KB). Shown in the browser tab and bookmarks. 32×32 or 64×64 px recommended.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {localFavicon ? (
                <Box
                  component="img" src={localFavicon} alt="favicon preview"
                  sx={{ height: 32, width: 32, objectFit: 'contain', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.25 }}
                />
              ) : (
                <Box sx={{
                  height: 32, width: 32, border: '1px dashed', borderColor: 'divider', borderRadius: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.55rem' }}>None</Typography>
                </Box>
              )}
              <Button variant="outlined" component="label" startIcon={<Upload />} size="small">
                Upload
                <input type="file" hidden accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon" onChange={handleFaviconUpload} />
              </Button>
              {localFavicon && (
                <Button size="small" color="error" onClick={() => setLocalFavicon(null)}>Remove</Button>
              )}
            </Box>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
              Changes take effect immediately after saving — no page reload needed.
            </Typography>
          </Paper>

          {/* Colour presets */}
          <Paper variant="outlined" sx={{ p: 2.5, mb: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Colour Theme</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
              Choose a preset or set custom hex values below.
            </Typography>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              {COLOR_PRESETS.map(p => {
                const active = localPrimary === p.primary && localSecondary === p.secondary;
                return (
                  <Grid item xs={6} sm={4} key={p.label}>
                    <Box
                      onClick={() => { setLocalPrimary(p.primary); setLocalSecondary(p.secondary); }}
                      sx={{
                        border: '2px solid', borderColor: active ? p.primary : 'divider',
                        borderRadius: 1.5, p: 1, cursor: 'pointer', transition: 'all 0.15s',
                        '&:hover': { borderColor: p.primary },
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 0.5, mb: 0.75 }}>
                        <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: p.primary }} />
                        <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: p.secondary, border: '1px solid', borderColor: 'divider' }} />
                      </Box>
                      <Typography variant="caption" fontWeight={active ? 700 : 400} sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                        {p.label}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>Primary colour</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    component="input" type="color"
                    value={localPrimary}
                    onChange={e => setLocalPrimary(e.target.value)}
                    style={{ width: 36, height: 36, padding: 2, border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', background: 'none' }}
                  />
                  <TextField size="small" value={localPrimary}
                    onChange={e => setLocalPrimary(e.target.value)}
                    inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
                    sx={{ flex: 1 }} />
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>Secondary / accent colour</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    component="input" type="color"
                    value={localSecondary}
                    onChange={e => setLocalSecondary(e.target.value)}
                    style={{ width: 36, height: 36, padding: 2, border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', background: 'none' }}
                  />
                  <TextField size="small" value={localSecondary}
                    onChange={e => setLocalSecondary(e.target.value)}
                    inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
                    sx={{ flex: 1 }} />
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Powered by */}
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>OziCyber Watermark</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
              Show a "Powered by OziCyber" credit in the sidebar footer. Required under the standard reseller licence.
            </Typography>
            <FormControlLabel
              control={<Switch checked={localPowered} onChange={e => setLocalPowered(e.target.checked)} />}
              label={<Typography variant="body2">Show "Powered by OziCyber" in sidebar</Typography>}
            />
          </Paper>
        </Grid>

        {/* Right column — live preview */}
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: 2, position: 'sticky', top: 80 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Live Preview</Typography>
            <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
              {/* Simulated sidebar */}
              <Box sx={{ bgcolor: localPrimary, width: '100%' }}>
                {/* Header */}
                <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {localLogo ? (
                    <Box component="img" src={localLogo} alt="" sx={{ height: Math.round(localLogoSize * 0.65), width: 'auto', maxWidth: '100%', display: 'block', mx: 'auto' }} />
                  ) : (
                    <>
                      <Box sx={{ width: 30, height: 30, bgcolor: localSecondary, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box sx={{ width: 16, height: 16, bgcolor: localPrimary, borderRadius: 0.5 }} />
                      </Box>
                      <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>{localName || 'MainFrame'}</Typography>
                    </>
                  )}
                </Box>
                {/* Nav items */}
                {['Dashboard', 'Assessments', 'Reports'].map((item, i) => (
                  <Box key={item} sx={{
                    px: 2, py: 0.75, display: 'flex', alignItems: 'center', gap: 1.5, mx: 1, my: 0.25, borderRadius: 1,
                    bgcolor: i === 0 ? localSecondary : 'transparent',
                  }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: i === 0 ? localPrimary : 'rgba(255,255,255,0.5)' }} />
                    <Typography sx={{ color: i === 0 ? localPrimary : 'rgba(255,255,255,0.85)', fontSize: '0.78rem', fontWeight: i === 0 ? 700 : 400 }}>
                      {item}
                    </Typography>
                  </Box>
                ))}
                {/* Powered by */}
                {localPowered && (
                  <Box sx={{ px: 2, py: 1, mt: 1, borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>
                      Powered by <Box component="span" sx={{ color: localSecondary, fontWeight: 700 }}>OziCyber</Box>
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
        <Button variant="outlined" startIcon={<RestartAlt />} onClick={handleReset} color="inherit">
          Reset to Defaults
        </Button>
        <Button variant="contained" onClick={handleSave} sx={{ bgcolor: theme.palette.primary.main }}>
          Save Branding
        </Button>
      </Box>
    </Box>
  );
}

// ── Main AdminPortal ──────────────────────────────────────────────────────────
export default function AdminPortal() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tab, setTab] = useState(0);

  if (!['SUPERADMIN', 'ADMIN'].includes(user?.role)) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <LockPerson sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">Access Restricted</Typography>
        <Typography variant="body2" color="text.disabled">Admin Portal requires Admin or Super Admin role.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </Box>
    );
  }

  const isPlatformAdmin = Boolean(user?.is_superuser);
  const tabs = [
    ...(isPlatformAdmin ? [{ label: 'Tenancies', icon: <Business fontSize="small" />, component: <TenanciesAdmin /> }] : []),
    { label: 'RBAC',           icon: <People fontSize="small" />, component: <RBACTab /> },
    { label: 'Branding',       icon: <Palette fontSize="small" />, component: <BrandingTab /> },
    { label: 'Integrations',   icon: <Extension fontSize="small" />, component: <IntegrationsMarketplaceTab /> },
    { label: 'Notifications',  icon: <Email fontSize="small" />, component: <EmailNotificationsTab /> },
    { label: 'Security',       icon: <Security fontSize="small" />, component: <SecurityTab /> },
    { label: 'Licensing',      icon: <Key fontSize="small" />, component: <LicensingTab /> },
    { label: 'Audit Log',      icon: <VpnKey fontSize="small" />, component: <AuditLogTab /> },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box sx={{
          width: 48, height: 48, borderRadius: 2,
          bgcolor: theme.palette.primary.main,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AdminPanelSettings sx={{ color: '#fff', fontSize: 28 }} />
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={700}>Admin Portal</Typography>
          <Typography variant="body2" color="text.secondary">
            Platform configuration, user management and system settings
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper variant="outlined" sx={{ mb: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 52 },
            '& .Mui-selected': { color: theme.palette.primary.main },
            '& .MuiTabs-indicator': { bgcolor: theme.palette.primary.main },
          }}
        >
          {tabs.map((t, i) => (
            <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {tabs.map((item, index) => (
            <TabPanel key={item.label} value={tab} index={index}>{item.component}</TabPanel>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
