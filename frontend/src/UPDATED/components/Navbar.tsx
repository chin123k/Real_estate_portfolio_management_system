import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ApartmentIcon from '@mui/icons-material/Apartment';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import BuildIcon from '@mui/icons-material/Build';

const Navbar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
    { label: 'Properties', path: '/properties', icon: <ApartmentIcon /> },
    { label: 'Tenants', path: '/tenants', icon: <PeopleIcon /> },
    { label: 'Leases', path: '/leases', icon: <DescriptionIcon /> },
    { label: 'Maintenance', path: '/maintenance', icon: <BuildIcon /> },
  ];

  return (
    <AppBar position="sticky" elevation={4}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <HomeIcon sx={{ mr: 1, fontSize: 32 }} />
          <Typography 
            variant="h5" 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 700,
              letterSpacing: '0.5px'
            }}
          >
            Property Manager
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {navItems.map((item) => (
              <Button
                key={item.path}
                color="inherit"
                component={Link}
                to={item.path}
                startIcon={item.icon}
                sx={{
                  fontWeight: 600,
                  px: 2,
                  borderRadius: 2,
                  backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.15)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.25)',
                  },
                  transition: 'all 0.2s'
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
