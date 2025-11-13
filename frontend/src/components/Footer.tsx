import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link,
  IconButton,
  Divider,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import YouTubeIcon from '@mui/icons-material/YouTube';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#1e293b',
        color: 'white',
        pt: 6,
        pb: 3,
        mt: 8,
      }}
    >
      <Container maxWidth="xl">
        <Grid container spacing={4}>
          {/* Company Info */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
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
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Resido
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mb: 3, color: '#94a3b8' }}>
              Your trusted partner in real estate portfolio management. We help property owners,
              managers, and tenants streamline their rental operations with cutting-edge technology.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                href="https://facebook.com"
                target="_blank"
                sx={{
                  color: 'white',
                  backgroundColor: '#3b5998',
                  '&:hover': { backgroundColor: '#2d4373' },
                }}
                size="small"
              >
                <FacebookIcon />
              </IconButton>
              <IconButton
                href="https://twitter.com"
                target="_blank"
                sx={{
                  color: 'white',
                  backgroundColor: '#1da1f2',
                  '&:hover': { backgroundColor: '#0c85d0' },
                }}
                size="small"
              >
                <TwitterIcon />
              </IconButton>
              <IconButton
                href="https://instagram.com"
                target="_blank"
                sx={{
                  color: 'white',
                  background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
                  '&:hover': { opacity: 0.8 },
                }}
                size="small"
              >
                <InstagramIcon />
              </IconButton>
              <IconButton
                href="https://linkedin.com"
                target="_blank"
                sx={{
                  color: 'white',
                  backgroundColor: '#0077b5',
                  '&:hover': { backgroundColor: '#005582' },
                }}
                size="small"
              >
                <LinkedInIcon />
              </IconButton>
              <IconButton
                href="https://youtube.com"
                target="_blank"
                sx={{
                  color: 'white',
                  backgroundColor: '#ff0000',
                  '&:hover': { backgroundColor: '#cc0000' },
                }}
                size="small"
              >
                <YouTubeIcon />
              </IconButton>
            </Box>
          </Grid>

          {/* Quick Links */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Quick Links
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="/" sx={{ color: '#94a3b8', textDecoration: 'none', '&:hover': { color: 'white' } }}>
                Dashboard
              </Link>
              <Link href="/properties" sx={{ color: '#94a3b8', textDecoration: 'none', '&:hover': { color: 'white' } }}>
                Properties
              </Link>
              <Link href="/tenants" sx={{ color: '#94a3b8', textDecoration: 'none', '&:hover': { color: 'white' } }}>
                Tenants
              </Link>
              <Link href="/owners" sx={{ color: '#94a3b8', textDecoration: 'none', '&:hover': { color: 'white' } }}>
                Owners
              </Link>
              <Link href="/leases" sx={{ color: '#94a3b8', textDecoration: 'none', '&:hover': { color: 'white' } }}>
                Leases
              </Link>
            </Box>
          </Grid>

          {/* Services */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Services
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="/maintenance" sx={{ color: '#94a3b8', textDecoration: 'none', '&:hover': { color: 'white' } }}>
                Maintenance
              </Link>
              <Link href="/inspections" sx={{ color: '#94a3b8', textDecoration: 'none', '&:hover': { color: 'white' } }}>
                Inspections
              </Link>
              <Link href="/documents" sx={{ color: '#94a3b8', textDecoration: 'none', '&:hover': { color: 'white' } }}>
                Documents
              </Link>
              <Link href="/insurance" sx={{ color: '#94a3b8', textDecoration: 'none', '&:hover': { color: 'white' } }}>
                Insurance
              </Link>
              <Link href="/transactions" sx={{ color: '#94a3b8', textDecoration: 'none', '&:hover': { color: 'white' } }}>
                Transactions
              </Link>
            </Box>
          </Grid>

          {/* Contact Info */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Contact Us
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon sx={{ color: '#3b82f6', fontSize: 20 }} />
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  92 888 666 0000
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon sx={{ color: '#3b82f6', fontSize: 20 }} />
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  needhelp@example.com
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <LocationOnIcon sx={{ color: '#3b82f6', fontSize: 20 }} />
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  123 Real Estate Blvd, Suite 100<br />
                  Austin, TX 78701
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, borderColor: '#334155' }} />

        {/* Bottom Bar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            © {new Date().getFullYear()} Resido. All rights reserved.
          </Typography>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Link href="/privacy" sx={{ color: '#94a3b8', textDecoration: 'none', '&:hover': { color: 'white' } }}>
              Privacy Policy
            </Link>
            <Link href="/terms" sx={{ color: '#94a3b8', textDecoration: 'none', '&:hover': { color: 'white' } }}>
              Terms of Service
            </Link>
            <Link href="/sitemap" sx={{ color: '#94a3b8', textDecoration: 'none', '&:hover': { color: 'white' } }}>
              Sitemap
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
