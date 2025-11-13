import React, { useState, useEffect } from 'react';
import { formatInr } from '../utils/currency.ts';
import {
  Container,
  Grid,
  Typography,
  Box,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  Paper,
} from '@mui/material';
import BedIcon from '@mui/icons-material/Bed';
import BathtubIcon from '@mui/icons-material/Bathtub';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface Property {
  Property_ID: number;
  Property_Name: string;
  Street_Address: string;
  City: string;
  State: string;
  Property_Type: string;
  Current_Value: number;
  Square_Footage: number;
  Bedrooms: number;
  Bathrooms: number;
  Image_URL: string;
  Listing_Type: string;
}

const Dashboard = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/properties');
      const data = await response.json();
      setProperties(data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const toggleFavorite = (id: number) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return newFavorites;
    });
  };

  return (
    <Box>
      {/* Hero Section with Carousel */}
      <Box
        sx={{
          position: 'relative',
          height: '70vh',
          backgroundImage: 'url(https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Paper
            sx={{
              p: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 4,
              maxWidth: 600,
            }}
          >
            <Chip
              label="Buy"
              sx={{
                backgroundColor: '#1e3a8a',
                color: 'white',
                fontWeight: 700,
                mb: 2,
              }}
            />
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                color: '#1e293b',
                mb: 2,
              }}
            >
              American Electric Lofts Apartments
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <LocationOnIcon sx={{ color: '#64748b' }} />
              <Typography variant="body1" color="text.secondary">
                3599 Huntz Lane
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 4, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Beds:
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  4
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Bath:
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  2
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  sqft:
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  1200
                </Typography>
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e3a8a', mb: 3 }}>
              $3,400
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                size="large"
                sx={{
                  backgroundColor: '#2196f3',
                  px: 4,
                  '&:hover': { backgroundColor: '#1976d2' },
                }}
              >
                View Details
              </Button>
              <IconButton
                sx={{
                  border: '2px solid #e2e8f0',
                  '&:hover': { borderColor: '#2196f3' },
                }}
              >
                <CompareArrowsIcon />
              </IconButton>
              <IconButton
                sx={{
                  border: '2px solid #e2e8f0',
                  '&:hover': { borderColor: '#ef4444', color: '#ef4444' },
                }}
              >
                <FavoriteBorderIcon />
              </IconButton>
            </Box>
          </Paper>
        </Container>

        {/* Carousel Navigation */}
        <IconButton
          sx={{
            position: 'absolute',
            left: 20,
            backgroundColor: 'white',
            '&:hover': { backgroundColor: '#f1f5f9' },
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        <IconButton
          sx={{
            position: 'absolute',
            right: 20,
            backgroundColor: 'white',
            '&:hover': { backgroundColor: '#f1f5f9' },
          }}
        >
          <ArrowForwardIcon />
        </IconButton>
      </Box>

      {/* Explore Good Places Section */}
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              color: '#1e293b',
              mb: 2,
            }}
          >
            Explore Good Places
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
            At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium
            voluptatum deleniti atque corrupti quos dolores
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {properties.map((property) => (
            <Grid item xs={12} sm={6} md={4} key={property.Property_ID}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ position: 'relative' }}>
                  <CardMedia
                    component="img"
                    height="260"
                    image={property.Image_URL || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'}
                    alt={property.Property_Name}
                    sx={{ objectFit: 'cover' }}
                  />
                  <Chip
                    label={property.Listing_Type}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 16,
                      left: 16,
                      backgroundColor: 'white',
                      fontWeight: 600,
                      color: '#1e293b',
                    }}
                  />
                </Box>
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      mb: 1,
                      color: '#1e293b',
                    }}
                  >
                    {property.Property_Name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <BedIcon sx={{ fontSize: 18, color: '#64748b' }} />
                      <Typography variant="body2" color="text.secondary">
                        {property.Bedrooms} Beds
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <BathtubIcon sx={{ fontSize: 18, color: '#64748b' }} />
                      <Typography variant="body2" color="text.secondary">
                        {property.Bathrooms} Baths
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <SquareFootIcon sx={{ fontSize: 18, color: '#64748b' }} />
                      <Typography variant="body2" color="text.secondary">
                        {property.Square_Footage} sqft
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <LocationOnIcon sx={{ fontSize: 18, color: '#64748b' }} />
                    <Typography variant="body2" color="text.secondary">
                      {property.Street_Address}, {property.City}, {property.State}
                    </Typography>
                  </Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color: '#2196f3',
                    }}
                  >
                    {formatInr(property.Current_Value || 0)}
                  </Typography>
                </CardContent>
                <CardActions sx={{ p: 3, pt: 0 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{
                      backgroundColor: '#2196f3',
                      '&:hover': { backgroundColor: '#1976d2' },
                    }}
                  >
                    View
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;
