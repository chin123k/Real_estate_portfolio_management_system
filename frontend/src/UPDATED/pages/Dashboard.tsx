import React, { useEffect, useState } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import BuildIcon from '@mui/icons-material/Build';

interface DashboardStats {
  properties: number;
  tenants: number;
  leases: number;
  maintenance: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    properties: 0,
    tenants: 0,
    leases: 0,
    maintenance: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [propertiesRes, tenantsRes, leasesRes, maintenanceRes] = await Promise.all([
          fetch('http://localhost:5000/api/properties'),
          fetch('http://localhost:5000/api/tenants'),
          fetch('http://localhost:5000/api/leases'),
          fetch('http://localhost:5000/api/maintenance')
        ]);

        const properties = await propertiesRes.json();
        const tenants = await tenantsRes.json();
        const leases = await leasesRes.json();
        const maintenance = await maintenanceRes.json();

        setStats({
          properties: properties.length || 0,
          tenants: tenants.length || 0,
          leases: leases.length || 0,
          maintenance: maintenance.length || 0
        });
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch dashboard data. Make sure the backend server is running.');
        setLoading(false);
      }
    };

    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { title: 'Total Properties', value: stats.properties, icon: HomeIcon, color: '#2196f3' },
    { title: 'Total Tenants', value: stats.tenants, icon: PeopleIcon, color: '#4caf50' },
    { title: 'Active Leases', value: stats.leases, icon: DescriptionIcon, color: '#ff9800' },
    { title: 'Maintenance Requests', value: stats.maintenance, icon: BuildIcon, color: '#f44336' },
  ];

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
    <Container maxWidth="lg">
      <Box mb={4}>
        <Typography variant="h3" gutterBottom fontWeight="bold" color="primary">
          Property Management Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Welcome to your property management system
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card 
                sx={{ 
                  height: '100%',
                  background: `linear-gradient(135deg, ${stat.color}15 0%, ${stat.color}05 100%)`,
                  border: `2px solid ${stat.color}30`,
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Box 
                      sx={{ 
                        bgcolor: stat.color, 
                        borderRadius: '12px', 
                        p: 1.5, 
                        display: 'flex',
                        mr: 2
                      }}
                    >
                      <Icon sx={{ color: 'white', fontSize: 32 }} />
                    </Box>
                  </Box>
                  <Typography variant="h3" fontWeight="bold" color={stat.color}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" fontWeight="500">
                    {stat.title}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Box mt={4}>
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom fontWeight="600">
              Quick Actions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Use the navigation menu above to manage properties, tenants, leases, and maintenance requests.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Dashboard;
