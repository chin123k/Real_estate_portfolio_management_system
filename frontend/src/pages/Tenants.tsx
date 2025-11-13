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
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WorkIcon from '@mui/icons-material/Work';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

interface Tenant {
  Tenant_ID: number;
  First_Name: string;
  Last_Name: string;
  Email: string;
  Phone: string;
  Credit_Score: number;
  Employment_Status: string;
  Monthly_Income: number;
}

const Tenants: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    First_Name: '',
    Last_Name: '',
    Email: '',
    Phone: '',
    Credit_Score: '',
    Employment_Status: 'Employed',
    Monthly_Income: '',
  });

  // Get owner ID from localStorage
  const ownerId = localStorage.getItem('ownerId') || '1';

  useEffect(() => {
    fetchTenants();
  }, [ownerId]);

  const fetchTenants = async () => {
    try {
      // Fetch only tenants who have leased this owner's properties
      const response = await fetch(`http://localhost:5000/api/tenants/owner/${ownerId}`);
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
    setEditMode(false);
    setSelectedTenantId(null);
    setFormData({
      First_Name: '',
      Last_Name: '',
      Email: '',
      Phone: '',
      Credit_Score: '',
      Employment_Status: 'Employed',
      Monthly_Income: '',
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      const url = editMode 
        ? `http://localhost:5000/api/tenants/${selectedTenantId}`
        : 'http://localhost:5000/api/tenants';
      
      // Include Owner_ID when creating tenant
      const dataToSubmit = {
        ...formData,
        Credit_Score: Number(formData.Credit_Score),
        Monthly_Income: Number(formData.Monthly_Income),
        Owner_ID: ownerId
      };
      
      const response = await fetch(url, {
        method: editMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      });
      if (response.ok) {
        fetchTenants();
        handleClose();
      } else {
        const error = await response.json();
        alert(error.message || `Failed to ${editMode ? 'update' : 'add'} tenant`);
      }
    } catch (error) {
      console.error(`Error ${editMode ? 'updating' : 'adding'} tenant:`, error);
      alert(`Failed to ${editMode ? 'update' : 'add'} tenant`);
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setEditMode(true);
    setSelectedTenantId(tenant.Tenant_ID);
    setFormData({
      First_Name: tenant.First_Name,
      Last_Name: tenant.Last_Name,
      Email: tenant.Email,
      Phone: tenant.Phone,
      Credit_Score: tenant.Credit_Score.toString(),
      Employment_Status: tenant.Employment_Status,
      Monthly_Income: tenant.Monthly_Income.toString(),
    });
    setOpen(true);
  };

  const handleDelete = async (tenantId: number) => {
    if (!window.confirm('Are you sure you want to delete this tenant?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/tenants/${tenantId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTenants();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete tenant');
      }
    } catch (error) {
      console.error('Error deleting tenant:', error);
      alert('Failed to delete tenant');
    }
  };

  const getCreditScoreColor = (score: number) => {
    if (score >= 750) return '#10b981';
    if (score >= 650) return '#f59e0b';
    return '#ef4444';
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  return (
    <Box sx={{ backgroundColor: '#f8fafc', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
              Tenant Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your tenant information and track their details
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
            Add Tenant
          </Button>
        </Box>

        <Grid container spacing={3}>
          {tenants.map((tenant) => (
            <Grid item xs={12} sm={6} md={4} key={tenant.Tenant_ID}>
              <Card
                sx={{
                  borderRadius: 3,
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.12)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar
                      sx={{
                        width: 56,
                        height: 56,
                        backgroundColor: '#3b82f6',
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        mr: 2,
                      }}
                    >
                      {getInitials(tenant.First_Name, tenant.Last_Name)}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {tenant.First_Name} {tenant.Last_Name}
                      </Typography>
                      <Chip
                        label={tenant.Employment_Status}
                        size="small"
                        sx={{
                          mt: 0.5,
                          backgroundColor: tenant.Employment_Status === 'Employed' ? '#dcfce7' : '#fef3c7',
                          color: tenant.Employment_Status === 'Employed' ? '#16a34a' : '#d97706',
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EmailIcon sx={{ fontSize: 18, color: '#64748b' }} />
                      <Typography variant="body2" color="text.secondary">
                        {tenant.Email}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PhoneIcon sx={{ fontSize: 18, color: '#64748b' }} />
                      <Typography variant="body2" color="text.secondary">
                        {tenant.Phone}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AttachMoneyIcon sx={{ fontSize: 18, color: '#64748b' }} />
                      <Typography variant="body2" color="text.secondary">
                        {formatInr(tenant.Monthly_Income)}/month
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      mt: 3,
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Credit Score
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: getCreditScoreColor(tenant.Credit_Score),
                        }}
                      >
                        {tenant.Credit_Score}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton 
                        size="small" 
                        sx={{ color: '#3b82f6' }}
                        onClick={() => handleEdit(tenant)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        sx={{ color: '#ef4444' }}
                        onClick={() => handleDelete(tenant.Tenant_ID)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {editMode ? 'Edit Tenant' : 'Add New Tenant'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="First_Name"
                  label="First Name"
                  fullWidth
                  value={formData.First_Name}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="Last_Name"
                  label="Last Name"
                  fullWidth
                  value={formData.Last_Name}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="Email"
                  label="Email"
                  type="email"
                  fullWidth
                  value={formData.Email}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="Phone"
                  label="Phone"
                  fullWidth
                  value={formData.Phone}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="Credit_Score"
                  label="Credit Score"
                  type="number"
                  fullWidth
                  value={formData.Credit_Score}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="Monthly_Income"
                  label="Monthly Income"
                  type="number"
                  fullWidth
                  value={formData.Monthly_Income}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="Employment_Status"
                  label="Employment Status"
                  fullWidth
                  value={formData.Employment_Status}
                  onChange={handleInputChange}
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
              {editMode ? 'Update Tenant' : 'Add Tenant'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Tenants;
