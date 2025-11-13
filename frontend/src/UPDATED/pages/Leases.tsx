import React, { useEffect, useState } from 'react';
import { formatUsdToInr } from '../../utils';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
  IconButton,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface Lease {
  LeaseID: number;
  PropertyID: number;
  TenantID: number;
  StartDate: string;
  EndDate: string;
  MonthlyRent: number;
  SecurityDeposit: number;
  Status: string;
}

const Leases: React.FC = () => {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeases = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/leases');
      if (!response.ok) throw new Error('Failed to fetch leases');
      const data = await response.json();
      setLeases(data);
    } catch (err) {
      setError('Failed to fetch leases. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeases();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLeases, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'success';
      case 'expired': return 'error';
      case 'pending': return 'warning';
      case 'terminated': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h3" gutterBottom fontWeight="bold" color="primary">
            Leases
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage all lease agreements
          </Typography>
        </Box>
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchLeases} color="primary" sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="large"
            sx={{ borderRadius: 2 }}
          >
            Add Lease
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card elevation={3}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Lease ID</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Property ID</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tenant ID</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Start Date</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>End Date</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Monthly Rent</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Deposit</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No leases found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  leases.map((lease) => (
                    <TableRow 
                      key={lease.LeaseID}
                      sx={{ 
                        '&:hover': { bgcolor: 'action.hover' },
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <TableCell>{lease.LeaseID}</TableCell>
                      <TableCell>{lease.PropertyID}</TableCell>
                      <TableCell>{lease.TenantID}</TableCell>
                      <TableCell>{new Date(lease.StartDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(lease.EndDate).toLocaleDateString()}</TableCell>
                      <TableCell>{formatUsdToInr(lease.MonthlyRent)}</TableCell>
                      <TableCell>{formatUsdToInr(lease.SecurityDeposit)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={lease.Status} 
                          color={getStatusColor(lease.Status)}
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Edit">
                          <IconButton size="small" color="primary">
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Leases;
