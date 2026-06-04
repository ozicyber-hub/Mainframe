import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip,
  CircularProgress, Alert, IconButton,
} from '@mui/material';
import { FolderOpen } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';

const STATUS_COLORS = {
  PLANNING:   { bg: '#e3f2fd', text: '#1976d2' },
  ACTIVE:     { bg: '#e8f5e9', text: '#2e7d32' },
  REPORTING:  { bg: '#fff3e0', text: '#f57f17' },
  REVIEW:     { bg: '#fce4ec', text: '#c2185b' },
  COMPLETED:  { bg: '#f3e5f5', text: '#7b1fa2' },
  ON_HOLD:    { bg: '#fafafa', text: '#616161' },
};

const TYPE_LABELS = {
  WEB_APP: 'Web App', MOBILE_APP: 'Mobile', NETWORK: 'Network',
  API: 'API', CLOUD: 'Cloud', SOCIAL: 'Social Eng.', PHYSICAL: 'Physical',
};

const Engagements = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isClient = user?.role === 'CLIENT';

  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/engagements/');
        setEngagements(res.data.results || res.data);
      } catch {
        setError('Failed to load engagements.');
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700}>Engagements</Typography>
        <Typography variant="body1" color="text.secondary">
          {isClient ? 'Your active engagements' : 'Manage penetration testing engagements and projects'}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {engagements.length === 0 && !error && (
        <Alert severity="info">No engagements found.</Alert>
      )}

      <Grid container spacing={2}>
        {engagements.map((eng) => {
          const sc = STATUS_COLORS[eng.status] || STATUS_COLORS.PLANNING;
          return (
            <Grid item xs={12} key={eng.id}>
              <Card
                sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.2s' }}
                onClick={() => navigate(`/engagements/${eng.id}`)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton
                      sx={{ width: 48, height: 48, bgcolor: theme.palette.primary.main, color: 'white', flexShrink: 0,
                        '&:hover': { bgcolor: theme.palette.primary.dark } }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/engagements/${eng.id}`); }}
                    >
                      <FolderOpen />
                    </IconButton>

                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                        <Typography variant="h6" fontWeight={600} noWrap>{eng.name}</Typography>
                        {eng.engagement_type && (
                          <Chip label={TYPE_LABELS[eng.engagement_type] || eng.engagement_type} size="small" variant="outlined" />
                        )}
                        <Chip label={eng.status} size="small"
                          sx={{ bgcolor: sc.bg, color: sc.text, fontWeight: 600 }} />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {eng.organization_name && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Organisation:</strong> {eng.organization_name}
                          </Typography>
                        )}
                        {!isClient && eng.lead_pentester_name && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Lead:</strong> {eng.lead_pentester_name}
                          </Typography>
                        )}
                        {eng.start_date && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Dates:</strong> {eng.start_date} → {eng.end_date || '—'}
                          </Typography>
                        )}
                        {eng.findings_count !== undefined && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Findings:</strong> {eng.findings_count}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default Engagements;
