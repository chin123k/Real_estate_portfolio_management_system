import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
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
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Pending,
  Security,
  AttachMoney,
  CalendarToday,
  Info,
} from '@mui/icons-material';
import { formatCurrency } from '../utils/currency.ts';

interface InsuranceStats {
  total_offers: number;
  pending_offers: number;
  accepted_offers: number;
  rejected_offers: number;
  total_coverage: number;
  total_premiums_paid: number;
  avg_premium: number;
  earliest_start: string | null;
  latest_end: string | null;
}

interface InsuranceOffer {
  Offer_ID: number;
  Property_Name: string;
  Street_Address: string;
  Owner_Name: string;
  Provider: string;
  Coverage_Type: string;
  Coverage_Amount: number;
  Premium_Amount: number;
  Premium_Frequency: string;
  Start_Date: string;
  End_Date: string;
  Terms: string;
  Benefits: string;
  Status: string;
  Tenant_Response: string | null;
  Response_Date: string | null;
  Created_At: string;
}

const TenantInsurance: React.FC = () => {
  const [stats, setStats] = useState<InsuranceStats | null>(null);
  const [offers, setOffers] = useState<InsuranceOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<InsuranceOffer | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [response, setResponse] = useState('');
  const [actionType, setActionType] = useState<'accept' | 'reject'>('accept');

  const tenantId = localStorage.getItem('tenantId') || '';

  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [tenantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, offersRes] = await Promise.all([
        fetch(`http://localhost:5000/api/insurance/tenant/${tenantId}/stats`),
        fetch(`http://localhost:5000/api/insurance/tenant/${tenantId}/offers`),
      ]);

      const [statsData, offersData] = await Promise.all([
        statsRes.json(),
        offersRes.json(),
      ]);

      console.log('Tenant insurance data loaded:', { stats: statsData, offers: offersData });

      setStats(statsData);
      setOffers(Array.isArray(offersData) ? offersData : []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load insurance data';
      setError(errorMsg);
      console.error('Error loading tenant insurance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (offer: InsuranceOffer, action: 'accept' | 'reject') => {
    setSelectedOffer(offer);
    setActionType(action);
    setOpenDialog(true);
    setResponse('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedOffer(null);
    setResponse('');
    setError(null);
  };

  const handleRespond = async () => {
    if (!selectedOffer) return;

    try {
      const responsePayload = await fetch(
        `http://localhost:5000/api/insurance/tenant/offer/${selectedOffer.Offer_ID}/respond`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Status: actionType === 'accept' ? 'Accepted' : 'Rejected',
            Tenant_Response: response,
          }),
        }
      );

      const result = await responsePayload.json();

      if (responsePayload.ok) {
        setSuccess(
          actionType === 'accept'
            ? 'Insurance offer accepted successfully!'
            : 'Insurance offer rejected'
        );
        handleCloseDialog();
        loadData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to respond to offer');
      }
    } catch (err) {
      setError('Failed to respond to insurance offer');
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'warning';
      case 'Accepted':
        return 'success';
      case 'Rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Pending />;
      case 'Accepted':
        return <CheckCircle />;
      case 'Rejected':
        return <Cancel />;
      default:
        return undefined;
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        My Insurance Offers
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Offers
                  </Typography>
                  <Typography variant="h4">{stats?.total_offers || 0}</Typography>
                </Box>
                <Info color="primary" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Pending Review
                  </Typography>
                  <Typography variant="h4">{stats?.pending_offers || 0}</Typography>
                </Box>
                <Pending color="warning" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Active Policies
                  </Typography>
                  <Typography variant="h4">{stats?.accepted_offers || 0}</Typography>
                </Box>
                <CheckCircle color="success" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Coverage
                  </Typography>
                  <Typography variant="h5">{formatCurrency(stats?.total_coverage || 0)}</Typography>
                </Box>
                <Security color="info" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <AttachMoney color="action" />
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Premiums Paid
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(stats?.total_premiums_paid || 0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <AttachMoney color="action" />
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Average Premium
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(stats?.avg_premium || 0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CalendarToday color="action" />
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Coverage Period
                  </Typography>
                  {stats?.earliest_start && stats?.latest_end ? (
                    <Typography variant="body2">
                      {new Date(stats.earliest_start).toLocaleDateString()} -{' '}
                      {new Date(stats.latest_end).toLocaleDateString()}
                    </Typography>
                  ) : (
                    <Typography variant="body2">No active coverage</Typography>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Insurance Offers Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Insurance Offers
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Property</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Coverage</TableCell>
                <TableCell>Premium</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {offers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No insurance offers yet
                  </TableCell>
                </TableRow>
              ) : (
                offers.map((offer) => (
                  <TableRow key={offer.Offer_ID}>
                    <TableCell>
                      <Typography variant="body2">{offer.Property_Name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {offer.Street_Address}
                      </Typography>
                      <Typography variant="caption" display="block" color="textSecondary">
                        Owner: {offer.Owner_Name}
                      </Typography>
                    </TableCell>
                    <TableCell>{offer.Provider}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{offer.Coverage_Type}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {formatCurrency(offer.Coverage_Amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatCurrency(offer.Premium_Amount)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {offer.Premium_Frequency}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(offer.Start_Date).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        to {new Date(offer.End_Date).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={offer.Status}
                        color={getStatusColor(offer.Status)}
                        icon={getStatusIcon(offer.Status)}
                        size="small"
                      />
                      {offer.Response_Date && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          {new Date(offer.Response_Date).toLocaleDateString()}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {offer.Status === 'Pending' ? (
                        <Box display="flex" gap={1}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => handleOpenDialog(offer, 'accept')}
                          >
                            Accept
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => handleOpenDialog(offer, 'reject')}
                          >
                            Reject
                          </Button>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="textSecondary">
                          {offer.Status}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Response Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {actionType === 'accept' ? 'Accept' : 'Reject'} Insurance Offer
        </DialogTitle>
        <DialogContent>
          {selectedOffer && (
            <>
              <Alert severity={actionType === 'accept' ? 'success' : 'warning'} sx={{ mb: 2 }}>
                You are about to {actionType} this insurance offer
              </Alert>

              <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Property
                    </Typography>
                    <Typography variant="body1">{selectedOffer.Property_Name}</Typography>
                    <Typography variant="caption">{selectedOffer.Street_Address}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Provider
                    </Typography>
                    <Typography variant="body1">{selectedOffer.Provider}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Coverage Type
                    </Typography>
                    <Typography variant="body1">{selectedOffer.Coverage_Type}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Coverage Amount
                    </Typography>
                    <Typography variant="body1" color="primary">
                      {formatCurrency(selectedOffer.Coverage_Amount)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Premium
                    </Typography>
                    <Typography variant="body1">
                      {formatCurrency(selectedOffer.Premium_Amount)} / {selectedOffer.Premium_Frequency}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {selectedOffer.Terms && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Terms & Conditions
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedOffer.Terms}
                    </Typography>
                  </Paper>
                </Box>
              )}

              {selectedOffer.Benefits && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Benefits
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedOffer.Benefits}
                    </Typography>
                  </Paper>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <TextField
                fullWidth
                label={`Your Response (Optional)`}
                multiline
                rows={3}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder={
                  actionType === 'accept'
                    ? 'Add any comments or questions about the policy...'
                    : 'Please provide a reason for rejection...'
                }
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleRespond}
            variant="contained"
            color={actionType === 'accept' ? 'success' : 'error'}
          >
            Confirm {actionType === 'accept' ? 'Accept' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TenantInsurance;
