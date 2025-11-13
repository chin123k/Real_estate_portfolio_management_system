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
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import HistoryIcon from '@mui/icons-material/History';
import PendingIcon from '@mui/icons-material/Pending';

interface PaymentRow {
  Payment_ID: number;
  Lease_ID: number;
  Tenant_ID: number;
  Amount: number;
  Due_Date: string | null;
  Payment_Date: string | null;
  Payment_Method: string | null;
  Status: string;
  Late_Fee: number | null;
  Notes?: string | null;
  Property_Name: string;
  Street_Address: string;
  Monthly_Rent: number;
}

interface LeaseRow {
  Lease_ID: number;
  Property_ID: number;
  Tenant_ID: number;
  Start_Date: string;
  End_Date: string;
  Monthly_Rent: number;
  Property_Name: string;
  Street_Address: string;
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

const Transactions: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [pendingPayments, setPendingPayments] = useState<PaymentRow[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRow[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [openNewPayment, setOpenNewPayment] = useState(false);
  const [newPaymentLeaseId, setNewPaymentLeaseId] = useState<number | ''>('');
  const [newPaymentAmount, setNewPaymentAmount] = useState<number>(0);
  const [newPaymentDueDate, setNewPaymentDueDate] = useState<string>('');

  useEffect(() => {
    // Robustly determine the current tenant ID from localStorage
    // Priority: explicit 'tenantId' -> 'user'.Tenant_ID -> legacy 'tenant'.Tenant_ID
    const fromTenantId = localStorage.getItem('tenantId');
    let inferredId: number | null = null;
    if (fromTenantId && !isNaN(Number(fromTenantId))) {
      inferredId = Number(fromTenantId);
    } else {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          if (user && (user.Tenant_ID || user.tenantId)) {
            inferredId = Number(user.Tenant_ID || user.tenantId);
          }
        } catch {}
      }
      if (!inferredId) {
        const legacyTenantJson = localStorage.getItem('tenant');
        if (legacyTenantJson) {
          try {
            const legacy = JSON.parse(legacyTenantJson);
            if (legacy && legacy.Tenant_ID) {
              inferredId = Number(legacy.Tenant_ID);
            }
          } catch {}
        }
      }
    }

    if (inferredId) {
      setTenantId(inferredId);
      fetchPendingPayments(inferredId);
      fetchPaymentHistory(inferredId);
      fetchTransactions(inferredId);
      fetchLeases(inferredId);
    }
  }, []);

  // Ensure leases are fetched when opening New Payment dialog if not already loaded
  useEffect(() => {
    if (openNewPayment && tenantId && leases.length === 0) {
      fetchLeases(tenantId);
    }
  }, [openNewPayment, tenantId]);

  const fetchPendingPayments = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/payments/tenant/${id}/pending`);
      const data = await response.json();
      setPendingPayments(data);
    } catch (error) {
      console.error('Error fetching pending payments:', error);
    }
  };

  const fetchPaymentHistory = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/payments/tenant/${id}`);
      const data = await response.json();
      setPaymentHistory(data);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  };

  const fetchTransactions = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/transactions/tenant/${id}`);
      const data = await response.json();
      setAllTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchLeases = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/leases/tenant/${id}`);
      const data = await response.json();
      const mapped: LeaseRow[] = (data || []).map((l: any) => ({
        Lease_ID: l.Lease_ID,
        Property_ID: l.Property_ID,
        Tenant_ID: l.Tenant_ID,
        Start_Date: l.Start_Date,
        End_Date: l.End_Date,
        Monthly_Rent: Number(l.Monthly_Rent || 0),
        Property_Name: l.Property_Name,
        Street_Address: l.Street_Address,
      }));
      setLeases(mapped);
    } catch (e) {
      console.error('Error fetching leases:', e);
      setLeases([]);
    }
  };

  const handlePayClick = (payment: PaymentRow) => {
    setSelectedPayment(payment);
    setReferenceNumber(`PAY-${Date.now()}`);
    setOpenPayDialog(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedPayment || !tenantId) return;
    try {
      const response = await fetch('http://localhost:5000/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Lease_ID: selectedPayment.Lease_ID,
          Tenant_ID: tenantId,
          Amount: Number(selectedPayment.Amount || 0) + Number(selectedPayment.Late_Fee || 0),
          Payment_Date: new Date().toISOString().split('T')[0],
          Payment_Method: paymentMethod,
          Due_Date: selectedPayment.Due_Date || new Date().toISOString().split('T')[0],
          Notes: referenceNumber,
        }),
      });
      if (response.ok) {
        setSuccess('Payment submitted! Waiting for owner confirmation.');
        setOpenPayDialog(false);
        fetchPendingPayments(tenantId);
        fetchPaymentHistory(tenantId);
        fetchTransactions(tenantId);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        try {
          const data = await response.json();
          setError(data?.message || 'Payment processing failed');
        } catch {
          const text = await response.text();
          setError(text || 'Payment processing failed');
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      setError('An error occurred while processing payment');
    }
  };

  const handleCreateNewPayment = async () => {
    if (!tenantId || !newPaymentLeaseId || !newPaymentAmount) return;
    try {
      const response = await fetch('http://localhost:5000/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Lease_ID: newPaymentLeaseId,
          Tenant_ID: tenantId,
          Amount: newPaymentAmount,
          Payment_Date: new Date().toISOString().split('T')[0],
          Payment_Method: paymentMethod,
          Due_Date: newPaymentDueDate || new Date().toISOString().split('T')[0],
          Notes: referenceNumber || undefined,
        }),
      });
      if (response.ok) {
        setSuccess('Payment submitted! Waiting for owner confirmation.');
        setOpenNewPayment(false);
        setNewPaymentLeaseId('');
        setNewPaymentAmount(0);
        setNewPaymentDueDate('');
        fetchPendingPayments(tenantId);
        fetchPaymentHistory(tenantId);
      } else {
        try {
          const data = await response.json();
          setError(data?.message || 'Failed to submit payment');
        } catch {
          const text = await response.text();
          setError(text || 'Failed to submit payment');
        }
      }
    } catch (e) {
      console.error('Error creating payment:', e);
      setError('An error occurred while submitting payment');
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

  const totalPending = pendingPayments.reduce(
    (sum, payment) => sum + Number(payment.Amount || 0) + Number(payment.Late_Fee || 0),
    0
  );

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
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PendingIcon sx={{ mr: 1, color: '#f59e0b' }} />
                <Typography variant="h6">Pending Payments</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                {formatInr(totalPending)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {pendingPayments.length} payment(s) due
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
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              onClick={() => {
                setOpenNewPayment(true);
                setReferenceNumber(`PAY-${Date.now()}`);
                setPaymentMethod('Bank Transfer');
              }}
            >
              New Payment
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Property</TableCell>
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
                      <Typography variant="caption" color="text.secondary">
                        {payment.Street_Address}
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
                        startIcon={<PaymentIcon />}
                        onClick={() => handlePayClick(payment)}
                        sx={{ backgroundColor: '#10b981' }}
                      >
                        Pay Now
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {pendingPayments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                        No pending payments
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Property</TableCell>
                <TableCell>Amount</TableCell>
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
                  <TableCell>{formatInr(Number(payment.Amount || 0))}</TableCell>
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
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openPayDialog} onClose={() => setOpenPayDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Pay Rent</DialogTitle>
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
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Rent Amount</Typography>
                  <Typography variant="h6">{formatInr(Number(selectedPayment.Amount || 0))}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Late Fee</Typography>
                  <Typography variant="h6" sx={{ color: '#ef4444' }}>
                    {formatInr(Number(selectedPayment.Late_Fee || 0))}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e3a8a' }}>
                    {formatInr(Number(selectedPayment.Amount || 0) + Number(selectedPayment.Late_Fee || 0))}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label="Payment Method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    SelectProps={{ native: true }}
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Reference Number"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenPayDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handlePaymentSubmit} startIcon={<PaymentIcon />} sx={{ backgroundColor: '#10b981' }}>
            Confirm Payment
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openNewPayment} onClose={() => setOpenNewPayment(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Select Lease"
                  value={newPaymentLeaseId}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setNewPaymentLeaseId(val);
                    const lease = leases.find(l => l.Lease_ID === val);
                    if (lease) {
                      setNewPaymentAmount(Number(lease.Monthly_Rent || 0));
                      const due = new Date();
                      due.setDate(due.getDate() + 5);
                      setNewPaymentDueDate(due.toISOString().split('T')[0]);
                    }
                  }}
                  SelectProps={{ native: true }}
                >
                  <option value="" disabled>Select...</option>
                  {leases.map((l) => (
                    <option value={l.Lease_ID} key={l.Lease_ID}>
                      {l.Property_Name} - {l.Street_Address}
                    </option>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth type="number" label="Amount" value={newPaymentAmount} onChange={(e) => setNewPaymentAmount(Number(e.target.value))} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth type="date" label="Due Date" InputLabelProps={{ shrink: true }} value={newPaymentDueDate} onChange={(e) => setNewPaymentDueDate(e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Payment Method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  SelectProps={{ native: true }}
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Reference/Notes" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenNewPayment(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateNewPayment} startIcon={<PaymentIcon />} sx={{ backgroundColor: '#10b981' }} disabled={!newPaymentLeaseId || !newPaymentAmount}>
            Submit Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Transactions;
