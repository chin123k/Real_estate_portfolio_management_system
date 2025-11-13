import React, { useState, useEffect } from 'react';
import { formatInr } from '../utils/currency.ts';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Button,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import BuildIcon from '@mui/icons-material/Build';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionIcon from '@mui/icons-material/Description';
import BedIcon from '@mui/icons-material/Bed';
import BathtubIcon from '@mui/icons-material/Bathtub';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AddIcon from '@mui/icons-material/Add';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

interface Property {
  Property_ID: number;
  Property_Name: string;
  Street_Address: string;
  City: string;
  State: string;
  Property_Type: string;
  Current_Value: number;
  Status: string;
  Square_Footage: number;
  Bedrooms: number;
  Bathrooms: number;
  Image_URL: string;
  Listing_Type: string;
  Description: string;
  Owner_Name?: string;
}

interface MaintenanceRequest {
  Request_ID: number;
  Property_Name: string;
  Description: string;
  Priority: string;
  Status: string;
  Request_Date: string;
}

interface InspectionRequest {
  Inspection_ID: number;
  Property_Name: string;
  Inspection_Type: string;
  Inspection_Date: string;
  Status: string;
}

interface LeaseRequest {
  Request_ID: number;
  Property_Name: string;
  Monthly_Rent: number;
  Requested_Start_Date: string;
  Requested_End_Date: string;
  Status: string;
}

interface PurchaseRequest {
  Request_ID: number;
  Property_Name: string;
  Offer_Price: number;
  Status: string;
  Created_At: string;
}

const TenantDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [properties, setProperties] = useState<Property[]>([]);
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [inspectionRequests, setInspectionRequests] = useState<InspectionRequest[]>([]);
  const [leaseRequests, setLeaseRequests] = useState<LeaseRequest[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [openDialog, setOpenDialog] = useState('');
  const [filterType, setFilterType] = useState('All');
  
  // Get tenant ID from localStorage or session
  const tenantId = localStorage.getItem('tenantId') || '1'; // Default for testing

  const [maintenanceForm, setMaintenanceForm] = useState({
    Property_ID: 0,
    Description: '',
    Priority: 'Medium',
  });

  const [inspectionForm, setInspectionForm] = useState({
    Property_ID: 0,
    Inspection_Date: '',
    Inspection_Type: 'General',
    Notes: '',
  });

  const [leaseForm, setLeaseForm] = useState({
    Property_ID: 0,
    Requested_Start_Date: '',
    Requested_End_Date: '',
    Monthly_Rent: 0,
    Message: '',
  });

  const [purchaseForm, setPurchaseForm] = useState({
    Property_ID: 0,
    Offer_Price: 0,
    Financing_Type: 'Mortgage',
    Message: '',
  });

  useEffect(() => {
    fetchAvailableProperties();
    fetchMyProperties();
    fetchMaintenanceRequests();
    fetchInspectionRequests();
    fetchLeaseRequests();
    fetchPurchaseRequests();
  }, [tenantId]);

  const fetchAvailableProperties = async () => {
    try {
      // Always request tenant-scoped properties; if no owner is linked, backend will return []
      const response = await fetch(`http://localhost:5000/api/properties/available?tenant_id=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setProperties(Array.isArray(data) ? data : []);
      } else {
        setProperties([]);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      setProperties([]);
    }
  };

  const fetchMaintenanceRequests = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/maintenance/tenant/${tenantId}`);
      const data = await response.json();
      setMaintenanceRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      setMaintenanceRequests([]);
    }
  };

  const fetchMyProperties = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/properties/tenant/${tenantId}`);
      const data = await res.json();
      setMyProperties(Array.isArray(data) ? data : []);
    } catch (e) {
      setMyProperties([]);
    }
  };

  const fetchInspectionRequests = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/inspections/tenant/${tenantId}`);
      const data = await response.json();
      setInspectionRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching inspection requests:', error);
      setInspectionRequests([]);
    }
  };

  const fetchLeaseRequests = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/leases/requests/tenant/${tenantId}`);
      const data = await response.json();
      setLeaseRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching lease requests:', error);
      setLeaseRequests([]);
    }
  };

  const fetchPurchaseRequests = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/properties/purchases/tenant/${tenantId}`);
      const data = await response.json();
      setPurchaseRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching purchase requests:', error);
      setPurchaseRequests([]);
    }
  };

  const handleOpenDialog = (type: string, property?: Property) => {
    setOpenDialog(type);
    if (property) {
      setSelectedProperty(property);
      if (type === 'maintenance') {
        setMaintenanceForm({ ...maintenanceForm, Property_ID: property.Property_ID });
      } else if (type === 'inspection') {
        setInspectionForm({ ...inspectionForm, Property_ID: property.Property_ID });
      } else if (type === 'lease') {
        setLeaseForm({ ...leaseForm, Property_ID: property.Property_ID, Monthly_Rent: property.Current_Value || 0 });
      } else if (type === 'purchase') {
        setPurchaseForm({ ...purchaseForm, Property_ID: property.Property_ID, Offer_Price: property.Current_Value || 0 });
      }
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog('');
    setSelectedProperty(null);
  };

  const handleSubmitMaintenance = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...maintenanceForm, Tenant_ID: tenantId }),
      });
      if (response.ok) {
        fetchMaintenanceRequests();
        handleCloseDialog();
        setMaintenanceForm({ Property_ID: 0, Description: '', Priority: 'Medium' });
      }
    } catch (error) {
      console.error('Error submitting maintenance request:', error);
    }
  };

  const handleSubmitInspection = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...inspectionForm,
          Tenant_ID: tenantId,
          Request_Type: 'Tenant Requested',
          Status: 'Pending',
        }),
      });
      if (response.ok) {
        fetchInspectionRequests();
        handleCloseDialog();
        setInspectionForm({ Property_ID: 0, Inspection_Date: '', Inspection_Type: 'General', Notes: '' });
      }
    } catch (error) {
      console.error('Error submitting inspection request:', error);
    }
  };

  const handleSubmitLease = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/leases/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...leaseForm, Tenant_ID: tenantId }),
      });
      if (response.ok) {
        // Refresh requests and properties; property remains available until owner approves
        await fetchLeaseRequests();
        await fetchAvailableProperties();
        handleCloseDialog();
        setLeaseForm({ Property_ID: 0, Requested_Start_Date: '', Requested_End_Date: '', Monthly_Rent: 0, Message: '' });
      }
    } catch (error) {
      console.error('Error submitting lease request:', error);
    }
  };

  const handleSubmitPurchase = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/properties/purchase-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...purchaseForm, Tenant_ID: tenantId }),
      });
      if (response.ok) {
        fetchPurchaseRequests();
        fetchAvailableProperties();
        handleCloseDialog();
        setPurchaseForm({ Property_ID: 0, Offer_Price: 0, Financing_Type: 'Mortgage', Message: '' });
      }
    } catch (error) {
      console.error('Error submitting purchase request:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      Pending: '#f59e0b',
      'In Progress': '#3b82f6',
      Completed: '#10b981',
      Approved: '#10b981',
      Rejected: '#ef4444',
      Scheduled: '#8b5cf6',
    };
    return colors[status] || '#64748b';
  };

  const filteredProperties = Array.isArray(properties) 
    ? (filterType === 'All' 
        ? properties 
        : properties.filter(p => p.Listing_Type === filterType))
    : [];

  return (
    <Box sx={{ backgroundColor: '#f8fafc', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="xl">
        <Typography variant="h3" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
          Tenant Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Browse properties, manage maintenance, and track your requests
        </Typography>

        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<SearchIcon />} label="Browse Properties" />
          <Tab icon={<BuildIcon />} label="My Maintenance" />
          <Tab icon={<DescriptionIcon />} label="My Inspections" />
          <Tab icon={<HomeIcon />} label="My Requests" />
        </Tabs>

        {/* Browse Properties Tab */}
        {currentTab === 0 && (
          <Box>
            <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
              {['All', 'Sale', 'Rent'].map((type) => (
                <Chip
                  key={type}
                  label={type}
                  onClick={() => setFilterType(type)}
                  sx={{
                    backgroundColor: filterType === type ? '#1e3a8a' : 'white',
                    color: filterType === type ? 'white' : '#64748b',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: filterType === type ? '#1e40af' : '#f1f5f9',
                    },
                  }}
                />
              ))}
            </Box>

            <Grid container spacing={3}>
              {filteredProperties.length === 0 && (
                <Grid item xs={12}>
                  <Alert severity="info">No properties found. Try switching filters or check back later.</Alert>
                </Grid>
              )}
              {filteredProperties.map((property) => (
                <Grid item xs={12} sm={6} md={4} key={property.Property_ID}>
                  <Card sx={{ borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ position: 'relative' }}>
                      <CardMedia
                        component="img"
                        height="200"
                        image={property.Image_URL || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'}
                        alt={property.Property_Name}
                      />
                      <Chip
                        label={property.Listing_Type}
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          backgroundColor: property.Listing_Type === 'Sale' ? '#10b981' : '#3b82f6',
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                    <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {property.Property_Name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <LocationOnIcon sx={{ fontSize: 16, color: '#64748b' }} />
                        <Typography variant="body2" color="text.secondary">
                          {property.City}, {property.State}
                        </Typography>
                      </Box>
                      {property.Property_Type !== 'Land' && (
                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <BedIcon sx={{ fontSize: 16, color: '#64748b' }} />
                            <Typography variant="body2">{property.Bedrooms || 0}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <BathtubIcon sx={{ fontSize: 16, color: '#64748b' }} />
                            <Typography variant="body2">{property.Bathrooms || 0}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <SquareFootIcon sx={{ fontSize: 16, color: '#64748b' }} />
                            <Typography variant="body2">{property.Square_Footage || 0} sqft</Typography>
                          </Box>
                        </Box>
                      )}
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#2196f3', mb: 2 }}>
                        {formatInr(property.Current_Value || 0)}
                        {property.Listing_Type === 'Rent' && <span style={{ fontSize: '14px' }}>/month</span>}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                        {property.Listing_Type === 'Sale' && (
                          <Button
                            variant="contained"
                            size="small"
                            fullWidth
                            onClick={() => handleOpenDialog('purchase', property)}
                            sx={{ backgroundColor: '#10b981', '&:hover': { backgroundColor: '#059669' } }}
                          >
                            Make Offer
                          </Button>
                        )}
                        {property.Listing_Type === 'Rent' && (
                          <Button
                            variant="contained"
                            size="small"
                            fullWidth
                            onClick={() => handleOpenDialog('lease', property)}
                            sx={{ backgroundColor: '#3b82f6', '&:hover': { backgroundColor: '#2563eb' } }}
                          >
                            Request Lease
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Maintenance Tab */}
        {currentTab === 1 && (
          <Box>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                My Maintenance Requests
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog('maintenance')}
                sx={{ backgroundColor: '#1e3a8a' }}
              >
                New Request
              </Button>
            </Box>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell><strong>Property</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell><strong>Priority</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Date</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {maintenanceRequests.map((request) => (
                    <TableRow key={request.Request_ID}>
                      <TableCell>{request.Property_Name}</TableCell>
                      <TableCell>{request.Description}</TableCell>
                      <TableCell>
                        <Chip
                          label={request.Priority}
                          size="small"
                          sx={{
                            backgroundColor: request.Priority === 'High' ? '#fee2e2' : '#fef3c7',
                            color: request.Priority === 'High' ? '#dc2626' : '#d97706',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={request.Status}
                          size="small"
                          sx={{ backgroundColor: `${getStatusColor(request.Status)}20`, color: getStatusColor(request.Status) }}
                        />
                      </TableCell>
                      <TableCell>{new Date(request.Request_Date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Inspections Tab */}
        {currentTab === 2 && (
          <Box>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                My Inspection Requests
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog('inspection')}
                sx={{ backgroundColor: '#1e3a8a' }}
              >
                Request Inspection
              </Button>
            </Box>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell><strong>Property</strong></TableCell>
                    <TableCell><strong>Type</strong></TableCell>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inspectionRequests.map((request) => (
                    <TableRow key={request.Inspection_ID}>
                      <TableCell>{request.Property_Name}</TableCell>
                      <TableCell>{request.Inspection_Type}</TableCell>
                      <TableCell>{new Date(request.Inspection_Date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={request.Status}
                          size="small"
                          sx={{ backgroundColor: `${getStatusColor(request.Status)}20`, color: getStatusColor(request.Status) }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* My Requests Tab */}
        {currentTab === 3 && (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
              Lease Requests
            </Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 4 }}>
              <Table>
                <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell><strong>Property</strong></TableCell>
                    <TableCell><strong>Monthly Rent</strong></TableCell>
                    <TableCell><strong>Start Date</strong></TableCell>
                    <TableCell><strong>End Date</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaseRequests.map((request) => (
                    <TableRow key={request.Request_ID}>
                      <TableCell>{request.Property_Name}</TableCell>
                      <TableCell>{formatInr(request.Monthly_Rent || 0)}</TableCell>
                      <TableCell>{new Date(request.Requested_Start_Date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(request.Requested_End_Date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={request.Status}
                          size="small"
                          sx={{ backgroundColor: `${getStatusColor(request.Status)}20`, color: getStatusColor(request.Status) }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
              Purchase Offers
            </Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell><strong>Property</strong></TableCell>
                    <TableCell><strong>Offer Price</strong></TableCell>
                    <TableCell><strong>Date Submitted</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {purchaseRequests.map((request) => (
                    <TableRow key={request.Request_ID}>
                      <TableCell>{request.Property_Name}</TableCell>
                      <TableCell>{formatInr(request.Offer_Price || 0)}</TableCell>
                      <TableCell>{new Date(request.Created_At).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={request.Status}
                          size="small"
                          sx={{ backgroundColor: `${getStatusColor(request.Status)}20`, color: getStatusColor(request.Status) }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Container>

      {/* Maintenance Request Dialog */}
      <Dialog open={openDialog === 'maintenance'} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Submit Maintenance Request</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Property</InputLabel>
            <Select
              label="Property"
              value={maintenanceForm.Property_ID || ''}
              onChange={(e) => setMaintenanceForm({ ...maintenanceForm, Property_ID: Number(e.target.value) })}
            >
              {myProperties.map((p) => (
                <MenuItem key={p.Property_ID} value={p.Property_ID}>
                  {p.Property_Name || `Property #${p.Property_ID}`} (#{p.Property_ID})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={maintenanceForm.Description}
            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, Description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={maintenanceForm.Priority}
              onChange={(e) => setMaintenanceForm({ ...maintenanceForm, Priority: e.target.value })}
              label="Priority"
            >
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitMaintenance} disabled={!maintenanceForm.Property_ID}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Inspection Request Dialog */}
      <Dialog open={openDialog === 'inspection'} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Request Property Inspection</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Property</InputLabel>
            <Select
              label="Property"
              value={inspectionForm.Property_ID || ''}
              onChange={(e) => setInspectionForm({ ...inspectionForm, Property_ID: Number(e.target.value) })}
            >
              {myProperties.map((p) => (
                <MenuItem key={p.Property_ID} value={p.Property_ID}>
                  {p.Property_Name || `Property #${p.Property_ID}`} (#{p.Property_ID})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Inspection Date"
            fullWidth
            type="date"
            value={inspectionForm.Inspection_Date}
            onChange={(e) => setInspectionForm({ ...inspectionForm, Inspection_Date: e.target.value })}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Inspection Type</InputLabel>
            <Select
              value={inspectionForm.Inspection_Type}
              onChange={(e) => setInspectionForm({ ...inspectionForm, Inspection_Type: e.target.value })}
              label="Inspection Type"
            >
              <MenuItem value="General">General</MenuItem>
              <MenuItem value="Plumbing">Plumbing</MenuItem>
              <MenuItem value="Electrical">Electrical</MenuItem>
              <MenuItem value="Structural">Structural</MenuItem>
              <MenuItem value="HVAC">HVAC</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Notes"
            fullWidth
            multiline
            rows={3}
            value={inspectionForm.Notes}
            onChange={(e) => setInspectionForm({ ...inspectionForm, Notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitInspection} disabled={!inspectionForm.Property_ID}>
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lease Request Dialog */}
      <Dialog open={openDialog === 'lease'} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Request to Lease {selectedProperty?.Property_Name}</DialogTitle>
        <DialogContent>
          {selectedProperty && (
            <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
              Monthly Rent: {formatInr(selectedProperty.Current_Value || 0)}
            </Alert>
          )}
          <TextField
            label="Start Date"
            fullWidth
            type="date"
            value={leaseForm.Requested_Start_Date}
            onChange={(e) => setLeaseForm({ ...leaseForm, Requested_Start_Date: e.target.value })}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date"
            fullWidth
            type="date"
            value={leaseForm.Requested_End_Date}
            onChange={(e) => setLeaseForm({ ...leaseForm, Requested_End_Date: e.target.value })}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Message to Owner (Optional)"
            fullWidth
            multiline
            rows={3}
            value={leaseForm.Message}
            onChange={(e) => setLeaseForm({ ...leaseForm, Message: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitLease}>Submit Request</Button>
        </DialogActions>
      </Dialog>

      {/* Purchase Request Dialog */}
      <Dialog open={openDialog === 'purchase'} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Make an Offer for {selectedProperty?.Property_Name}</DialogTitle>
        <DialogContent>
          {selectedProperty && (
            <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
              Asking Price: {formatInr(selectedProperty.Current_Value || 0)}
            </Alert>
          )}
          <TextField
            label="Your Offer"
            fullWidth
            type="number"
            value={purchaseForm.Offer_Price}
            onChange={(e) => setPurchaseForm({ ...purchaseForm, Offer_Price: parseFloat(e.target.value) })}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: <AttachMoneyIcon sx={{ mr: 1, color: '#64748b' }} />,
            }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Financing Type</InputLabel>
            <Select
              value={purchaseForm.Financing_Type}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, Financing_Type: e.target.value })}
              label="Financing Type"
            >
              <MenuItem value="Cash">Cash</MenuItem>
              <MenuItem value="Mortgage">Mortgage</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Message to Owner (Optional)"
            fullWidth
            multiline
            rows={3}
            value={purchaseForm.Message}
            onChange={(e) => setPurchaseForm({ ...purchaseForm, Message: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitPurchase} sx={{ backgroundColor: '#10b981' }}>
            Submit Offer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TenantDashboard;
