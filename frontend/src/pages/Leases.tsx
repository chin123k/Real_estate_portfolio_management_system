import React, { useState, useEffect } from 'react';
import { formatInr } from '../utils/currency.ts';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Paper,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface Lease {
  Lease_ID: number;
  Property_ID: number;
  Tenant_ID: number;
  Start_Date: string;
  End_Date: string;
  Monthly_Rent: number;
  Security_Deposit: number;
  Status: string;
  Property_Name?: string;
  Tenant_Name?: string;
}

const Leases: React.FC = () => {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    Property_ID: '',
    Tenant_ID: '',
    Start_Date: '',
    End_Date: '',
    Monthly_Rent: '',
    Security_Deposit: '',
    Status: 'Active',
    Lease_Terms: '',
  });

  useEffect(() => {
    fetchLeases();
    fetchProperties();
    fetchTenants();
  }, []);

  const fetchLeases = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/leases');
      const data = await response.json();
      setLeases(data);
    } catch (error) {
      console.error('Error fetching leases:', error);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/properties');
      const data = await response.json();
      setProperties(data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/tenants');
      const data = await response.json();
      setTenants(data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({
      Property_ID: '',
      Tenant_ID: '',
      Start_Date: '',
      End_Date: '',
      Monthly_Rent: '',
      Security_Deposit: '',
      Status: 'Active',
      Lease_Terms: '',
    });
  };

  const handleInputChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/leases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        fetchLeases();
        handleClose();
      }
    } catch (error) {
      console.error('Error adding lease:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return { bg: '#dcfce7', color: '#16a34a' };
      case 'Expired':
        return { bg: '#fee2e2', color: '#dc2626' };
      case 'Pending':
        return { bg: '#fef3c7', color: '#d97706' };
      default:
        return { bg: '#f3f4f6', color: '#6b7280' };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Box sx={{ backgroundColor: '#f8fafc', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
              Lease Agreements
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your property lease agreements and contracts
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleClickOpen}
            sx={{
              backgroundColor: '#1e3a8a',
              px: 3,
              '&:hover': { backgroundColor: '#1e40af' },
            }}
          >
            New Lease
          </Button>
        </Box>

        <Grid container spacing={3}>
          {leases.map((lease) => {
            const daysRemaining = getDaysRemaining(lease.End_Date);
            const statusColors = getStatusColor(lease.Status);

            return (
              <Grid item xs={12} md={6} lg={4} key={lease.Lease_ID}>
                <Card
                  sx={{
                    borderRadius: 3,
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 24px rgba(0,0,0,0.12)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                      p: 3,
                      color: 'white',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Chip
                        label={lease.Status}
                        size="small"
                        sx={{
                          backgroundColor: statusColors.bg,
                          color: statusColors.color,
                          fontWeight: 600,
                        }}
                      />
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Lease #{lease.Lease_ID}
                      </Typography>
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                      {formatInr(lease.Monthly_Rent || 0)}/mo
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Security Deposit: {formatInr(lease.Security_Deposit || 0)}
                    </Typography>
                  </Box>

                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <HomeIcon sx={{ color: '#64748b', fontSize: 20 }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.25 }}>
                            Property
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {lease.Property_Name || `Property #${lease.Property_ID}`}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <PersonIcon sx={{ color: '#64748b', fontSize: 20 }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.25 }}>
                            Tenant
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {lease.Tenant_Name || `Tenant #${lease.Tenant_ID}`}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CalendarTodayIcon sx={{ color: '#64748b', fontSize: 20 }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.25 }}>
                            Lease Period
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {formatDate(lease.Start_Date)} - {formatDate(lease.End_Date)}
                          </Typography>
                        </Box>
                      </Box>

                      {daysRemaining > 0 && daysRemaining < 60 && (
                        <Paper
                          sx={{
                            p: 1.5,
                            backgroundColor: '#fef3c7',
                            borderRadius: 2,
                            textAlign: 'center',
                          }}
                        >
                          <Typography variant="body2" sx={{ color: '#d97706', fontWeight: 600 }}>
                            ⚠ Expires in {daysRemaining} days
                          </Typography>
                        </Paper>
                      )}

                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button
                          variant="outlined"
                          fullWidth
                          startIcon={<EditIcon />}
                          sx={{ borderColor: '#e2e8f0', color: '#3b82f6' }}
                        >
                          Edit
                        </Button>
                        <IconButton sx={{ color: '#ef4444' }}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontSize: '1.5rem', fontWeight: 700 }}>Create New Lease</DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Property</InputLabel>
                  <Select
                    name="Property_ID"
                    value={formData.Property_ID}
                    onChange={handleInputChange}
                    label="Property"
                  >
                    {properties.map((property) => (
                      <MenuItem key={property.Property_ID} value={property.Property_ID}>
                        {property.Property_Name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Tenant</InputLabel>
                  <Select
                    name="Tenant_ID"
                    value={formData.Tenant_ID}
                    onChange={handleInputChange}
                    label="Tenant"
                  >
                    {tenants.map((tenant) => (
                      <MenuItem key={tenant.Tenant_ID} value={tenant.Tenant_ID}>
                        {tenant.First_Name} {tenant.Last_Name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="Start_Date"
                  label="Start Date"
                  type="date"
                  fullWidth
                  value={formData.Start_Date}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="End_Date"
                  label="End Date"
                  type="date"
                  fullWidth
                  value={formData.End_Date}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="Monthly_Rent"
                  label="Monthly Rent"
                  type="number"
                  fullWidth
                  value={formData.Monthly_Rent}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="Security_Deposit"
                  label="Security Deposit"
                  type="number"
                  fullWidth
                  value={formData.Security_Deposit}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="Status"
                    value={formData.Status}
                    onChange={handleInputChange}
                    label="Status"
                  >
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="Expired">Expired</MenuItem>
                    <MenuItem value="Terminated">Terminated</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="Lease_Terms"
                  label="Lease Terms"
                  fullWidth
                  multiline
                  rows={4}
                  value={formData.Lease_Terms}
                  onChange={handleInputChange}
                  placeholder="Enter lease terms and conditions..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleClose} size="large">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              size="large"
              sx={{
                backgroundColor: '#1e3a8a',
                px: 4,
                '&:hover': { backgroundColor: '#1e40af' },
              }}
            >
              Create Lease
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Leases;
