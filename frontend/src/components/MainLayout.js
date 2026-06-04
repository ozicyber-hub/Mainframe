import React, { useState, useEffect, useCallback, useRef, useContext, createContext } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Chip,
  Badge,
  Popover,
  Button,
  Snackbar,
  Alert,
  Breadcrumbs,
  Link,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  Assessment as AssessmentIcon,
  Folder as FolderIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  FactCheck as AssessmentsIcon,
  AdminPanelSettings,
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  NavigateNext,
  VerifiedUser as GrcIcon,
  HelpOutline as HelpIcon,
  SupportAgent as SupportAgentIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { useBrandingStore } from '../store/brandingStore';
import api from '../utils/api';

const DRAWER_WIDTH = 260;
const PageBreadcrumbContext = createContext(() => {});

export const usePageBreadcrumbs = (breadcrumbs) => {
  const setBreadcrumbs = useContext(PageBreadcrumbContext);
  useEffect(() => {
    setBreadcrumbs(breadcrumbs || []);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, breadcrumbs]);
};

const ALL_NAV = [
  { path: '/dashboard',     label: 'Dashboard',     icon: <DashboardIcon />,  roles: null },
  { path: '/organizations', label: 'Organizations',  icon: <BusinessIcon />,   roles: ['SUPERADMIN', 'ADMIN'] },
  { path: '/clients',       label: 'Clients',        icon: <PeopleIcon />,     roles: ['SUPERADMIN', 'ADMIN'] },
  { path: '/calendar',      label: 'Calendar',       icon: <CalendarIcon />,   roles: null },
  { path: '/engagements',   label: 'Engagements',    icon: <AssessmentIcon />,  roles: ['SUPERADMIN', 'ADMIN', 'PENTESTER', 'PROJECT_MANAGER'] },
  { path: '/grc',           label: 'GRC',            icon: <GrcIcon />,         roles: ['SUPERADMIN', 'ADMIN', 'GRC_CONSULTANT', 'PROJECT_MANAGER'], activePaths: ['/grc', '/assessments'] },
  { path: '/repository',    label: 'Repository',     icon: <FolderIcon />,     roles: ['SUPERADMIN', 'ADMIN', 'PENTESTER', 'PROJECT_MANAGER'] },
  { path: '/settings',      label: 'Settings',       icon: <SettingsIcon />,   roles: null },
];

const MainLayout = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { logoUrl, logoSize, companyName, poweredByVisible, faviconUrl } = useBrandingStore();

  // Keep browser tab icon in sync with the branding store favicon
  useEffect(() => {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl || '/favicon.ico';
    link.type = faviconUrl?.startsWith('data:image/svg') ? 'image/svg+xml'
              : faviconUrl?.startsWith('data:image/png') ? 'image/png'
              : 'image/x-icon';
  }, [faviconUrl]);
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [anchorEl,      setAnchorEl]      = useState(null);
  const [notifAnchor,   setNotifAnchor]   = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notifToast,    setNotifToast]    = useState('');
  const [pageBreadcrumbs, setPageBreadcrumbs] = useState([]);
  const prevUnreadRef = useRef(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications/');
      setNotifications(res.data.results || res.data);
    } catch {}
  }, []);

  // Poll every 10 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Show toast when new unread notifications arrive
  useEffect(() => {
    const unread = notifications.filter(n => !n.is_read).length;
    if (unread > prevUnreadRef.current) {
      const newest = notifications.find(n => !n.is_read);
      if (newest) setNotifToast(newest.title);
    }
    prevUnreadRef.current = unread;
  }, [notifications]);

  // Listen for assignment events dispatched by Calendar.js
  useEffect(() => {
    const handler = () => fetchNotifications();
    window.addEventListener('ozireport_assignment', handler);
    return () => window.removeEventListener('ozireport_assignment', handler);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark_all_read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const userRole = user?.role || '';
  const navigationItems = ALL_NAV.filter(item =>
    item.roles === null || item.roles.includes(userRole)
  );
  const activeNav = navigationItems.find((item) =>
    (item.activePaths ?? [item.path]).some(p => location.pathname.startsWith(p))
  );

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
    navigate('/login');
  };

  const openSupportPortal = (path = '') => {
    const baseUrl = process.env.REACT_APP_SUPPORT_PORTAL_URL || 'http://localhost:8080';
    const params = new URLSearchParams({
      product: 'mainframe',
      email: user?.email || '',
    });
    window.open(`${baseUrl}${path}?${params.toString()}`, '_blank', 'noopener,noreferrer');
    handleProfileMenuClose();
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo Section */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 70,
          px: 2,
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, width: '100%' }}>
          {logoUrl ? (
            <Box
              component="img"
              src={logoUrl}
              alt="logo"
              style={{
                height: `${logoSize || 58}px`,
                width: 'auto',
                maxWidth: '240px',
                display: 'block',
              }}
            />
          ) : (
            <>
              <Box
                sx={{
                  width: 40, height: 40,
                  backgroundColor: theme.palette.secondary.main,
                  borderRadius: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <AssessmentIcon sx={{ color: theme.palette.primary.main, fontSize: 24 }} />
              </Box>
              <Typography variant="h5" fontWeight={700}>
                {companyName || 'MainFrame'}
              </Typography>
            </>
          )}
        </Box>
      </Box>

      {/* Navigation */}
      <List sx={{ pt: 1, flexGrow: 1 }}>
        {navigationItems.map((item) => {
          const isActive = (item.activePaths ?? [item.path]).some(p => location.pathname.startsWith(p));
          return (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  mx: 1, my: 0.5, borderRadius: 2,
                  backgroundColor: isActive ? theme.palette.secondary.main : 'transparent',
                  '&:hover': {
                    backgroundColor: isActive ? theme.palette.secondary.main : 'rgba(255,255,255,0.12)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isActive ? theme.palette.primary.main : 'rgba(255,255,255,0.8)' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? theme.palette.primary.main : 'rgba(255,255,255,0.9)',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Powered by OziCyber */}
      {poweredByVisible && (
        <Box sx={{ px: 2, py: 1.5, mt: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 }}>
            Powered by{' '}
            <Box component="span" sx={{ color: theme.palette.secondary.main, fontWeight: 700 }}>
              OziCyber
            </Box>
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <PageBreadcrumbContext.Provider value={setPageBreadcrumbs}>
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
          backgroundColor: theme.palette.background.paper,
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 56 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 1.5, display: { sm: 'none' }, color: 'text.primary' }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip
              size="small"
              variant="outlined"
              label={user?.organization_name || companyName || activeNav?.label || 'MainFrame'}
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                maxWidth: 240,
                fontWeight: 600,
                flexShrink: 0,
                '& .MuiChip-label': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                },
              }}
            />
            {pageBreadcrumbs.length > 0 && (
              <Breadcrumbs
                separator={<NavigateNext sx={{ fontSize: 16 }} />}
                maxItems={4}
                itemsAfterCollapse={2}
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  minWidth: 0,
                  flex: 1,
                  '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' },
                  '& .MuiBreadcrumbs-li': { minWidth: 0 },
                }}
              >
                {pageBreadcrumbs.map((item, index) => {
                  const isLast = index === pageBreadcrumbs.length - 1;
                  return isLast || !item.to ? (
                    <Typography
                      key={`${item.label}-${index}`}
                      variant="body2"
                      noWrap
                      sx={{ color: 'text.primary', fontWeight: 700, maxWidth: 360 }}
                    >
                      {item.label}
                    </Typography>
                  ) : (
                    <Link
                      key={`${item.label}-${index}`}
                      component="button"
                      variant="body2"
                      underline="hover"
                      onClick={() => navigate(item.to)}
                      sx={{
                        color: 'text.secondary',
                        cursor: 'pointer',
                        maxWidth: 220,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: 'left',
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </Breadcrumbs>
            )}
          </Box>

          {/* Notification Bell */}
          <IconButton id="notif-bell" onClick={(e) => { setNotifAnchor(e.currentTarget); fetchNotifications(); }} sx={{ mr: 0.5 }}>
            <Badge badgeContent={unreadCount} color="error" max={99}>
              {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
            </Badge>
          </IconButton>

          {/* User Profile */}
          <IconButton onClick={handleProfileMenuOpen} sx={{ ml: 1 }}>
            <Avatar
              src={user?.avatar}
              sx={{
                width: 36,
                height: 36,
                bgcolor: theme.palette.primary.main,
                border: `2px solid ${theme.palette.secondary.main}`,
              }}
            >
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </Avatar>
          </IconButton>

          <Box sx={{ ml: 1.5, display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2" fontWeight={500}>
              {user?.first_name} {user?.last_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.role_display || user?.role}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* User Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        sx={{ mt: 1 }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" fontWeight={600}>
            {user?.first_name} {user?.last_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.email}
          </Typography>
          <Chip
            label={user?.role_display || user?.role}
            size="small"
            sx={{ mt: 0.5, bgcolor: theme.palette.primary.main, color: 'white' }}
          />
        </Box>
        <Divider />
        <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/settings'); }}>
          <ListItemIcon>
            <AccountCircleIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        {['SUPERADMIN', 'ADMIN'].includes(user?.role) && (
          <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/admin'); }}>
            <ListItemIcon>
              <AdminPanelSettings fontSize="small" />
            </ListItemIcon>
            Admin Portal
          </MenuItem>
        )}
        <MenuItem onClick={() => openSupportPortal('/knowledge/')}>
          <ListItemIcon>
            <HelpIcon fontSize="small" />
          </ListItemIcon>
          Help
        </MenuItem>
        <MenuItem onClick={() => openSupportPortal('/')}>
          <ListItemIcon>
            <SupportAgentIcon fontSize="small" />
          </ListItemIcon>
          Support Portal
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      {/* Notifications Popover */}
      <Popover
        open={Boolean(notifAnchor)}
        anchorEl={notifAnchor}
        onClose={() => setNotifAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 380, maxHeight: 520, display: 'flex', flexDirection: 'column' } }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={handleMarkAllRead} sx={{ fontSize: '0.72rem' }}>Mark all read</Button>
          )}
        </Box>
        <Box sx={{ overflowY: 'auto', flex: 1 }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <NotificationsNoneIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
              <Typography variant="body2">No notifications yet</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifications.slice(0, 50).map((n, i) => (
                <React.Fragment key={n.id}>
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      py: 1.25, px: 2,
                      bgcolor: n.is_read ? 'transparent' : `${theme.palette.primary.main}08`,
                      cursor: 'default',
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                        {!n.is_read && (
                          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: theme.palette.primary.main, flexShrink: 0 }} />
                        )}
                        <Typography variant="body2" fontWeight={n.is_read ? 400 : 700} noWrap sx={{ flex: 1 }}>
                          {n.title}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
                        {n.message}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                        {new Date(n.created_at).toLocaleString()}
                      </Typography>
                    </Box>
                  </ListItem>
                  {i < notifications.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Popover>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              backgroundColor: theme.palette.primary.main,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              backgroundColor: theme.palette.primary.main,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* New notification toast */}
      <Snackbar
        open={!!notifToast}
        autoHideDuration={5000}
        onClose={() => setNotifToast('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 7 }}
      >
        <Alert
          onClose={() => setNotifToast('')}
          severity="info"
          variant="filled"
          sx={{ width: '100%', bgcolor: theme.palette.primary.main, cursor: 'pointer' }}
          onClick={() => { setNotifToast(''); setNotifAnchor(document.getElementById('notif-bell')); fetchNotifications(); }}
        >
          🔔 {notifToast}
        </Alert>
      </Snackbar>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 56 } }} />
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </Box>
      </Box>
    </PageBreadcrumbContext.Provider>
  );
};

export default MainLayout;
