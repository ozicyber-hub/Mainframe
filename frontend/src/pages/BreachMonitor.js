import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Alert, CircularProgress, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, MenuItem, Collapse,
  LinearProgress,
} from '@mui/material';
import {
  Search, Warning, BugReport, ExpandMore, ExpandLess,
  FileDownload, Refresh, Info,
} from '@mui/icons-material';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';

const DATA_CLASS_COLORS = {
  'Email addresses':     '#2980b9',
  'Passwords':           '#c0392b',
  'Usernames':           '#8e44ad',
  'IP addresses':        '#d35400',
  'Phone numbers':       '#27ae60',
  'Physical addresses':  '#7f8c8d',
  'Names':               '#2c3e50',
  'Dates of birth':      '#16a085',
  'Credit cards':        '#e74c3c',
  'Social security numbers': '#c0392b',
};

const severityForBreach = (b) => {
  const classes = b.DataClasses || [];
  if (classes.some(c => ['Passwords','Credit cards','Social security numbers'].includes(c))) return 'CRITICAL';
  if (b.PwnCount > 500000) return 'HIGH';
  if (b.PwnCount > 50000)  return 'MEDIUM';
  return 'LOW';
};

const SEV_COLOR = { CRITICAL: '#c0392b', HIGH: '#e17468', MEDIUM: '#f39c12', LOW: '#49A58B' };

function BreachRow({ breach, engagements, onImport }) {
  const [open, setOpen] = useState(false);
  const [importDlg, setImportDlg] = useState(false);
  const [engId, setEngId] = useState('');
  const [importing, setImporting] = useState(false);
  const sev = severityForBreach(breach);

  const handleImport = async () => {
    if (!engId) return;
    setImporting(true);
    try {
      await onImport(breach, parseInt(engId));
      setImportDlg(false);
      setEngId('');
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell sx={{ width: 32, p: 0.5 }}>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={600}>{breach.Title || breach.Name}</Typography>
          {breach.Domain && <Typography variant="caption" color="text.secondary">{breach.Domain}</Typography>}
        </TableCell>
        <TableCell>
          <Chip label={sev} size="small"
            sx={{ bgcolor: SEV_COLOR[sev], color: '#fff', fontWeight: 700, fontSize: '0.65rem' }} />
        </TableCell>
        <TableCell>
          <Typography variant="body2">{breach.BreachDate || '—'}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{breach.PwnCount?.toLocaleString() || '—'}</Typography>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 280 }}>
            {(breach.DataClasses || []).slice(0, 4).map(dc => (
              <Chip key={dc} label={dc} size="small"
                sx={{ fontSize: '0.6rem', height: 18,
                  bgcolor: DATA_CLASS_COLORS[dc] ? `${DATA_CLASS_COLORS[dc]}20` : '#f5f5f5',
                  color: DATA_CLASS_COLORS[dc] || '#555',
                  border: `1px solid ${DATA_CLASS_COLORS[dc] || '#ddd'}` }} />
            ))}
            {(breach.DataClasses || []).length > 4 && (
              <Chip label={`+${breach.DataClasses.length - 4}`} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
            )}
          </Box>
        </TableCell>
        <TableCell>
          <Tooltip title="Import as Finding">
            <IconButton size="small" onClick={() => setImportDlg(true)} color="warning">
              <FileDownload fontSize="small" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>

      {/* Expanded detail row */}
      <TableRow>
        <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ px: 3, py: 1.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary"
                dangerouslySetInnerHTML={{ __html: breach.Description || 'No description available.' }} />
              <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {breach.IsVerified && <Chip label="Verified" size="small" color="success" variant="outlined" />}
                {breach.IsSensitive && <Chip label="Sensitive" size="small" color="error" variant="outlined" />}
                {breach.IsRetired && <Chip label="Retired" size="small" color="default" variant="outlined" />}
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>

      {/* Import dialog */}
      <Dialog open={importDlg} onClose={() => setImportDlg(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import as Finding</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Create a <strong>HIGH</strong> severity finding for the breach
            <strong> "{breach.Title || breach.Name}"</strong> in the selected engagement.
          </Typography>
          <TextField label="Engagement" value={engId} onChange={e => setEngId(e.target.value)}
            select fullWidth size="small" required>
            <MenuItem value="">— Select engagement —</MenuItem>
            {engagements.map(e => <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDlg(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleImport} disabled={importing || !engId}
            sx={{ bgcolor: '#c0392b' }}>
            {importing ? 'Importing…' : 'Import as Finding'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function BreachMonitor() {
  const { user } = useAuthStore();

  const [query,       setQuery]       = useState('');
  const [queryType,   setQueryType]   = useState('domain');
  const [results,     setResults]     = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');
  const [demoMode,    setDemoMode]    = useState(false);
  const [engagements, setEngagements] = useState([]);
  const [status,      setStatus]      = useState(null);

  useEffect(() => {
    api.get('/breach/status/').then(r => setStatus(r.data)).catch(() => {});
    api.get('/engagements/').then(r => setEngagements(r.data.results || r.data)).catch(() => {});
  }, []);

  if (user?.role === 'CLIENT') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 12, textAlign: 'center' }}>
        <Warning sx={{ fontSize: 72, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} gutterBottom>Breach Monitor</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 440, mb: 3 }}>
          Breach monitoring is available as a paid add-on. Contact your OziCyber account manager to enable real-time breach alerts for your organisation.
        </Typography>
        <Chip label="Premium Feature" variant="outlined" color="warning" />
      </Box>
    );
  }

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResults(null);
    setSuccess('');
    try {
      const res = await api.post('/breach/search/', { query: query.trim(), type: queryType });
      setResults(res.data);
      setDemoMode(res.data.demo || false);
    } catch (e) {
      setError(e.response?.data?.error || 'Search failed.');
    }
    setLoading(false);
  };

  const handleImport = async (breach, engId) => {
    try {
      await api.post('/breach/import/', { breach, engagement_id: engId });
      setSuccess(`Finding imported for "${breach.Title || breach.Name}". Check the engagement's findings.`);
    } catch (e) {
      setError(e.response?.data?.error || 'Import failed.');
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning sx={{ color: '#c0392b' }} /> Breach Monitor
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Search breach databases for domain or email exposure, then import directly as findings.
          </Typography>
        </Box>
        {status && (
          <Chip
            icon={<Info fontSize="small" />}
            label={status.hibp_configured ? 'HIBP Live' : 'Demo Mode'}
            size="small"
            color={status.hibp_configured ? 'success' : 'warning'}
            variant="outlined"
          />
        )}
      </Box>

      {/* Config warning */}
      {status && !status.hibp_configured && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Demo mode active.</strong> Add <code>HIBP_API_KEY</code> to your environment to enable live breach lookups from HaveIBeenPwned.
        </Alert>
      )}

      {error   && <Alert severity="error"   onClose={() => setError('')}   sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <form onSubmit={handleSearch}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              select value={queryType} onChange={e => setQueryType(e.target.value)}
              size="small" sx={{ width: 130 }}>
              <MenuItem value="domain">Domain</MenuItem>
              <MenuItem value="email">Email</MenuItem>
            </TextField>
            <TextField
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder={queryType === 'domain' ? 'e.g. example.com' : 'e.g. user@example.com'}
              size="small" sx={{ flexGrow: 1, minWidth: 260 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            />
            <Button type="submit" variant="contained" disabled={loading || !query.trim()}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Search />}
              sx={{ bgcolor: '#24483E' }}>
              {loading ? 'Searching…' : 'Search'}
            </Button>
          </Box>
        </form>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Results */}
      {results && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {results.count} breach{results.count !== 1 ? 'es' : ''} found
              {results.query ? ` for "${results.query}"` : ''}
              {demoMode && <Chip label="Demo data" size="small" color="warning" sx={{ ml: 1, height: 18 }} />}
            </Typography>
            <Tooltip title="Search again">
              <IconButton size="small" onClick={handleSearch}><Refresh fontSize="small" /></IconButton>
            </Tooltip>
          </Box>

          {results.count === 0 ? (
            <Alert severity="success">No breaches found for this {results.type}. 🎉</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 32 }} />
                    <TableCell>Breach</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Accounts</TableCell>
                    <TableCell>Exposed Data</TableCell>
                    <TableCell>Import</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(results.results || []).map((b, i) => (
                    <BreachRow
                      key={b.Name || i}
                      breach={b}
                      engagements={engagements}
                      onImport={handleImport}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {!results && !loading && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <BugReport sx={{ fontSize: 64, opacity: 0.2, mb: 1 }} />
          <Typography variant="h6">Enter a domain or email to search breach databases</Typography>
          <Typography variant="body2">Results include breach date, affected accounts, and exposed data types.</Typography>
        </Box>
      )}
    </Box>
  );
}
