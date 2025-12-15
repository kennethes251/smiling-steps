import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
  AccountBalance as AccountBalanceIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import moment from 'moment';
import axios from 'axios';

const AccountingDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // State for export functionality
  const [formats, setFormats] = useState([]);
  const [selectedFormat, setSelectedFormat] = useState('generic');
  const [startDate, setStartDate] = useState(moment().startOf('month'));
  const [endDate, setEndDate] = useState(moment().endOf('month'));
  const [includeRefunds, setIncludeRefunds] = useState(false);
  
  // State for accounting summary
  const [summary, setSummary] = useState(null);
  const [chartOfAccounts, setChartOfAccounts] = useState({});
  
  // State for journal entries
  const [journalEntries, setJournalEntries] = useState([]);
  const [journalDialog, setJournalDialog] = useState(false);
  
  // State for scheduling
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    format: 'generic',
    frequency: 'monthly',
    dayOfWeek: 1,
    dayOfMonth: 1,
    email: '',
    enabled: true
  });

  useEffect(() => {
    fetchFormats();
    fetchSummary();
  }, []);

  const fetchFormats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/accounting/formats', {
        headers: { 'x-auth-token': token }
      });
      
      if (response.data.success) {
        setFormats(response.data.formats);
        setChartOfAccounts(response.data.chartOfAccounts);
      }
    } catch (error) {
      console.error('Error fetching formats:', error);
      setError('Failed to load accounting formats');
    }
  };

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/accounting/summary', {
        headers: { 'x-auth-token': token },
        params: {
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD')
        }
      });
      
      if (response.data.success) {
        setSummary(response.data.summary);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
      setError('Failed to load accounting summary');
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/accounting/export', {
        headers: { 'x-auth-token': token },
        params: {
          format: selectedFormat,
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
          includeRefunds: includeRefunds.toString()
        },
        responseType: 'blob'
      });
      
      // Create download link
      const formatInfo = formats.find(f => f.key === selectedFormat);
      const filename = `accounting_export_${selectedFormat}_${startDate.format('YYYY-MM-DD')}_${endDate.format('YYYY-MM-DD')}.${formatInfo.fileExtension}`;
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setSuccess(`Export downloaded successfully: ${filename}`);
    } catch (error) {
      console.error('Error exporting data:', error);
      setError('Failed to export accounting data');
    } finally {
      setLoading(false);
    }
  };

  const handleJournalEntries = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/accounting/journal-entries', {
        headers: { 'x-auth-token': token },
        params: {
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
          includeRefunds: includeRefunds.toString()
        }
      });
      
      if (response.data.success) {
        setJournalEntries(response.data.journalEntries);
        setJournalDialog(true);
      }
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      setError('Failed to generate journal entries');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleExport = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/accounting/schedule-export', scheduleForm, {
        headers: { 'x-auth-token': token }
      });
      
      if (response.data.success) {
        setSuccess('Accounting export scheduled successfully');
        setScheduleDialog(false);
      }
    } catch (error) {
      console.error('Error scheduling export:', error);
      setError('Failed to schedule export');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountBalanceIcon />
          Accounting Integration
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {/* Summary Cards */}
        {summary && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h5" color="primary">
                    {formatCurrency(summary.totalRevenue)}
                  </Typography>
                  <Typography variant="body2">
                    {summary.totalTransactions} transactions
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Processing Fees
                  </Typography>
                  <Typography variant="h5" color="warning.main">
                    {formatCurrency(summary.processingFees)}
                  </Typography>
                  <Typography variant="body2">
                    M-Pesa fees (1%)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Net Revenue
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    {formatCurrency(summary.netRevenue)}
                  </Typography>
                  <Typography variant="body2">
                    After fees & refunds
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Avg Transaction
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(summary.averageTransactionValue)}
                  </Typography>
                  <Typography variant="body2">
                    Per session
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Export Controls */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Export Payment Data
            </Typography>
            
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Export Format</InputLabel>
                  <Select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    label="Export Format"
                  >
                    {formats.map((format) => (
                      <MenuItem key={format.key} value={format.key}>
                        {format.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={setStartDate}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              
              <Grid item xs={12} md={2}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={setEndDate}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Include Refunds</InputLabel>
                  <Select
                    value={includeRefunds}
                    onChange={(e) => setIncludeRefunds(e.target.value)}
                    label="Include Refunds"
                  >
                    <MenuItem value={false}>No</MenuItem>
                    <MenuItem value={true}>Yes</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleExport}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <DownloadIcon />}
                    fullWidth
                  >
                    Export
                  </Button>
                </Box>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={handleJournalEntries}
                startIcon={<ReceiptIcon />}
                disabled={loading}
              >
                Journal Entries
              </Button>
              <Button
                variant="outlined"
                onClick={() => setScheduleDialog(true)}
                startIcon={<ScheduleIcon />}
              >
                Schedule Export
              </Button>
              <Button
                variant="outlined"
                onClick={fetchSummary}
                startIcon={<TrendingUpIcon />}
              >
                Refresh Summary
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Supported Formats */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Supported Accounting Software
            </Typography>
            
            <Grid container spacing={2}>
              {formats.map((format) => (
                <Grid item xs={12} md={6} key={format.key}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="primary">
                        {format.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {format.description}
                      </Typography>
                      <Chip 
                        label={`.${format.fileExtension}`} 
                        size="small" 
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* Chart of Accounts */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Chart of Accounts
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Account Code</TableCell>
                    <TableCell>Account Name</TableCell>
                    <TableCell>Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(chartOfAccounts).map(([key, account]) => (
                    <TableRow key={key}>
                      <TableCell>{account.account}</TableCell>
                      <TableCell>{account.name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={account.type} 
                          color={
                            account.type === 'Income' ? 'success' :
                            account.type === 'Expense' ? 'error' : 'primary'
                          }
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Journal Entries Dialog */}
        <Dialog 
          open={journalDialog} 
          onClose={() => setJournalDialog(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>Journal Entries</DialogTitle>
          <DialogContent>
            {journalEntries.map((entry, index) => (
              <Accordion key={index}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>
                    {entry.date} - {entry.reference} - {entry.description}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Account</TableCell>
                          <TableCell>Account Name</TableCell>
                          <TableCell align="right">Debit</TableCell>
                          <TableCell align="right">Credit</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {entry.entries.map((line, lineIndex) => (
                          <TableRow key={lineIndex}>
                            <TableCell>{line.account}</TableCell>
                            <TableCell>{line.accountName}</TableCell>
                            <TableCell align="right">
                              {parseFloat(line.debit) > 0 ? formatCurrency(line.debit) : '-'}
                            </TableCell>
                            <TableCell align="right">
                              {parseFloat(line.credit) > 0 ? formatCurrency(line.credit) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setJournalDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Schedule Export Dialog */}
        <Dialog 
          open={scheduleDialog} 
          onClose={() => setScheduleDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Schedule Automated Export</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Export Format</InputLabel>
                  <Select
                    value={scheduleForm.format}
                    onChange={(e) => setScheduleForm({...scheduleForm, format: e.target.value})}
                    label="Export Format"
                  >
                    {formats.map((format) => (
                      <MenuItem key={format.key} value={format.key}>
                        {format.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Frequency</InputLabel>
                  <Select
                    value={scheduleForm.frequency}
                    onChange={(e) => setScheduleForm({...scheduleForm, frequency: e.target.value})}
                    label="Frequency"
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={scheduleForm.email}
                  onChange={(e) => setScheduleForm({...scheduleForm, email: e.target.value})}
                  helperText="Export will be emailed to this address"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setScheduleDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleScheduleExport}
              variant="contained"
              disabled={loading || !scheduleForm.email}
            >
              Schedule
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default AccountingDashboard;