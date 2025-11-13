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
  MenuItem,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Add as AddIcon,
  TrendingUp,
  People,
  CheckCircle,
  Cancel,
  Pending,
} from '@mui/icons-material';
import { formatCurrency } from '../utils/currency.ts';

interface InsuranceStats {
  total_offers: number;
  pending_offers: number;
  accepted_offers: number;
  rejected_offers: number;
  total_premium_revenue: number;
  total_coverage_provided: number;
  avg_premium: number;
  tenants_with_insurance: number;
}

interface InsuranceOffer {
  Offer_ID: number;
  Property_Name: string;
  Street_Address: string;
  Tenant_Name: string;
  Provider: string;
  Coverage_Type: string;
  Coverage_Amount: number;
  Premium_Amount: number;
  Premium_Frequency: string;
  Start_Date: string;
  End_Date: string;
  Status: string;
  Tenant_Response: string | null;
  Response_Date: string | null;
  Created_At: string;
  Tenant_Total_Coverage: number;
  Tenant_Active_Policies: number;
}

interface EligibleTenant {
  Tenant_ID: number;
  Tenant_Name: string;
  Email: string;
  Phone: string;
  Property_ID: number;
  Property_Name: string;
  Street_Address: string;
  Lease_Start_Date: string;
  Lease_End_Date: string;
  Active_Policies: number;
  Total_Coverage: number;
}

const OwnerInsurance: React.FC = () => {
  const [stats, setStats] = useState<InsuranceStats | null>(null);
  const [offers, setOffers] = useState<InsuranceOffer[]>([]);
  const [eligibleTenants, setEligibleTenants] = useState<EligibleTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<EligibleTenant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    provider: '',
    coverageType: '',
    coverageAmount: '',
    premiumAmount: '',
    premiumFrequency: 'Monthly',
    startDate: '',
    endDate: '',
    terms: '',
    benefits: '',
  });

  const ownerId = localStorage.getItem('ownerId') || '';

  useEffect(() => {
    if (ownerId) {
      loadData();
    }
  }, [ownerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading insurance data for owner:', ownerId);
      
      const [statsRes, offersRes, tenantsRes] = await Promise.all([
        fetch(`http://localhost:5000/api/insurance/owner/${ownerId}/stats`),
        fetch(`http://localhost:5000/api/insurance/owner/${ownerId}/offers`),
        fetch(`http://localhost:5000/api/insurance/owner/${ownerId}/eligible-tenants`),
      ]);

      console.log('Response status:', {
        stats: statsRes.status,
        offers: offersRes.status,
        tenants: tenantsRes.status
      });

      const [statsData, offersData, tenantsData] = await Promise.all([
        statsRes.json(),
        offersRes.json(),
        tenantsRes.json(),
      ]);

      console.log('Insurance data loaded:', {
        stats: statsData,
        offers: offersData,
        tenants: tenantsData
      });

      setStats(statsData);
      setOffers(Array.isArray(offersData) ? offersData : []);
      setEligibleTenants(Array.isArray(tenantsData) ? tenantsData : []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load insurance data';
      setError(errorMsg);
      console.error('Error loading insurance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tenant: EligibleTenant) => {
    setSelectedTenant(tenant);
    setOpenDialog(true);
    setFormData({
      provider: '',
      coverageType: '',
      coverageAmount: '',
      premiumAmount: '',
      premiumFrequency: 'Monthly',
      startDate: '',
      endDate: '',
      terms: '',
      benefits: '',
    });
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTenant(null);
    setError(null);
  };

  const handleCreateOffer = async () => {
    if (!selectedTenant) return;

    try {
      const response = await fetch('http://localhost:5000/api/insurance/owner/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Property_ID: selectedTenant.Property_ID,
          Tenant_ID: selectedTenant.Tenant_ID,
          Provider: formData.provider,
          Coverage_Type: formData.coverageType,
          Coverage_Amount: parseFloat(formData.coverageAmount),
          Premium_Amount: parseFloat(formData.premiumAmount),
          Premium_Frequency: formData.premiumFrequency,
          Start_Date: formData.startDate,
          End_Date: formData.endDate,
          Terms: formData.terms,
          Benefits: formData.benefits,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Insurance offer created successfully!');
        handleCloseDialog();
        loadData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to create offer');
      }
    } catch (err) {
      setError('Failed to create insurance offer');
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
        Insurance Management
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
                <TrendingUp color="primary" fontSize="large" />
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
                    Pending Offers
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
                    Accepted
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
                    Insured Tenants
                  </Typography>
                  <Typography variant="h4">{stats?.tenants_with_insurance || 0}</Typography>
                </Box>
                <People color="info" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="body2">
                Total Premium Revenue
              </Typography>
              <Typography variant="h5" color="primary">
                {formatCurrency(stats?.total_premium_revenue || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="body2">
                Total Coverage Provided
              </Typography>
              <Typography variant="h5" color="success.main">
                {formatCurrency(stats?.total_coverage_provided || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="body2">
                Average Premium
              </Typography>
              <Typography variant="h5">
                {formatCurrency(stats?.avg_premium || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Eligible Tenants Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Eligible Tenants for Insurance Offers
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tenant</TableCell>
                <TableCell>Property</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Lease Period</TableCell>
                <TableCell>Current Coverage</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {eligibleTenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No eligible tenants found
                  </TableCell>
                </TableRow>
              ) : (
                eligibleTenants.map((tenant) => (
                  <TableRow key={`${tenant.Tenant_ID}-${tenant.Property_ID}`}>
                    <TableCell>{tenant.Tenant_Name}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{tenant.Property_Name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {tenant.Street_Address}
                      </Typography>
                    </TableCell>
                    <TableCell>{tenant.Email}</TableCell>
                    <TableCell>{tenant.Phone}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(tenant.Lease_Start_Date).toLocaleDateString()} -{' '}
                        {new Date(tenant.Lease_End_Date).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {tenant.Active_Policies} {tenant.Active_Policies === 1 ? 'policy' : 'policies'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {formatCurrency(tenant.Total_Coverage)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog(tenant)}
                      >
                        Create Offer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Insurance Offers Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Insurance Offers
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tenant</TableCell>
                <TableCell>Property</TableCell>
                <TableCell>Coverage</TableCell>
                <TableCell>Premium</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
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
                      <Typography variant="body2">{offer.Tenant_Name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {offer.Tenant_Active_Policies} active | {formatCurrency(offer.Tenant_Total_Coverage)} coverage
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{offer.Property_Name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {offer.Street_Address}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{offer.Coverage_Type}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {formatCurrency(offer.Coverage_Amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatCurrency(offer.Premium_Amount)}/{offer.Premium_Frequency}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {offer.Provider}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(offer.Start_Date).toLocaleDateString()} - {new Date(offer.End_Date).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={offer.Status}
                        color={getStatusColor(offer.Status)}
                        icon={getStatusIcon(offer.Status)}
                        size="small"
                      />
                      {offer.Tenant_Response && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          {offer.Response_Date && new Date(offer.Response_Date).toLocaleDateString()}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(offer.Created_At).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Offer Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Create Insurance Offer for {selectedTenant?.Tenant_Name}
        </DialogTitle>
        <DialogContent>
          {selectedTenant && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Property:</strong> {selectedTenant.Property_Name}
              </Typography>
              <Typography variant="body2">
                <strong>Address:</strong> {selectedTenant.Street_Address}
              </Typography>
            </Box>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Insurance Provider"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Coverage Type"
                value={formData.coverageType}
                onChange={(e) => setFormData({ ...formData, coverageType: e.target.value })}
                required
              >
                <MenuItem value="Property Insurance">Property Insurance</MenuItem>
                <MenuItem value="Liability Insurance">Liability Insurance</MenuItem>
                <MenuItem value="Renters Insurance">Renters Insurance</MenuItem>
                <MenuItem value="Comprehensive">Comprehensive</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Coverage Amount"
                type="number"
                value={formData.coverageAmount}
                onChange={(e) => setFormData({ ...formData, coverageAmount: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Premium Amount"
                type="number"
                value={formData.premiumAmount}
                onChange={(e) => setFormData({ ...formData, premiumAmount: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Premium Frequency"
                value={formData.premiumFrequency}
                onChange={(e) => setFormData({ ...formData, premiumFrequency: e.target.value })}
                required
              >
                <MenuItem value="Monthly">Monthly</MenuItem>
                <MenuItem value="Quarterly">Quarterly</MenuItem>
                <MenuItem value="Semi-Annual">Semi-Annual</MenuItem>
                <MenuItem value="Annual">Annual</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}></Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Terms & Conditions"
                multiline
                rows={3}
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Benefits"
                multiline
                rows={3}
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleCreateOffer}
            variant="contained"
            disabled={
              !formData.provider ||
              !formData.coverageType ||
              !formData.coverageAmount ||
              !formData.premiumAmount ||
              !formData.startDate ||
              !formData.endDate
            }
          >
            Create Offer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OwnerInsurance;
