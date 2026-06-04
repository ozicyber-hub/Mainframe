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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
} from '@mui/material';
import { Download, Visibility, Edit, Add } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const Reports = () => {
  const theme = useTheme();
  const [openDialog, setOpenDialog] = useState(false);

  const reports = [
    { id: 1, title: 'Acme Corp Web App Penetration Test Report', engagement: 'Acme Corp Web App', version: '1.2', status: 'Published', date: '2026-04-15', format: ['PDF', 'DOCX'] },
    { id: 2, title: 'TechStart API Security Assessment', engagement: 'TechStart API', version: '1.0', status: 'Draft', date: '2026-04-12', format: ['PDF'] },
    { id: 3, title: 'GlobalBank Mobile App Test Report', engagement: 'GlobalBank Mobile', version: '0.9', status: 'In Review', date: '2026-04-10', format: ['PDF', 'DOCX', 'XLSX'] },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Reports
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Generate and export penetration test reports
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{ backgroundColor: theme.palette.primary.main }}
        >
          Generate Report
        </Button>
      </Box>

      {/* Reports Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Engagement</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Generated</TableCell>
              <TableCell>Formats</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {report.title}
                  </Typography>
                </TableCell>
                <TableCell>{report.engagement}</TableCell>
                <TableCell><Chip label={`v${report.version}`} size="small" variant="outlined" /></TableCell>
                <TableCell>
                  <Chip
                    label={report.status}
                    size="small"
                    color={report.status === 'Published' ? 'success' : report.status === 'Draft' ? 'default' : 'warning'}
                  />
                </TableCell>
                <TableCell>{report.date}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {report.format.map((f) => (
                      <Chip key={f} label={f} size="small" variant="outlined" />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>
                  <IconButton size="small"><Visibility fontSize="small" /></IconButton>
                  <IconButton size="small"><Edit fontSize="small" /></IconButton>
                  <IconButton size="small">
                    <Download fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Generate Report Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Generate New Report</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth select label="Engagement" SelectProps={{ native: true }}>
                <option value="">Select Engagement</option>
                <option value="1">Acme Corp Web App</option>
                <option value="2">TechStart API</option>
                <option value="3">GlobalBank Mobile</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth select label="Template" SelectProps={{ native: true }}>
                <option value="">Select Template</option>
                <option value="1">OziCyber Standard</option>
                <option value="2">Executive Summary Only</option>
                <option value="3">Technical Detailed</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Report Title" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Executive Summary" multiline rows={4} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Methodology" multiline rows={3} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Conclusion" multiline rows={3} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Export Formats</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip label="PDF" color="primary" />
                <Chip label="Word (DOCX)" />
                <Chip label="Excel (XLSX)" />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" sx={{ backgroundColor: theme.palette.primary.main }}>
            Generate Report
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Reports;
