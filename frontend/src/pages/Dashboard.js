import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Chip,
  CircularProgress, Alert, LinearProgress, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper,
  Button, Tooltip, Tabs, Tab,
} from '@mui/material';
import {
  Assessment, BugReport, CheckCircle, Warning,
  Description, CalendarToday, TrendingUp, FolderOpen,
  FactCheck, RadioButtonUnchecked, HelpOutline,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import dayjs from 'dayjs';

const SEV_COLOR = {
  CRITICAL: '#c62828', HIGH: '#e65100', MEDIUM: '#f57f17',
  LOW: '#6a1b9a', INFORMATIONAL: '#1565c0',
};
const SEV_BG = {
  CRITICAL: '#ffebee', HIGH: '#fff3e0', MEDIUM: '#fff8e1',
  LOW: '#f3e5f5', INFORMATIONAL: '#e3f2fd',
};
const STATUS_COLOR = {
  DRAFT: '#9e9e9e', OPEN: '#1976d2', IN_REVIEW: '#f57f17',
  PUBLISHED: '#2e7d32', REMEDIATED: '#00796b',
  FALSE_POSITIVE: '#9e9e9e', ACCEPTED_RISK: '#c2185b',
};

const FRAMEWORK_COLOR = {
  ESSENTIAL_EIGHT: '#24483E',
  CIS:             '#8e44ad',
  AESCSF:          '#b7410e',
  CUSTOM:          '#7f8c8d',
};
const FRAMEWORK_LABEL = {
  ESSENTIAL_EIGHT: 'Essential Eight',
  CIS:             'CIS Health Check',
  AESCSF:          'AESCSF 2023',
  CUSTOM:          'Custom',
};

const scoreColor = (s) => s >= 75 ? '#27ae60' : s >= 50 ? '#f39c12' : '#c0392b';
const scoreBg    = (s) => s >= 75 ? '#e8f5e9' : s >= 50 ? '#fff8e1' : '#ffebee';

// ── Assessment compliance panel ───────────────────────────────────────────────
function AssessmentPanel({ assessments, loading, navigate }) {
  if (loading) return <CircularProgress size={24} />;
  if (assessments.length === 0) return (
    <Typography color="text.secondary" variant="body2">No assessments have been shared yet.</Typography>
  );

  return (
    <Grid container spacing={2}>
      {assessments.map(a => {
        const hasScore  = a.score !== null && a.score !== undefined;
        const sc        = hasScore ? a.score : null;
        const isComplete = a.status === 'COMPLETED';
        const isInProgress = a.status === 'IN_PROGRESS';
        const fwColor   = FRAMEWORK_COLOR[a.framework] || '#7f8c8d';

        return (
          <Grid item xs={12} md={6} key={a.id}>
            <Card
              onClick={() => navigate(`/assessments/${a.id}`)}
              sx={{ cursor: 'pointer', height: '100%', border: '1px solid', borderColor: 'divider',
                '&:hover': { boxShadow: 4, borderColor: fwColor } }}
            >
              <CardContent>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Chip
                    label={FRAMEWORK_LABEL[a.framework] || a.framework}
                    size="small"
                    sx={{ bgcolor: fwColor, color: '#fff', fontWeight: 700, fontSize: '0.65rem' }}
                  />
                  <Chip
                    label={a.status_display}
                    size="small"
                    color={isComplete ? 'success' : isInProgress ? 'warning' : 'default'}
                    variant="outlined"
                    sx={{ fontSize: '0.65rem' }}
                  />
                </Box>

                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>{a.title}</Typography>
                {a.engagement_name && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    {a.engagement_name}
                  </Typography>
                )}

                {/* Score display */}
                {hasScore ? (
                  <Box sx={{ mt: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>Compliance Score</Typography>
                      <Box sx={{
                        px: 1, py: 0.2, borderRadius: 1,
                        bgcolor: scoreBg(sc), border: `1px solid ${scoreColor(sc)}`,
                      }}>
                        <Typography variant="caption" fontWeight={800} sx={{ color: scoreColor(sc) }}>
                          {sc}%
                        </Typography>
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate" value={sc}
                      sx={{ height: 10, borderRadius: 5, bgcolor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': { bgcolor: scoreColor(sc), borderRadius: 5 } }}
                    />
                    {/* Compliance tier label */}
                    <Typography variant="caption" sx={{ color: scoreColor(sc), fontWeight: 600, mt: 0.5, display: 'block' }}>
                      {sc >= 75 ? 'Largely Compliant' : sc >= 50 ? 'Partially Compliant' : 'Requires Attention'}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ mt: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {a.response_count > 0 ? `${a.response_count} response${a.response_count !== 1 ? 's' : ''} recorded` : 'Not started'}
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={0}
                      sx={{ height: 10, borderRadius: 5, bgcolor: '#e0e0e0' }} />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {isInProgress ? 'Assessment in progress — score pending completion' : 'Awaiting responses'}
                    </Typography>
                  </Box>
                )}

                {/* Compliance tier bands — framework-specific */}
                {hasScore && ['ESSENTIAL_EIGHT', 'AESCSF'].includes(a.framework) && (() => {
                  const tiers = a.framework === 'AESCSF' ? [
                    { label: 'MIL1 — Initial',           min: 0,  max: 40,  color: '#c0392b' },
                    { label: 'MIL2 — Managed',           min: 40, max: 65,  color: '#e67e22' },
                    { label: 'MIL3 — Defined',           min: 65, max: 85,  color: '#f39c12' },
                    { label: 'MIL3+ — Institutionalised',min: 85, max: 101, color: '#27ae60' },
                  ] : [
                    { label: 'ML0 — Vulnerable', min: 0,  max: 25,  color: '#c0392b' },
                    { label: 'ML1 — Partial',    min: 25, max: 50,  color: '#e67e22' },
                    { label: 'ML2 — Mostly',     min: 50, max: 75,  color: '#f39c12' },
                    { label: 'ML3 — Achieved',   min: 75, max: 101, color: '#27ae60' },
                  ];
                  return (
                    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
                        Maturity Level
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {tiers.map(tier => {
                          const active = sc >= tier.min && sc < tier.max;
                          return (
                            <Chip key={tier.label} label={tier.label} size="small" sx={{
                              fontSize: '0.6rem', height: 20,
                              bgcolor: active ? tier.color : '#f5f5f5',
                              color: active ? '#fff' : '#999',
                              fontWeight: active ? 700 : 400,
                              border: active ? 'none' : '1px solid #ddd',
                            }} />
                          );
                        })}
                      </Box>
                    </Box>
                  );
                })()}

                {/* Footer */}
                <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {a.response_count} response{a.response_count !== 1 ? 's' : ''}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {dayjs(a.created_at).format('D MMM YYYY')}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}

function StatCard({ title, value, icon, color, loading }) {
  const theme = useTheme();
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">{title}</Typography>
            {loading ? (
              <CircularProgress size={24} sx={{ mt: 1 }} />
            ) : (
              <Typography variant="h3" fontWeight={700} sx={{ mt: 0.5 }}>{value ?? '—'}</Typography>
            )}
          </Box>
          <Box sx={{
            width: 52, height: 52, borderRadius: 2,
            bgcolor: color + '20',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {React.cloneElement(icon, { sx: { color, fontSize: 28 } })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Admin dashboard ───────────────────────────────────────────────────────────
function AdminDashboard({ engagements, findings, reports, loading }) {
  const theme = useTheme();
  const navigate = useNavigate();

  const active     = engagements.filter(e => e.status === 'ACTIVE').length;
  const critHigh   = findings.filter(f => ['CRITICAL','HIGH'].includes(f.severity)).length;
  const remediated = findings.filter(f => f.status === 'REMEDIATED').length;

  const sevBreakdown = ['CRITICAL','HIGH','MEDIUM','LOW','INFORMATIONAL'].map(s => ({
    label: s, count: findings.filter(f => f.severity === s).length,
  }));

  const upcoming = engagements
    .filter(e => e.end_date && dayjs(e.end_date).isAfter(dayjs()))
    .sort((a, b) => dayjs(a.end_date).diff(dayjs(b.end_date)))
    .slice(0, 5);

  const recentFindings = [...findings]
    .sort((a, b) => b.id - a.id)
    .slice(0, 6);

  const engByStatus = ['PLANNING','ACTIVE','REPORTING','REVIEW','COMPLETED','ON_HOLD']
    .map(s => ({ label: s, count: engagements.filter(e => e.status === s).length }))
    .filter(s => s.count > 0);

  return (
    <Box>
      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Active Engagements" value={active} icon={<Assessment />} color={theme.palette.primary.main} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Findings" value={findings.length} icon={<BugReport />} color="#ed6c02" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Critical / High" value={critHigh} icon={<Warning />} color="#d32f2f" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Remediated" value={remediated} icon={<CheckCircle />} color="#2e7d32" loading={loading} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent findings */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Recent Findings</Typography>
              {loading ? <CircularProgress size={24} /> : recentFindings.length === 0 ? (
                <Typography color="text.secondary" variant="body2">No findings yet.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentFindings.map(f => (
                        <TableRow key={f.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 240 }}>{f.title}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={f.severity} size="small"
                              sx={{ bgcolor: SEV_BG[f.severity], color: SEV_COLOR[f.severity], fontWeight: 700, fontSize: '0.68rem' }} />
                          </TableCell>
                          <TableCell>
                            <Chip label={f.status?.replace('_', ' ')} size="small" variant="outlined"
                              sx={{ color: STATUS_COLOR[f.status], borderColor: STATUS_COLOR[f.status], fontSize: '0.68rem' }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right column */}
        <Grid item xs={12} md={5}>
          {/* Findings by severity */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Findings by Severity</Typography>
              {loading ? <CircularProgress size={24} /> : findings.length === 0 ? (
                <Typography color="text.secondary" variant="body2">No findings yet.</Typography>
              ) : (
                <Box>
                  {sevBreakdown.map(({ label, count }) => (
                    <Box key={label} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Chip label={label} size="small"
                          sx={{ bgcolor: SEV_BG[label], color: SEV_COLOR[label], fontWeight: 700, fontSize: '0.68rem' }} />
                        <Typography variant="body2" fontWeight={600}>{count}</Typography>
                      </Box>
                      <LinearProgress variant="determinate"
                        value={findings.length ? (count / findings.length) * 100 : 0}
                        sx={{ height: 6, borderRadius: 3,
                          bgcolor: SEV_BG[label],
                          '& .MuiLinearProgress-bar': { bgcolor: SEV_COLOR[label] },
                        }} />
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Upcoming deadlines */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Upcoming Deadlines</Typography>
              {loading ? <CircularProgress size={24} /> : upcoming.length === 0 ? (
                <Typography color="text.secondary" variant="body2">No upcoming deadlines.</Typography>
              ) : (
                upcoming.map(e => {
                  const days = dayjs(e.end_date).diff(dayjs(), 'day');
                  return (
                    <Box key={e.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1,
                      borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                      <Box>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 200 }}>{e.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{e.end_date}</Typography>
                      </Box>
                      <Chip label={`${days}d`} size="small"
                        color={days <= 3 ? 'error' : days <= 7 ? 'warning' : 'default'} />
                    </Box>
                  );
                })
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Engagement status breakdown */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                All Engagements ({engagements.length})
              </Typography>
              {loading ? <CircularProgress size={24} /> : engagements.length === 0 ? (
                <Typography color="text.secondary" variant="body2">No engagements yet.</Typography>
              ) : (
                <Grid container spacing={2}>
                  {engByStatus.map(({ label, count }) => (
                    <Grid item key={label}>
                      <Chip label={`${label.replace('_',' ')} · ${count}`} variant="outlined" />
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// ── Client dashboard ──────────────────────────────────────────────────────────
function ClientDashboard({ engagements, findings, reports, assessments, loading }) {
  const theme = useTheme();
  const navigate = useNavigate();

  const openFindings      = findings.filter(f => !['REMEDIATED','FALSE_POSITIVE','ACCEPTED_RISK'].includes(f.status));
  const remediatedCount   = findings.filter(f => f.status === 'REMEDIATED').length;
  const critHigh          = findings.filter(f => ['CRITICAL','HIGH'].includes(f.severity)).length;
  const remediationPct    = findings.length ? Math.round((remediatedCount / findings.length) * 100) : 0;
  const publishedReports  = reports.filter(r => !r.is_draft);
  const activeEng         = engagements.filter(e => ['ACTIVE','REPORTING','REVIEW'].includes(e.status));
  const completedAssessments = assessments.filter(a => a.status === 'COMPLETED');
  const avgScore = completedAssessments.length
    ? Math.round(completedAssessments.reduce((s, a) => s + (a.score || 0), 0) / completedAssessments.length)
    : null;

  const upcoming = engagements
    .filter(e => e.end_date && dayjs(e.end_date).isAfter(dayjs()))
    .sort((a, b) => dayjs(a.end_date).diff(dayjs(b.end_date)))
    .slice(0, 4);

  return (
    <Box>
      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="My Engagements" value={engagements.length} icon={<Assessment />} color={theme.palette.primary.main} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Open Findings" value={openFindings.length} icon={<BugReport />} color="#ed6c02" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Critical / High" value={critHigh} icon={<Warning />} color="#d32f2f" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Avg Compliance Score" value={avgScore !== null ? `${avgScore}%` : '—'} icon={<FactCheck />} color="#24483E" loading={loading} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Remediation progress */}
        <Grid item xs={12} md={5}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Remediation Progress</Typography>
              {loading ? <CircularProgress size={24} /> : findings.length === 0 ? (
                <Typography color="text.secondary" variant="body2">No findings yet.</Typography>
              ) : (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">{remediatedCount} of {findings.length} remediated</Typography>
                    <Typography variant="body2" fontWeight={700}>{remediationPct}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={remediationPct}
                    sx={{ height: 10, borderRadius: 5, mb: 2,
                      bgcolor: '#e8f5e9',
                      '& .MuiLinearProgress-bar': { bgcolor: '#2e7d32', borderRadius: 5 },
                    }} />
                  {['CRITICAL','HIGH','MEDIUM','LOW','INFORMATIONAL'].map(sev => {
                    const total = findings.filter(f => f.severity === sev).length;
                    if (!total) return null;
                    const done  = findings.filter(f => f.severity === sev && f.status === 'REMEDIATED').length;
                    return (
                      <Box key={sev} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Chip label={sev} size="small"
                          sx={{ bgcolor: SEV_BG[sev], color: SEV_COLOR[sev], fontWeight: 700, fontSize: '0.68rem', minWidth: 90 }} />
                        <LinearProgress variant="determinate" value={total ? (done / total) * 100 : 0}
                          sx={{ flex: 1, height: 6, borderRadius: 3,
                            bgcolor: SEV_BG[sev],
                            '& .MuiLinearProgress-bar': { bgcolor: SEV_COLOR[sev] },
                          }} />
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40, textAlign: 'right' }}>
                          {done}/{total}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Active engagements */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Active Engagements</Typography>
              {loading ? <CircularProgress size={24} /> : activeEng.length === 0 ? (
                <Typography color="text.secondary" variant="body2">No active engagements.</Typography>
              ) : activeEng.map(e => (
                <Box key={e.id}
                  onClick={() => navigate(`/engagements/${e.id}`)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25, px: 1, borderRadius: 1, cursor: 'pointer',
                    borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' },
                    '&:hover': { bgcolor: 'action.hover' } }}>
                  <FolderOpen sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{e.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{e.end_date ? `Due ${e.end_date}` : 'No due date'}</Typography>
                  </Box>
                  <Chip label={e.status} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Right column */}
        <Grid item xs={12} md={7}>
          {/* Open findings requiring action */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Open Findings Requiring Action ({openFindings.length})
              </Typography>
              {loading ? <CircularProgress size={24} /> : openFindings.length === 0 ? (
                <Alert severity="success" sx={{ fontSize: '0.85rem' }}>All findings have been remediated.</Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Finding</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {openFindings.slice(0, 8).map(f => (
                        <TableRow key={f.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 260 }}>{f.title}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={f.severity} size="small"
                              sx={{ bgcolor: SEV_BG[f.severity], color: SEV_COLOR[f.severity], fontWeight: 700, fontSize: '0.68rem' }} />
                          </TableCell>
                          <TableCell>
                            <Chip label={f.status?.replace('_',' ')} size="small" variant="outlined"
                              sx={{ color: STATUS_COLOR[f.status], borderColor: STATUS_COLOR[f.status], fontSize: '0.68rem' }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          {/* Reports available */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Reports Available ({publishedReports.length})
              </Typography>
              {loading ? <CircularProgress size={24} /> : publishedReports.length === 0 ? (
                <Typography color="text.secondary" variant="body2">No published reports yet.</Typography>
              ) : publishedReports.map(r => (
                <Box key={r.id}
                  onClick={() => navigate(`/reports/${r.id}`)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25, px: 1, borderRadius: 1, cursor: 'pointer',
                    borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' },
                    '&:hover': { bgcolor: 'action.hover' } }}>
                  <Description sx={{ color: '#1976d2', fontSize: 20 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{r.title}</Typography>
                    <Typography variant="caption" color="text.secondary">v{r.version}</Typography>
                  </Box>
                  <Chip label="Published" size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Assessments compliance panel ── */}
      <Box sx={{ mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Compliance Assessments</Typography>
            <Typography variant="caption" color="text.secondary">
              {assessments.length === 0
                ? 'No assessments yet'
                : `${assessments.length} assessment${assessments.length !== 1 ? 's' : ''} · ${completedAssessments.length} completed`}
            </Typography>
          </Box>
          <Button variant="outlined" size="small" onClick={() => navigate('/assessments')}
            sx={{ borderColor: '#24483E', color: '#24483E', fontSize: '0.75rem' }}>
            View All
          </Button>
        </Box>
        <AssessmentPanel assessments={assessments} loading={loading} navigate={navigate} />
      </Box>
    </Box>
  );
}

// ── GRC monitoring tab ────────────────────────────────────────────────────────
const GRC_FW_COLOR = {
  NIST_CSF_2: '#1565c0', NIST_800_171_R3: '#283593',
  ISO_27001_2022: '#1b5e20', SOC2: '#4a148c', HIPAA: '#b71c1c',
};

function GrcDashboardTab({ grcProjects, loading, navigate }) {
  const theme = useTheme();
  const active       = grcProjects.filter(p => p.status === 'ACTIVE');
  const totalCtls    = grcProjects.reduce((s, p) => s + (p.stats?.total ?? 0), 0);
  const totalImpl    = grcProjects.reduce((s, p) => s + (p.stats?.implemented ?? 0), 0);
  const overallPct   = totalCtls ? Math.round((totalImpl / totalCtls) * 100) : 0;
  const pctColor     = (v) => v >= 80 ? '#27ae60' : v >= 40 ? '#f39c12' : '#3498db';

  return (
    <Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <StatCard title="Active GRC Projects" value={active.length} icon={<Assessment />}
            color={theme.palette.primary.main} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard title="Controls Monitored" value={totalCtls || (loading ? null : '—')} icon={<FactCheck />}
            color="#283593" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Overall Completion"
            value={totalCtls ? `${overallPct}%` : (loading ? null : '—')}
            icon={<CheckCircle />} color={pctColor(overallPct)} loading={loading}
          />
        </Grid>
      </Grid>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : active.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Typography variant="h6" gutterBottom>No active GRC projects</Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Start a NIST, ISO 27001, SOC 2 or HIPAA compliance project to monitor it here.
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/grc')}
            sx={{ borderColor: '#1565c0', color: '#1565c0' }}>
            Go to GRC Projects
          </Button>
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>Active Compliance Projects</Typography>
            <Button size="small" onClick={() => navigate('/grc')}
              sx={{ color: '#1565c0', fontSize: '0.78rem' }}>
              View all
            </Button>
          </Box>
          <Grid container spacing={2}>
            {active.map(p => {
              const pct     = p.stats?.pct ?? 0;
              const pc      = pctColor(pct);
              const fwColor = GRC_FW_COLOR[p.framework_key] ?? '#546e7a';
              return (
                <Grid item xs={12} sm={6} lg={4} key={p.id}>
                  <Card
                    onClick={() => navigate(`/grc/${p.id}`)}
                    sx={{
                      cursor: 'pointer', border: '1px solid #e0e0e0',
                      transition: 'box-shadow 0.15s, border-color 0.15s',
                      '&:hover': { boxShadow: 4, borderColor: fwColor },
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Chip label={p.framework_name ?? p.framework_key} size="small"
                          sx={{ bgcolor: fwColor, color: '#fff', fontWeight: 700, fontSize: '0.62rem', maxWidth: 160 }} />
                        <Chip label={`${pct}%`} size="small"
                          sx={{ bgcolor: pc + '20', color: pc, fontWeight: 800, fontSize: '0.7rem' }} />
                      </Box>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }} noWrap>
                        {p.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        {p.stats?.implemented ?? 0} of {p.stats?.total ?? 0} controls implemented
                        {p.stats?.in_progress > 0 && ` · ${p.stats.in_progress} in progress`}
                      </Typography>
                      <LinearProgress variant="determinate" value={pct}
                        sx={{ height: 6, borderRadius: 3, bgcolor: '#e8eaf6',
                          '& .MuiLinearProgress-bar': { bgcolor: pc, borderRadius: 3 } }} />
                      {p.target_date && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                          Target: {new Date(p.target_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}
    </Box>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const isClient = user?.role === 'CLIENT';

  const [engagements,  setEngagements]  = useState([]);
  const [findings,     setFindings]     = useState([]);
  const [reports,      setReports]      = useState([]);
  const [assessments,  setAssessments]  = useState([]);
  const [grcProjects,  setGrcProjects]  = useState([]);
  const [dashTab,      setDashTab]      = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [engRes, findRes, repRes, assRes, grcRes] = await Promise.all([
          api.get('/engagements/'),
          api.get('/findings/'),
          api.get('/reports/'),
          api.get('/assessments/list/'),
          api.get('/grc/projects/').catch(() => ({ data: [] })),
        ]);
        setEngagements(engRes.data.results || engRes.data);
        setFindings(findRes.data.results || findRes.data);
        setReports(repRes.data.results || repRes.data);
        setAssessments(assRes.data.results || assRes.data);
        setGrcProjects(grcRes.data.results || grcRes.data);
      } catch {
        setError('Failed to load dashboard data.');
      }
      setLoading(false);
    };
    load();
  }, []);

  const navigate = useNavigate();

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Dashboard</Typography>
        <Typography variant="body1" color="text.secondary">
          {isClient
            ? `Welcome back, ${user?.first_name}. Here's the status of your engagements.`
            : `Welcome back, ${user?.first_name}. Here's your platform overview.`}
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Tabs
          value={dashTab}
          onChange={(_, v) => setDashTab(v)}
          sx={{ px: 1, '& .MuiTab-root': { fontSize: '0.85rem', fontWeight: 600, minWidth: 160 } }}
        >
          <Tab label="Penetration Testing" />
          <Tab label="GRC" />
        </Tabs>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {dashTab === 0 ? (
        isClient
          ? <ClientDashboard engagements={engagements} findings={findings} reports={reports} assessments={assessments} loading={loading} />
          : <AdminDashboard  engagements={engagements} findings={findings} reports={reports} loading={loading} />
      ) : (
        <GrcDashboardTab grcProjects={grcProjects} loading={loading} navigate={navigate} />
      )}
    </Box>
  );
};

export default Dashboard;
