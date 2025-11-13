import React, { useState, useEffect } from 'react';
import { formatInr } from '../utils/currency.ts';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  IconButton,
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import HistoryIcon from '@mui/icons-material/History';
import PendingIcon from '@mui/icons-material/Pending';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';

interface PaymentRow {
  Payment_ID: number;
  Lease_ID: number;
  Tenant_ID: number;
  Tenant_Name: string;
  Tenant_Email: string;
  Amount: number;
  Due_Date: string | null;
  Payment_Date: string | null;
  Payment_Method: string | null;
  Status: string;
  Late_Fee: number | null;
  Notes?: string | null;
  Property_Name: string;
  Monthly_Rent: number;
}

interface Transaction {
  Transaction_ID: number;
  Transaction_Type: string;
  Amount: number;
  Transaction_Date: string;
  Description: string;
  Category: string;
  Payment_Method: string;
  Status: string;
  Property_Name: string;
}

interface PaymentStats {
  total_payments: number;
  total_received: number;
  total_pending: number;
  total_overdue: number;
  total_late_fees: number;
}

const OwnerPayments: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [pendingPayments, setPendingPayments] = useState<PaymentRow[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRow[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    total_payments: 0,
    total_received: 0,
    total_pending: 0,
    total_overdue: 0,
    total_late_fees: 0,
  });
  const [openApproveDialog, setOpenApproveDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [lateFee, setLateFee] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Get owner ID from localStorage
    const fromOwnerId = localStorage.getItem('ownerId');
    let inferredId: number | null = null;
    if (fromOwnerId && !isNaN(Number(fromOwnerId))) {
      inferredId = Number(fromOwnerId);
    } else {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          if (user && (user.Owner_ID || user.ownerId)) {
            inferredId = Number(user.Owner_ID || user.ownerId);
          }
        } catch {}
      }
    }

    if (inferredId) {
      setOwnerId(inferredId);
      fetchPayments(inferredId);
      fetchStats(inferredId);
      fetchTransactions(inferredId);
    }
  }, []);

  const fetchPayments = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/payments/owner/${id}`);
      const data = await response.json();
      
      // Separate pending and history
      const pending = data.filter((p: PaymentRow) => p.Status === 'Pending' || p.Status === 'Overdue');
      const history = data.filter((p: PaymentRow) => p.Status === 'Paid');
      
      setPendingPayments(pending);
      setPaymentHistory(history);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchStats = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/payments/owner/${id}/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTransactions = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/transactions/owner/${id}`);
      const data = await response.json();
      setAllTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleViewPayment = (payment: PaymentRow) => {
    setSelectedPayment(payment);
    setLateFee(Number(payment.Late_Fee || 0));
    setNotes(payment.Notes || '');
    setOpenApproveDialog(true);
  };

  const handleApprovePayment = async () => {
    if (!selectedPayment || !ownerId) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/payments/${selectedPayment.Payment_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Status: 'Paid',
          Late_Fee: lateFee,
          Notes: notes,
        }),
      });

      if (response.ok) {
        setSuccess('Payment approved successfully!');
        setOpenApproveDialog(false);
        fetchPayments(ownerId);
        fetchStats(ownerId);
        fetchTransactions(ownerId);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data?.message || 'Failed to approve payment');
      }
    } catch (error) {
      console.error('Error approving payment:', error);
      setError('An error occurred while approving payment');
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedPayment || !ownerId) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/payments/${selectedPayment.Payment_ID}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Payment rejected and removed.');
        setOpenApproveDialog(false);
        fetchPayments(ownerId);
        fetchStats(ownerId);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data?.message || 'Failed to reject payment');
      }
    } catch (error) {
      console.error('Error rejecting payment:', error);
      setError('An error occurred while rejecting payment');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'success';
      case 'Pending':
        return 'warning';
      case 'Overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Rent & Transactions
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your rent payments and view transaction history
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PendingIcon sx={{ mr: 1, color: '#f59e0b' }} />
                <Typography variant="h6">Pending Payments</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                {formatInr(stats.total_pending)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {pendingPayments.length} payment(s) due
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircleIcon sx={{ mr: 1, color: '#10b981' }} />
                <Typography variant="h6">Total Received</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#10b981' }}>
                {formatInr(stats.total_received)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Approved payments
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CancelIcon sx={{ mr: 1, color: '#ef4444' }} />
                <Typography variant="h6">Overdue</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ef4444' }}>
                {formatInr(stats.total_overdue)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Past due date
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PaymentIcon sx={{ mr: 1, color: '#8b5cf6' }} />
                <Typography variant="h6">Late Fees</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#8b5cf6' }}>
                {formatInr(stats.total_late_fees)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total collected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Pending Payments" icon={<PendingIcon />} iconPosition="start" />
          <Tab label="Payment History" icon={<HistoryIcon />} iconPosition="start" />
          <Tab label="All Transactions" icon={<PaymentIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Property</TableCell>
                <TableCell>Tenant</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Late Fee</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingPayments.map((payment) => (
                <TableRow key={payment.Payment_ID}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {payment.Property_Name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {payment.Tenant_Name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {payment.Tenant_Email}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatInr(Number(payment.Amount || 0))}</TableCell>
                  <TableCell>
                    <Typography sx={{ color: Number(payment.Late_Fee || 0) > 0 ? '#ef4444' : 'inherit' }}>
                      {formatInr(Number(payment.Late_Fee || 0))}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {formatInr(Number(payment.Amount || 0) + Number(payment.Late_Fee || 0))}
                  </TableCell>
                  <TableCell>{payment.Due_Date ? formatDate(payment.Due_Date) : '—'}</TableCell>
                  <TableCell>
                    <Chip label={payment.Status} color={getStatusColor(payment.Status) as any} size="small" />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewPayment(payment)}
                      sx={{ backgroundColor: '#3b82f6' }}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {pendingPayments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                      No pending payments
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Property</TableCell>
                <TableCell>Tenant</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Late Fee</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Payment Date</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paymentHistory.map((payment) => (
                <TableRow key={payment.Payment_ID}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {payment.Property_Name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {payment.Tenant_Name}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatInr(Number(payment.Amount || 0))}</TableCell>
                  <TableCell>
                    <Typography sx={{ color: Number(payment.Late_Fee || 0) > 0 ? '#ef4444' : 'inherit' }}>
                      {formatInr(Number(payment.Late_Fee || 0))}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {formatInr(Number(payment.Amount || 0) + Number(payment.Late_Fee || 0))}
                  </TableCell>
                  <TableCell>{payment.Due_Date ? formatDate(payment.Due_Date) : '—'}</TableCell>
                  <TableCell>
                    {payment.Payment_Date ? formatDate(payment.Payment_Date) : 'N/A'}
                  </TableCell>
                  <TableCell>{payment.Payment_Method || '—'}</TableCell>
                  <TableCell>
                    <Chip label={payment.Status} color={getStatusColor(payment.Status) as any} size="small" />
                  </TableCell>
                </TableRow>
              ))}
              {paymentHistory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                      No payment history
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tabValue === 2 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allTransactions.map((transaction) => (
                <TableRow key={transaction.Transaction_ID}>
                  <TableCell>{formatDate(transaction.Transaction_Date)}</TableCell>
                  <TableCell>
                    <Chip label={transaction.Transaction_Type} size="small" />
                  </TableCell>
                  <TableCell>{transaction.Description}</TableCell>
                  <TableCell>{transaction.Category}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {formatInr(transaction.Amount)}
                  </TableCell>
                  <TableCell>
                    <Chip label={transaction.Status} color="success" size="small" />
                  </TableCell>
                </TableRow>
              ))}
              {allTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                      No transactions
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openApproveDialog} onClose={() => setOpenApproveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Review Payment</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Property</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedPayment.Property_Name}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Tenant</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedPayment.Tenant_Name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedPayment.Tenant_Email}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Payment Amount</Typography>
                  <Typography variant="h6">{formatInr(Number(selectedPayment.Amount || 0))}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Payment Method</Typography>
                  <Typography variant="body1">{selectedPayment.Payment_Method || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Due Date</Typography>
                  <Typography variant="body1">
                    {selectedPayment.Due_Date ? formatDate(selectedPayment.Due_Date) : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Payment Date</Typography>
                  <Typography variant="body1">
                    {selectedPayment.Payment_Date ? formatDate(selectedPayment.Payment_Date) : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Late Fee (if applicable)"
                    value={lateFee}
                    onChange={(e) => setLateFee(Number(e.target.value))}
                    helperText="Add late fee if payment is overdue"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this payment..."
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e3a8a' }}>
                    {formatInr(Number(selectedPayment.Amount || 0) + Number(lateFee || 0))}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setOpenApproveDialog(false)}>Cancel</Button>
          <Button 
            variant="outlined" 
            color="error"
            onClick={handleRejectPayment}
            startIcon={<CancelIcon />}
          >
            Reject
          </Button>
          <Button 
            variant="contained" 
            onClick={handleApprovePayment} 
            startIcon={<CheckCircleIcon />}
            sx={{ backgroundColor: '#10b981' }}
          >
            Approve Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OwnerPayments;
