import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  MenuItem,
  IconButton,
  Drawer,
  Divider,
  Stack,
  Tooltip,
} from '@mui/material';
import { Add, Edit, Delete, Visibility, Close } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { severityColors, statusColors } from '../theme';

const SEVERITY_OPTIONS = ['INFORMATIONAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUS_OPTIONS = ['DRAFT', 'OPEN', 'IN_REVIEW', 'PUBLISHED', 'REMEDIATED'];

const SEVERITY_BORDER = {
  CRITICAL: '#c62828',
  HIGH: '#e65100',
  MEDIUM: '#f57f17',
  LOW: '#6a1b9a',
  INFORMATIONAL: '#1565c0',
};

const Findings = () => {
  const theme = useTheme();
  const [openDialog, setOpenDialog] = useState(false);
  const [openCVSSDialog, setOpenCVSSDialog] = useState(false);
  const [previewFinding, setPreviewFinding] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    severity: 'MEDIUM',
    status: 'DRAFT',
    description: '',
    details: '',
    impact: '',
    likelihood: '',
    recommendations: '',
  });

  const [cvssMetrics, setCvssMetrics] = useState({
    av: 'N', ac: 'L', pr: 'N', ui: 'N',
    s: 'U', c: 'H', i: 'H', a: 'H',
  });

  const findings = [
    {
      id: 1,
      title: 'SQL Injection in Login Form',
      severity: 'CRITICAL',
      status: 'PUBLISHED',
      cvss: 9.8,
      engagement: 'Acme Corp Web App',
      description: 'The login form is vulnerable to SQL injection attacks, allowing an attacker to bypass authentication or extract sensitive data from the database.',
      details: 'The username parameter in the POST /api/auth/login endpoint is not sanitised before being interpolated into the SQL query. An attacker can supply a payload such as \' OR \'1\'=\'1 to bypass authentication entirely.',
      impact: 'An attacker could gain unauthorised access to any user account, extract the entire user database, or in some configurations execute operating system commands via xp_cmdshell.',
      likelihood: 'High — the vulnerability is trivially exploitable using publicly available tooling such as sqlmap and requires no prior authentication.',
      recommendations: 'Use parameterised queries or prepared statements for all database interactions. Apply input validation as a defence-in-depth measure. Consider deploying a WAF rule to detect common SQL injection patterns.',
    },
    {
      id: 2,
      title: 'Cross-Site Scripting (XSS)',
      severity: 'HIGH',
      status: 'PUBLISHED',
      cvss: 7.5,
      engagement: 'Acme Corp Web App',
      description: 'Reflected XSS was identified in the search functionality, enabling an attacker to execute arbitrary JavaScript in the context of a victim\'s browser session.',
      details: 'The q parameter on GET /search is echoed directly into the HTML response without encoding. A crafted URL containing <script>alert(document.cookie)</script> will execute in the victim\'s browser when clicked.',
      impact: 'Session hijacking, credential theft, redirection to malicious sites, or defacement of the application for targeted users.',
      likelihood: 'Medium — requires a victim to click a crafted link, but the attack is well-understood and easy to weaponise.',
      recommendations: 'HTML-encode all user-supplied data before rendering it in the DOM. Implement a Content Security Policy (CSP) to restrict inline script execution.',
    },
    {
      id: 3,
      title: 'Weak Password Policy',
      severity: 'MEDIUM',
      status: 'IN_REVIEW',
      cvss: 5.3,
      engagement: 'TechStart API',
      description: 'The application accepts passwords as short as four characters with no complexity requirements, significantly increasing the risk of brute-force and credential-stuffing attacks.',
      details: 'Testing confirmed that passwords such as "1234" are accepted at account creation. No account lockout or rate-limiting is enforced on the login endpoint.',
      impact: 'Accounts with weak passwords are susceptible to automated attacks. Combined with the absence of MFA, a successful attack yields full account compromise.',
      likelihood: 'Medium — credential stuffing lists are widely available and the lack of rate limiting makes automated attacks feasible.',
      recommendations: 'Enforce a minimum password length of 12 characters with complexity requirements. Implement account lockout after 5 failed attempts and offer MFA.',
    },
  ];

  const calculateCVSS = () => {
    const weights = {
      av: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
      ac: { L: 0.77, H: 0.44 },
      pr: { N: 0.85, L: 0.62, H: 0.27 },
      ui: { N: 0.85, R: 0.62 },
    };
    const score = 8.22 * weights.av[cvssMetrics.av] * weights.ac[cvssMetrics.ac] * weights.pr[cvssMetrics.pr] * weights.ui[cvssMetrics.ui];
    return Math.min(10, Math.round(score * 10) / 10);
  };

  const handleSubmit = () => {
    console.log('Creating finding:', formData);
    setOpenDialog(false);
  };

  const cvssScore = previewFinding?.cvss ?? null;
  const cvssColor = cvssScore >= 9 ? '#c62828' : cvssScore >= 7 ? '#e65100' : cvssScore >= 4 ? '#f57f17' : '#2e7d32';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Findings</Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and track security findings across engagements
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{ backgroundColor: theme.palette.primary.main }}
        >
          Add Finding
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <TextField fullWidth size="small" label="Search" placeholder="Search findings..." />
          </Grid>
          <Grid item xs={2}>
            <TextField fullWidth size="small" select label="Severity" defaultValue="">
              <MenuItem value="">All</MenuItem>
              {SEVERITY_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={2}>
            <TextField fullWidth size="small" select label="Status" defaultValue="">
              <MenuItem value="">All</MenuItem>
              {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={2}>
            <TextField fullWidth size="small" select label="Engagement" defaultValue="">
              <MenuItem value="">All</MenuItem>
              <MenuItem value="1">Acme Corp</MenuItem>
              <MenuItem value="2">TechStart</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={3}>
            <Button variant="contained" fullWidth sx={{ height: 40 }}>Apply Filters</Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Findings Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
              <TableCell sx={{ color: '#fff', fontWeight: 700, width: 8, p: 0 }} />
              <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Finding</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Severity</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 700 }}>CVSS</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 700, textAlign: 'right' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {findings.map((finding, idx) => (
              <TableRow
                key={finding.id}
                hover
                sx={{
                  backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#f0f4f0' },
                  transition: 'background-color 0.15s',
                }}
                onClick={() => setPreviewFinding(finding)}
              >
                {/* Severity accent bar */}
                <TableCell
                  sx={{
                    p: 0,
                    width: 6,
                    minWidth: 6,
                    backgroundColor: SEVERITY_BORDER[finding.severity],
                  }}
                />
                {/* Title + engagement */}
                <TableCell sx={{ py: 1.5 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                    {finding.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {finding.engagement}
                  </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                  <Chip
                    label={finding.severity}
                    size="small"
                    sx={{
                      backgroundColor: severityColors[finding.severity].bg,
                      color: severityColors[finding.severity].text,
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      border: `1px solid ${severityColors[finding.severity].border}`,
                    }}
                  />
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 28,
                      borderRadius: 1,
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      backgroundColor:
                        finding.cvss >= 9 ? '#ffebee' :
                        finding.cvss >= 7 ? '#fff3e0' :
                        finding.cvss >= 4 ? '#fff8e1' : '#e8f5e9',
                      color:
                        finding.cvss >= 9 ? '#c62828' :
                        finding.cvss >= 7 ? '#e65100' :
                        finding.cvss >= 4 ? '#f57f17' : '#2e7d32',
                      border: '1px solid',
                      borderColor:
                        finding.cvss >= 9 ? '#ef9a9a' :
                        finding.cvss >= 7 ? '#ffcc80' :
                        finding.cvss >= 4 ? '#ffe082' : '#a5d6a7',
                    }}
                  >
                    {finding.cvss}
                  </Box>
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                  <Chip
                    label={finding.status.replace('_', ' ')}
                    size="small"
                    sx={{
                      backgroundColor: statusColors[finding.status]?.bg || '#f5f5f5',
                      color: statusColors[finding.status]?.text || '#616161',
                      fontWeight: 600,
                      fontSize: '0.7rem',
                    }}
                  />
                </TableCell>
                <TableCell sx={{ py: 1.5, textAlign: 'right' }}>
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Preview">
                      <IconButton size="small" onClick={() => setPreviewFinding(finding)} sx={{ color: theme.palette.primary.main }}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" sx={{ color: '#546e7a' }}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error">
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Preview Drawer */}
      <Drawer
        anchor="right"
        open={Boolean(previewFinding)}
        onClose={() => setPreviewFinding(null)}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 560 }, display: 'flex', flexDirection: 'column' },
        }}
      >
        {previewFinding && (
          <>
            {/* Drawer header */}
            <Box
              sx={{
                px: 3,
                py: 2,
                borderLeft: `6px solid ${SEVERITY_BORDER[previewFinding.severity]}`,
                backgroundColor: '#fafafa',
                borderBottom: '1px solid',
                borderBottomColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1, pr: 2 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3, mb: 0.5 }}>
                    {previewFinding.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {previewFinding.engagement}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => setPreviewFinding(null)}>
                  <Close fontSize="small" />
                </IconButton>
              </Box>

              {/* Badges row */}
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} alignItems="center">
                <Chip
                  label={previewFinding.severity}
                  size="small"
                  sx={{
                    backgroundColor: severityColors[previewFinding.severity].bg,
                    color: severityColors[previewFinding.severity].text,
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    border: `1px solid ${severityColors[previewFinding.severity].border}`,
                  }}
                />
                <Chip
                  label={previewFinding.status.replace('_', ' ')}
                  size="small"
                  sx={{
                    backgroundColor: statusColors[previewFinding.status]?.bg || '#f5f5f5',
                    color: statusColors[previewFinding.status]?.text || '#616161',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  }}
                />
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    backgroundColor:
                      previewFinding.cvss >= 9 ? '#ffebee' :
                      previewFinding.cvss >= 7 ? '#fff3e0' :
                      previewFinding.cvss >= 4 ? '#fff8e1' : '#e8f5e9',
                    color: cvssColor,
                    border: '1px solid',
                    borderColor:
                      previewFinding.cvss >= 9 ? '#ef9a9a' :
                      previewFinding.cvss >= 7 ? '#ffcc80' :
                      previewFinding.cvss >= 4 ? '#ffe082' : '#a5d6a7',
                  }}
                >
                  CVSS {previewFinding.cvss}
                </Box>
              </Stack>
            </Box>

            {/* Drawer body */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
              {[
                { label: 'Description', value: previewFinding.description },
                { label: 'Technical Details', value: previewFinding.details },
                { label: 'Impact', value: previewFinding.impact },
                { label: 'Likelihood', value: previewFinding.likelihood },
                { label: 'Recommendations', value: previewFinding.recommendations },
              ].map(({ label, value }) =>
                value ? (
                  <Box key={label} sx={{ mb: 3 }}>
                    <Typography
                      variant="overline"
                      sx={{ fontWeight: 700, color: theme.palette.primary.main, letterSpacing: 1 }}
                    >
                      {label}
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    <Typography variant="body2" sx={{ lineHeight: 1.8, color: '#333' }}>
                      {value}
                    </Typography>
                  </Box>
                ) : null
              )}
            </Box>

            {/* Drawer footer */}
            <Box
              sx={{
                px: 3,
                py: 2,
                borderTop: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                gap: 1,
                justifyContent: 'flex-end',
              }}
            >
              <Button variant="outlined" size="small" onClick={() => setPreviewFinding(null)}>
                Close
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<Edit fontSize="small" />}
                sx={{ backgroundColor: theme.palette.primary.main }}
              >
                Edit Finding
              </Button>
            </Box>
          </>
        )}
      </Drawer>

      {/* Add Finding Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle>Add New Finding</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth select label="Severity" value={formData.severity} onChange={(e) => setFormData({...formData, severity: e.target.value})}>
                {SEVERITY_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth select label="Status" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Button variant="outlined" onClick={() => setOpenCVSSDialog(true)}>
                Configure CVSS 3.1 Calculator
              </Button>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Description" multiline rows={2} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Technical Details" multiline rows={3} value={formData.details} onChange={(e) => setFormData({...formData, details: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Impact" multiline rows={2} value={formData.impact} onChange={(e) => setFormData({...formData, impact: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Likelihood" multiline rows={2} value={formData.likelihood} onChange={(e) => setFormData({...formData, likelihood: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Recommendations" multiline rows={3} value={formData.recommendations} onChange={(e) => setFormData({...formData, recommendations: e.target.value})} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} sx={{ backgroundColor: theme.palette.primary.main }}>
            Add Finding
          </Button>
        </DialogActions>
      </Dialog>

      {/* CVSS Dialog */}
      <Dialog open={openCVSSDialog} onClose={() => setOpenCVSSDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>CVSS 3.1 Calculator</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}><TextField fullWidth select label="Attack Vector" value={cvssMetrics.av} onChange={(e) => setCvssMetrics({...cvssMetrics, av: e.target.value})}>
              <MenuItem value="N">Network</MenuItem><MenuItem value="A">Adjacent</MenuItem><MenuItem value="L">Local</MenuItem><MenuItem value="P">Physical</MenuItem>
            </TextField></Grid>
            <Grid item xs={6}><TextField fullWidth select label="Attack Complexity" value={cvssMetrics.ac} onChange={(e) => setCvssMetrics({...cvssMetrics, ac: e.target.value})}>
              <MenuItem value="L">Low</MenuItem><MenuItem value="H">High</MenuItem>
            </TextField></Grid>
            <Grid item xs={6}><TextField fullWidth select label="Privileges Required" value={cvssMetrics.pr} onChange={(e) => setCvssMetrics({...cvssMetrics, pr: e.target.value})}>
              <MenuItem value="N">None</MenuItem><MenuItem value="L">Low</MenuItem><MenuItem value="H">High</MenuItem>
            </TextField></Grid>
            <Grid item xs={6}><TextField fullWidth select label="User Interaction" value={cvssMetrics.ui} onChange={(e) => setCvssMetrics({...cvssMetrics, ui: e.target.value})}>
              <MenuItem value="N">None</MenuItem><MenuItem value="R">Required</MenuItem>
            </TextField></Grid>
            <Grid item xs={6}><TextField fullWidth select label="Scope" value={cvssMetrics.s} onChange={(e) => setCvssMetrics({...cvssMetrics, s: e.target.value})}>
              <MenuItem value="U">Unchanged</MenuItem><MenuItem value="C">Changed</MenuItem>
            </TextField></Grid>
            <Grid item xs={6}><TextField fullWidth select label="Confidentiality" value={cvssMetrics.c} onChange={(e) => setCvssMetrics({...cvssMetrics, c: e.target.value})}>
              <MenuItem value="N">None</MenuItem><MenuItem value="L">Low</MenuItem><MenuItem value="H">High</MenuItem>
            </TextField></Grid>
            <Grid item xs={6}><TextField fullWidth select label="Integrity" value={cvssMetrics.i} onChange={(e) => setCvssMetrics({...cvssMetrics, i: e.target.value})}>
              <MenuItem value="N">None</MenuItem><MenuItem value="L">Low</MenuItem><MenuItem value="H">High</MenuItem>
            </TextField></Grid>
            <Grid item xs={6}><TextField fullWidth select label="Availability" value={cvssMetrics.a} onChange={(e) => setCvssMetrics({...cvssMetrics, a: e.target.value})}>
              <MenuItem value="N">None</MenuItem><MenuItem value="L">Low</MenuItem><MenuItem value="H">High</MenuItem>
            </TextField></Grid>
          </Grid>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'action.selected', borderRadius: 1 }}>
            <Typography variant="h6">CVSS Score: {calculateCVSS()}</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCVSSDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenCVSSDialog(false)}>Apply</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Findings;
