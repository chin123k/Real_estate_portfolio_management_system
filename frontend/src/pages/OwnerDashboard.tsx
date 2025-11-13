import React, { useState, useEffect } from 'react';
import { formatInr } from '../utils/currency.ts';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import SearchIcon from '@mui/icons-material/Search';
import HomeIcon from '@mui/icons-material/Home';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PendingIcon from '@mui/icons-material/Pending';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';

interface MaintenanceRequest {
  Request_ID: number;
  Property_Name: string;
  Tenant_Name: string;
  Tenant_Email: string;
  Tenant_Phone: string;
  Description: string;
  Priority: string;
  Status: string;
  Request_Date: string;
}

interface InspectionRequest {
  Inspection_ID: number;
  Property_Name: string;
  Tenant_Name: string;
  Tenant_Email: string;
  Inspection_Type: string;
  Inspection_Date: string;
  Status: string;
  Request_Type: string;
}

interface LeaseRequest {
  Request_ID: number;
  Property_Name: string;
  Property_ID: number;
  Tenant_Name: string;
  Tenant_Email: string;
  Tenant_Phone: string;
  Monthly_Rent: number;
  Requested_Start_Date: string;
  Requested_End_Date: string;
  Status: string;
  Message: string;
}

interface PurchaseRequest {
  Request_ID: number;
  Property_Name: string;
  Property_ID: number;
  Tenant_Name: string;
  Tenant_Email: string;
  Tenant_Phone: string;
  Offer_Price: number;
  Current_Value: number;
  Financing_Type: string;
  Status: string;
  Message: string;
  Created_At: string;
}

interface OwnerPaymentRow {
  Payment_ID: number;
  Lease_ID: number;
  Tenant_ID: number;
  Amount: number;
  Payment_Date: string | null;
  Payment_Method: string | null;
  Status: string; // Pending | Paid | Overdue | Failed
  Due_Date: string | null;
  Late_Fee: number | null;
  Notes?: string | null;
  Tenant_Name: string;
  Tenant_Email: string;
  Property_Name: string;
  Monthly_Rent: number;
}

interface TenantDocument {
  Document_ID: number;
  Property_ID: number;
  Property_Name: string;
  Document_Type: string;
  Document_Name: string;
  File_Path: string;
  Upload_Date: string;
  Tenant_Name?: string;
  Tenant_Email?: string;
}

const OwnerDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [inspectionRequests, setInspectionRequests] = useState<InspectionRequest[]>([]);
  const [leaseRequests, setLeaseRequests] = useState<LeaseRequest[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [openDialog, setOpenDialog] = useState('');
  const [response, setResponse] = useState('');
  const [ownerPayments, setOwnerPayments] = useState<OwnerPaymentRow[]>([]);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<OwnerPaymentRow | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('Paid');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentLateFee, setPaymentLateFee] = useState<number>(0);
  const [paymentMsg, setPaymentMsg] = useState<string>('');
  const [stats, setStats] = useState<{ total_payments?: number; total_received?: number; total_pending?: number; total_overdue?: number; total_late_fees?: number }>({});
  const [tenantDocuments, setTenantDocuments] = useState<TenantDocument[]>([]);
  
  // Get owner ID from stored user first; fallback to legacy key; avoid hard-coded default
  let derivedOwnerId = '';
  try {
    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      const userObj = JSON.parse(userRaw);
      if (userObj && userObj.Owner_ID) {
        derivedOwnerId = String(userObj.Owner_ID);
      }
    }
  } catch {}
  const ownerId = derivedOwnerId || localStorage.getItem('ownerId') || '';

  useEffect(() => {
    console.log('OwnerDashboard - Owner ID:', ownerId);
    if (!ownerId) return; // guard until we have a valid ownerId
    fetchMaintenanceRequests();
    fetchInspectionRequests();
    fetchLeaseRequests();
    fetchPurchaseRequests();
    fetchOwnerPayments();
    fetchOwnerPaymentStats();
    fetchTenantDocuments();
  }, [ownerId]);

  const fetchMaintenanceRequests = async () => {
    try {
      console.log('Fetching maintenance for owner:', ownerId);
      const response = await fetch(`http://localhost:5000/api/maintenance/owner/${ownerId}`);
      let data = await response.json();
      console.log('Maintenance data received:', data);
      let list = Array.isArray(data) ? data : [];
      setMaintenanceRequests(list);
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      setMaintenanceRequests([]);
    }
  };

  const fetchInspectionRequests = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/inspections/owner/${ownerId}`);
      let data = await response.json();
      let list = Array.isArray(data) ? data : [];
      setInspectionRequests(list.filter((i: InspectionRequest) => i.Request_Type === 'Tenant Requested'));
    } catch (error) {
      console.error('Error fetching inspection requests:', error);
      setInspectionRequests([]);
    }
  };

  const fetchLeaseRequests = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/leases/requests/owner/${ownerId}`);
      let data = await response.json();
      let list = Array.isArray(data) ? data : [];
      setLeaseRequests(list);
    } catch (error) {
      console.error('Error fetching lease requests:', error);
      setLeaseRequests([]);
    }
  };

  const fetchPurchaseRequests = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/properties/purchases/owner/${ownerId}`);
      let data = await response.json();
      let list = Array.isArray(data) ? data : [];
      setPurchaseRequests(list);
    } catch (error) {
      console.error('Error fetching purchase requests:', error);
      setPurchaseRequests([]);
    }
  };

  const handleUpdateMaintenance = async (requestId: number, status: string) => {
    try {
      const request = maintenanceRequests.find(r => r.Request_ID === requestId);
      if (!request) return;

      await fetch(`http://localhost:5000/api/maintenance/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...request,
          Status: status,
        }),
      });
      fetchMaintenanceRequests();
    } catch (error) {
      console.error('Error updating maintenance:', error);
    }
  };

  const handleUpdateInspection = async (inspectionId: number, status: string) => {
    try {
      const inspection = inspectionRequests.find(i => i.Inspection_ID === inspectionId);
      if (!inspection) return;

      // Use status-only endpoint for robustness
      await fetch(`http://localhost:5000/api/inspections/${inspectionId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Status: status }),
      });
      fetchInspectionRequests();
    } catch (error) {
      console.error('Error updating inspection:', error);
    }
  };

  const handleOpenDialog = (type: string, request: any) => {
    setOpenDialog(type);
    setSelectedRequest(request);
    setResponse('');
  };

  const handleCloseDialog = () => {
    setOpenDialog('');
    setSelectedRequest(null);
    setResponse('');
  };

  const fetchOwnerPayments = async () => {
    try {
      if (!ownerId) return;
      const res = await fetch(`http://localhost:5000/api/payments/owner/${ownerId}`);
      const data = await res.json();
      setOwnerPayments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error fetching owner payments:', e);
      setOwnerPayments([]);
    }
  };

  const fetchOwnerPaymentStats = async () => {
    try {
      if (!ownerId) return;
      const res = await fetch(`http://localhost:5000/api/payments/owner/${ownerId}/stats`);
      const data = await res.json();
      setStats(data || {});
    } catch (e) {
      console.error('Error fetching payment stats:', e);
      setStats({});
    }
  };

  const fetchTenantDocuments = async () => {
    try {
      console.log('Fetching tenant documents for owner:', ownerId);
      const res = await fetch(`http://localhost:5000/api/documents/owner/${ownerId}`);
      const data = await res.json();
      console.log('Tenant documents received:', data);
      setTenantDocuments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error fetching tenant documents:', e);
      setTenantDocuments([]);
    }
  };

  const handleOpenPaymentDialog = (payment: OwnerPaymentRow) => {
    setSelectedPayment(payment);
    setPaymentStatus(payment.Status || 'Pending');
    setPaymentLateFee(Number(payment.Late_Fee || 0));
    setPaymentNotes(payment.Notes || '');
    setOpenPaymentDialog(true);
  };

  const handleUpdatePayment = async () => {
    if (!selectedPayment) return;
    try {
      const res = await fetch(`http://localhost:5000/api/payments/${selectedPayment.Payment_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Status: paymentStatus,
          Notes: paymentNotes,
          Late_Fee: paymentLateFee,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPaymentMsg('Payment updated');
        // Optimistically update local list for snappy UI
        if (data?.payment) {
          setOwnerPayments(prev => prev.map(p => p.Payment_ID === data.payment.Payment_ID ? { ...p, ...data.payment } : p));
        } else {
          // Fallback: update selected item only
          setOwnerPayments(prev => prev.map(p => p.Payment_ID === selectedPayment.Payment_ID ? { ...p, Status: paymentStatus, Late_Fee: paymentLateFee, Notes: paymentNotes } : p));
        }
        setOpenPaymentDialog(false);
        setSelectedPayment(null);
        fetchOwnerPaymentStats();
        setTimeout(() => setPaymentMsg(''), 2500);
      } else {
        try {
          const err = await res.json();
          alert(err?.message || 'Failed to update payment');
        } catch {
          const txt = await res.text();
          alert(txt || 'Failed to update payment');
        }
      }
    } catch (e) {
      console.error('Error updating payment:', e);
    }
  };

  const handleApproveRejectLease = async (approve: boolean) => {
    try {
      await fetch(`http://localhost:5000/api/leases/request/${selectedRequest.Request_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Status: approve ? 'Approved' : 'Rejected',
          Owner_Response: response,
        }),
      });
      fetchLeaseRequests();
      handleCloseDialog();
    } catch (error) {
      console.error('Error updating lease request:', error);
    }
  };

  const handleApproveRejectPurchase = async (approve: boolean) => {
    try {
      await fetch(`http://localhost:5000/api/properties/purchase-request/${selectedRequest.Request_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Status: approve ? 'Approved' : 'Rejected',
          Owner_Response: response,
        }),
      });
      fetchPurchaseRequests();
      handleCloseDialog();
    } catch (error) {
      console.error('Error updating purchase request:', error);
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

  const pendingMaintenanceCount = maintenanceRequests.filter(r => r.Status === 'Pending').length;
  const pendingInspectionCount = inspectionRequests.filter(r => r.Status === 'Pending').length;
  const pendingLeaseCount = leaseRequests.filter(r => r.Status === 'Pending').length;
  const pendingPurchaseCount = purchaseRequests.filter(r => r.Status === 'Pending').length;

  return (
    <Box sx={{ backgroundColor: '#f8fafc', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="xl">
        {paymentMsg && (
          <Alert severity="success" sx={{ mb: 2 }}>{paymentMsg}</Alert>
        )}
        <Typography variant="h3" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
          Owner Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Manage your properties and respond to tenant requests
        </Typography>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, backgroundColor: '#fef3c7' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#d97706' }}>
                      {pendingMaintenanceCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending Maintenance
                    </Typography>
                  </Box>
                  <BuildIcon sx={{ fontSize: 48, color: '#d97706', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, backgroundColor: '#dbeafe' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#2563eb' }}>
                      {pendingInspectionCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending Inspections
                    </Typography>
                  </Box>
                  <SearchIcon sx={{ fontSize: 48, color: '#2563eb', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, backgroundColor: '#e0e7ff' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#6366f1' }}>
                      {pendingLeaseCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Lease Requests
                    </Typography>
                  </Box>
                  <HomeIcon sx={{ fontSize: 48, color: '#6366f1', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, backgroundColor: '#dcfce7' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#16a34a' }}>
                      {pendingPurchaseCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Purchase Offers
                    </Typography>
                  </Box>
                  <AttachMoneyIcon sx={{ fontSize: 48, color: '#16a34a', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<BuildIcon />} label={`Maintenance (${pendingMaintenanceCount})`} />
          <Tab icon={<SearchIcon />} label={`Inspections (${pendingInspectionCount})`} />
          <Tab icon={<HomeIcon />} label={`Lease Requests (${pendingLeaseCount})`} />
          <Tab icon={<AttachMoneyIcon />} label={`Purchase Offers (${pendingPurchaseCount})`} />
          <Tab icon={<PendingIcon />} label={`Payments` } />
          <Tab icon={<DescriptionIcon />} label={`Tenant Documents`} />
        </Tabs>

        {/* Maintenance Tab */}
        {currentTab === 0 && (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell><strong>Property</strong></TableCell>
                  <TableCell><strong>Tenant</strong></TableCell>
                  <TableCell><strong>Issue</strong></TableCell>
                  <TableCell><strong>Priority</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {maintenanceRequests.map((request) => (
                  <TableRow key={request.Request_ID}>
                    <TableCell>{request.Property_Name}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{request.Tenant_Name}</Typography>
                      <Typography variant="caption" color="text.secondary">{request.Tenant_Email}</Typography>
                    </TableCell>
                    <TableCell>{request.Description}</TableCell>
                    <TableCell>
                      <Chip
                        label={request.Priority}
                        size="small"
                        sx={{
                          backgroundColor: request.Priority === 'High' ? '#fee2e2' : request.Priority === 'Medium' ? '#fef3c7' : '#e0f2fe',
                          color: request.Priority === 'High' ? '#dc2626' : request.Priority === 'Medium' ? '#d97706' : '#0284c7',
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
                    <TableCell>
                      {request.Status === 'Pending' && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleUpdateMaintenance(request.Request_ID, 'In Progress')}
                          sx={{ backgroundColor: '#3b82f6', mr: 1 }}
                        >
                          Accept
                        </Button>
                      )}
                      {request.Status === 'In Progress' && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleUpdateMaintenance(request.Request_ID, 'Completed')}
                          sx={{ backgroundColor: '#10b981' }}
                        >
                          Complete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Inspections Tab */}
        {currentTab === 1 && (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell><strong>Property</strong></TableCell>
                  <TableCell><strong>Tenant</strong></TableCell>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inspectionRequests.map((request) => (
                  <TableRow key={request.Inspection_ID}>
                    <TableCell>{request.Property_Name}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{request.Tenant_Name}</Typography>
                      <Typography variant="caption" color="text.secondary">{request.Tenant_Email}</Typography>
                    </TableCell>
                    <TableCell>{request.Inspection_Type}</TableCell>
                    <TableCell>{new Date(request.Inspection_Date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={request.Status}
                        size="small"
                        sx={{ backgroundColor: `${getStatusColor(request.Status)}20`, color: getStatusColor(request.Status) }}
                      />
                    </TableCell>
                    <TableCell>
                      {request.Status === 'Pending' && (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleUpdateInspection(request.Inspection_ID, 'Scheduled')}
                            sx={{ backgroundColor: '#10b981', mr: 1 }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleUpdateInspection(request.Inspection_ID, 'Rejected')}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Lease Requests Tab */}
        {currentTab === 2 && (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell><strong>Property</strong></TableCell>
                  <TableCell><strong>Tenant</strong></TableCell>
                  <TableCell><strong>Monthly Rent</strong></TableCell>
                  <TableCell><strong>Duration</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaseRequests.map((request) => (
                  <TableRow key={request.Request_ID}>
                    <TableCell>{request.Property_Name}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{request.Tenant_Name}</Typography>
                      <Typography variant="caption" color="text.secondary">{request.Tenant_Email}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">{request.Tenant_Phone}</Typography>
                    </TableCell>
                    <TableCell>{formatInr(Number(request.Monthly_Rent ?? 0))}</TableCell>
                    <TableCell>
                      {new Date(request.Requested_Start_Date).toLocaleDateString()} - {new Date(request.Requested_End_Date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={request.Status}
                        size="small"
                        sx={{ backgroundColor: `${getStatusColor(request.Status)}20`, color: getStatusColor(request.Status) }}
                      />
                    </TableCell>
                    <TableCell>
                      {request.Status === 'Pending' && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleOpenDialog('lease', request)}
                          sx={{ backgroundColor: '#6366f1' }}
                        >
                          Review
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Purchase Offers Tab */}
        {currentTab === 3 && (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell><strong>Property</strong></TableCell>
                  <TableCell><strong>Buyer</strong></TableCell>
                  <TableCell><strong>Offer Price</strong></TableCell>
                  <TableCell><strong>Asking Price</strong></TableCell>
                  <TableCell><strong>Financing</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purchaseRequests.map((request) => (
                  <TableRow key={request.Request_ID}>
                    <TableCell>{request.Property_Name}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{request.Tenant_Name}</Typography>
                      <Typography variant="caption" color="text.secondary">{request.Tenant_Email}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">{request.Tenant_Phone}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: '#10b981' }}>
                        {formatInr(Number(request.Offer_Price ?? 0))}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatInr(Number(request.Current_Value ?? 0))}</TableCell>
                    <TableCell>{request.Financing_Type}</TableCell>
                    <TableCell>
                      <Chip
                        label={request.Status}
                        size="small"
                        sx={{ backgroundColor: `${getStatusColor(request.Status)}20`, color: getStatusColor(request.Status) }}
                      />
                    </TableCell>
                    <TableCell>
                      {request.Status === 'Pending' && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleOpenDialog('purchase', request)}
                          sx={{ backgroundColor: '#10b981' }}
                        >
                          Review
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Payments Tab */}
        {currentTab === 4 && (
          <>
            <Grid container spacing={3} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Total Received</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#10b981' }}>
                      {formatInr(Number(stats.total_received || 0))}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Total Pending</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                      {formatInr(Number(stats.total_pending || 0))}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Overdue</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#ef4444' }}>
                      {formatInr(Number(stats.total_overdue || 0))}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Late Fees</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {formatInr(Number(stats.total_late_fees || 0))}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell><strong>Property</strong></TableCell>
                    <TableCell><strong>Tenant</strong></TableCell>
                    <TableCell><strong>Amount</strong></TableCell>
                    <TableCell><strong>Due Date</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ownerPayments.map((p) => (
                    <TableRow key={p.Payment_ID}>
                      <TableCell>{p.Property_Name}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.Tenant_Name}</Typography>
                        <Typography variant="caption" color="text.secondary">{p.Tenant_Email}</Typography>
                      </TableCell>
                      <TableCell>{formatInr(Number(p.Amount || 0))}</TableCell>
                      <TableCell>{p.Due_Date ? new Date(p.Due_Date).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>
                        <Chip label={p.Status === 'Paid' ? 'Done' : p.Status} size="small" />
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="contained" onClick={() => handleOpenPaymentDialog(p)}>
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* Tenant Documents Tab */}
        {currentTab === 5 && (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
              Tenant Documents
            </Typography>
            {tenantDocuments.length === 0 ? (
              <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                <DescriptionIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No tenant documents yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Documents uploaded by tenants will appear here
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                <Table>
                  <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                    <TableRow>
                      <TableCell><strong>Document Name</strong></TableCell>
                      <TableCell><strong>Tenant</strong></TableCell>
                      <TableCell><strong>Property</strong></TableCell>
                      <TableCell><strong>Type</strong></TableCell>
                      <TableCell><strong>Upload Date</strong></TableCell>
                      <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tenantDocuments.map((doc) => (
                      <TableRow key={doc.Document_ID}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DescriptionIcon sx={{ color: '#64748b' }} />
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {doc.Document_Name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {doc.Tenant_Name || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {doc.Tenant_Email || ''}
                          </Typography>
                        </TableCell>
                        <TableCell>{doc.Property_Name}</TableCell>
                        <TableCell>
                          <Chip
                            label={doc.Document_Type}
                            size="small"
                            sx={{
                              backgroundColor: doc.Document_Type === 'Lease Agreement' ? '#3b82f620' : 
                                             doc.Document_Type === 'ID Proof' ? '#10b98120' : '#f59e0b20',
                              color: doc.Document_Type === 'Lease Agreement' ? '#3b82f6' : 
                                     doc.Document_Type === 'ID Proof' ? '#10b981' : '#f59e0b',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell>{new Date(doc.Upload_Date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            startIcon={<DownloadIcon />}
                            sx={{ color: '#3b82f6' }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Container>

      {/* Payment Review Dialog - standalone */}
      <Dialog open={openPaymentDialog} onClose={() => setOpenPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Review Payment</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">Tenant</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedPayment.Tenant_Name} — {selectedPayment.Property_Name}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    select
                    fullWidth
                    label="Status"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    SelectProps={{ native: true }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Failed">Failed</option>
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Late Fee"
                    value={paymentLateFee}
                    onChange={(e) => setPaymentLateFee(Number(e.target.value))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPaymentDialog(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<CheckCircleIcon />} onClick={handleUpdatePayment} sx={{ backgroundColor: '#10b981' }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lease Review Dialog */}
      <Dialog open={openDialog === 'lease'} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Review Lease Request</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>{selectedRequest.Tenant_Name}</strong> wants to lease <strong>{selectedRequest.Property_Name}</strong>
              </Alert>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Monthly Rent</Typography>
                  <Typography variant="h6">{formatInr(Number(selectedRequest.Monthly_Rent ?? 0))}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Duration</Typography>
                  <Typography variant="body1">
                    {new Date(selectedRequest.Requested_Start_Date).toLocaleDateString()} - {new Date(selectedRequest.Requested_End_Date).toLocaleDateString()}
                  </Typography>
                </Grid>
              </Grid>
              {selectedRequest.Message && (
                <Box sx={{ mb: 2, p: 2, backgroundColor: '#f1f5f9', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Message from Tenant:</Typography>
                  <Typography variant="body1">{selectedRequest.Message}</Typography>
                </Box>
              )}
              <TextField
                label="Your Response (Optional)"
                fullWidth
                multiline
                rows={3}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                sx={{ mb: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={() => handleApproveRejectLease(false)}
          >
            Reject
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={() => handleApproveRejectLease(true)}
            sx={{ backgroundColor: '#10b981' }}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* Purchase Review Dialog */}
      <Dialog open={openDialog === 'purchase'} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Review Purchase Offer</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                <strong>{selectedRequest.Tenant_Name}</strong> made an offer for <strong>{selectedRequest.Property_Name}</strong>
              </Alert>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">Offer Price</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#10b981' }}>
                    {formatInr(Number(selectedRequest.Offer_Price ?? 0))}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">Asking Price</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {formatInr(Number(selectedRequest.Current_Value ?? 0))}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">Financing</Typography>
                  <Typography variant="h6">{selectedRequest.Financing_Type}</Typography>
                </Grid>
              </Grid>
              {selectedRequest.Message && (
                <Box sx={{ mb: 2, p: 2, backgroundColor: '#f1f5f9', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Message from Buyer:</Typography>
                  <Typography variant="body1">{selectedRequest.Message}</Typography>
                </Box>
              )}
              <TextField
                label="Your Response (Optional)"
                fullWidth
                multiline
                rows={3}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                sx={{ mb: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={() => handleApproveRejectPurchase(false)}
          >
            Reject
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={() => handleApproveRejectPurchase(true)}
            sx={{ backgroundColor: '#10b981' }}
          >
            Accept Offer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OwnerDashboard;
