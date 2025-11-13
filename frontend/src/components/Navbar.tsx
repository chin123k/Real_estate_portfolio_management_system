import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  IconButton,
  Menu,
  MenuItem,
  useScrollTrigger,
} from '@mui/material';
import { Link } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

const Navbar = () => {
  // Menus replaced with direct dashboard sections to align with database modules

  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 50,
  });

  const handleMenuOpen = () => {};
  const handleMenuClose = () => {};

  return (
    <>
      {/* Top Bar */}
      <Box
        sx={{
          backgroundColor: '#1e3a8a',
          color: 'white',
          py: 1,
          fontSize: '0.875rem',
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon sx={{ fontSize: 18 }} />
                <Typography variant="body2">92 888 666 0000</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon sx={{ fontSize: 18 }} />
                <Typography variant="body2">needhelp@example.com</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton size="small" sx={{ color: 'white', '&:hover': { color: '#3b82f6' } }}>
                <FacebookIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" sx={{ color: 'white', '&:hover': { color: '#3b82f6' } }}>
                <LinkedInIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" sx={{ color: 'white', '&:hover': { color: '#3b82f6' } }}>
                <InstagramIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" sx={{ color: 'white', '&:hover': { color: '#3b82f6' } }}>
                <TwitterIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main Navigation */}
      <AppBar
        position="sticky"
        sx={{
          backgroundColor: trigger ? 'white' : 'white',
          color: '#1e293b',
          transition: 'all 0.3s',
          boxShadow: trigger ? 3 : 1,
        }}
      >
        <Container maxWidth="xl">
          <Toolbar sx={{ py: 1 }}>
            {/* Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                  borderRadius: 2,
                  p: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <HomeIcon sx={{ color: 'white', fontSize: 28 }} />
              </Box>
              <Typography
                variant="h5"
                component={Link}
                to="/"
                sx={{
                  fontWeight: 700,
                  color: '#1e3a8a',
                  textDecoration: 'none',
                  letterSpacing: '-0.5px',
                }}
              >
                Resido
              </Typography>
            </Box>

            {/* Navigation Links */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                component={Link}
                to="/"
                sx={{ color: '#1e293b', fontWeight: 600, px: 2 }}
              >
                Dashboard
              </Button>
              <Button component={Link} to="/properties" sx={{ color: '#1e293b', fontWeight: 600, px: 2 }}>
                Properties
              </Button>
              <Button component={Link} to="/tenants" sx={{ color: '#1e293b', fontWeight: 600, px: 2 }}>
                Tenants
              </Button>
              <Button component={Link} to="/owners" sx={{ color: '#1e293b', fontWeight: 600, px: 2 }}>
                Owners
              </Button>
              <Button component={Link} to="/leases" sx={{ color: '#1e293b', fontWeight: 600, px: 2 }}>
                Leases
              </Button>
              <Button component={Link} to="/maintenance" sx={{ color: '#1e293b', fontWeight: 600, px: 2 }}>
                Maintenance
              </Button>
              <Button component={Link} to="/inspections" sx={{ color: '#1e293b', fontWeight: 600, px: 2 }}>
                Inspections
              </Button>
              <Button component={Link} to="/documents" sx={{ color: '#1e293b', fontWeight: 600, px: 2 }}>
                Documents
              </Button>
              <Button component={Link} to="/insurance" sx={{ color: '#1e293b', fontWeight: 600, px: 2 }}>
                Insurance
              </Button>
              <Button component={Link} to="/transactions" sx={{ color: '#1e293b', fontWeight: 600, px: 2 }}>
                Transactions
              </Button>

              <Button
                component={Link}
                to="/signin"
                startIcon={<PersonIcon />}
                sx={{
                  color: '#1e293b',
                  fontWeight: 600,
                  px: 2,
                  '&:hover': { color: '#3b82f6' },
                }}
              >
                Signin
              </Button>

              <Button
                variant="contained"
                sx={{
                  backgroundColor: '#1e3a8a',
                  color: 'white',
                  px: 3,
                  '&:hover': {
                    backgroundColor: '#1e40af',
                  },
                }}
              >
                Add Property
              </Button>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
    </>
  );
};

export default Navbar;