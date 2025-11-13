import React from 'react';
import { Container, Grid, Paper, Typography, Button, Box } from '@mui/material';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import HomeIcon from '@mui/icons-material/Home';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const Home: React.FC = () => {

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #1e3a8a 100%)',
        display: 'flex',
        alignItems: 'center',
        py: 8,
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              color: 'white',
              mb: 2,
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            Real Estate Management System
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: 'rgba(255,255,255,0.9)',
              mb: 4,
            }}
          >
            Choose your portal to get started
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* Owner Portal Card */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={24}
              sx={{
                p: 6,
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                textAlign: 'center',
                transition: 'transform 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-10px)',
                },
              }}
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                  borderRadius: '50%',
                  width: 120,
                  height: 120,
                  mb: 3,
                }}
              >
                <HomeWorkIcon sx={{ fontSize: 60, color: 'white' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
                Owner Portal
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Manage your properties, track tenants, handle maintenance requests, and monitor
                payments all in one place.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => window.open('/owner/signin', '_blank')}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                    },
                  }}
                >
                  Sign In
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => window.open('/owner/register', '_blank')}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    borderColor: '#1e3a8a',
                    color: '#1e3a8a',
                    '&:hover': {
                      borderColor: '#1e40af',
                      backgroundColor: 'rgba(30, 58, 138, 0.05)',
                    },
                  }}
                >
                  Register
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Tenant Portal Card */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={24}
              sx={{
                p: 6,
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                textAlign: 'center',
                transition: 'transform 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-10px)',
                },
              }}
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '50%',
                  width: 120,
                  height: 120,
                  mb: 3,
                }}
              >
                <HomeIcon sx={{ fontSize: 60, color: 'white' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
                Tenant Portal
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                View your rental properties, submit maintenance requests, make payments, and
                communicate with your landlord.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => window.open('/tenant/signin', '_blank')}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #6a3f91 100%)',
                    },
                  }}
                >
                  Sign In
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => window.open('/tenant/register', '_blank')}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    borderColor: '#764ba2',
                    color: '#764ba2',
                    '&:hover': {
                      borderColor: '#6a3f91',
                      backgroundColor: 'rgba(118, 75, 162, 0.05)',
                    },
                  }}
                >
                  Register
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            © 2025 Real Estate Management System. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Home;
