import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import HomeIcon from '@mui/icons-material/Home';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';

const PortalNavbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const userType = localStorage.getItem('userType');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const isOwner = userType === 'owner';
  const isTenant = userType === 'tenant';

  const handleLogout = () => {
    localStorage.removeItem('userType');
    localStorage.removeItem('user');
    localStorage.removeItem('tenantId');
    localStorage.removeItem('ownerId');
    localStorage.removeItem('loginExpiresAt');
    navigate('/');
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Owner nav: remove Maintenance and Inspections (these are available on the dashboard)
  // Also align paths with owner-prefixed routes used in App routing
  const ownerMenuItems = [
    { label: 'Dashboard', path: '/owner/dashboard' },
    { label: 'Properties', path: '/owner/properties' },
    { label: 'Tenants', path: '/owner/tenants' },
    { label: 'Payments', path: '/owner/payments' },
    { label: 'Insurance', path: '/owner/insurance' },
  ];

  // Tenant nav: point to tenant-prefixed routes for consistency (Maintenance removed per request)
  const tenantMenuItems = [
    { label: 'Dashboard', path: '/tenant/dashboard' },
    { label: 'My Properties', path: '/tenant/properties' },
    { label: 'Payments', path: '/tenant/payments' },
    { label: 'Documents', path: '/tenant/documents' },
    { label: 'Insurance', path: '/tenant/insurance' },
  ];

  const menuItems = isOwner ? ownerMenuItems : isTenant ? tenantMenuItems : [];

  const getGradient = () => {
    if (isOwner) return 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)';
    if (isTenant) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    return 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)';
  };

  if (!userType) return null;

  return (
    <AppBar position="sticky" sx={{ background: getGradient() }}>
      <Toolbar>
        {/* Logo and Portal Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
          {isOwner ? (
            <HomeWorkIcon sx={{ fontSize: 32, mr: 1 }} />
          ) : (
            <HomeIcon sx={{ fontSize: 32, mr: 1 }} />
          )}
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {isOwner ? 'Owner Portal' : 'Tenant Portal'}
          </Typography>
        </Box>

        {/* Navigation Menu */}
        <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 1 }}>
          {menuItems.map((item) => (
            <Button
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                color: 'white',
                fontWeight: location.pathname === item.path ? 700 : 400,
                borderBottom: location.pathname === item.path ? '2px solid white' : 'none',
                borderRadius: 0,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {/* User Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2">
            {user.First_Name} {user.Last_Name}
          </Typography>
          <IconButton
            color="inherit"
            onClick={handleMenuOpen}
          >
            <AccountCircleIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                {user.Email}
              </Typography>
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default PortalNavbar;
