import React, { useEffect, useState } from 'react';
import { formatInr } from '../utils/currency.ts';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BedIcon from '@mui/icons-material/Bed';
import BathtubIcon from '@mui/icons-material/Bathtub';
import SquareFootIcon from '@mui/icons-material/SquareFoot';

interface TenantProperty {
  Property_ID: number;
  Property_Name: string;
  Street_Address: string;
  City: string;
  State: string;
  ZIP_Code: string;
  Property_Type: string;
  Current_Value: number;
  Status: string;
  Square_Footage: number;
  Bedrooms: number;
  Bathrooms: number;
  Image_URL: string;
  Listing_Type: string;
  Description: string;
  Owner_Name?: string | null;
  Relationship_Type?: string; // Owned | Leased | Rented
}

const TenantProperties: React.FC = () => {
  const [properties, setProperties] = useState<TenantProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = localStorage.getItem('tenantId');

  const fetchMyProperties = async () => {
    if (!tenantId) {
      setError('No tenant session found. Please sign in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
  const res = await fetch(`http://localhost:5000/api/properties/tenant/${tenantId}`);
      if (!res.ok) throw new Error('Failed to fetch tenant properties');
      const data = await res.json();
      setProperties(Array.isArray(data) ? data : []);
    } catch (e) {
      setError('Failed to load your properties. Ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyProperties();
    const interval = setInterval(fetchMyProperties, 30000);
    return () => clearInterval(interval);
  }, [tenantId]);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ backgroundColor: '#f8fafc', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="xl">
        <Typography variant="h3" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
          My Properties
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Properties you currently own or rent
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {properties.length === 0 && !error && (
          <Alert severity="info">You have no active properties yet.</Alert>
        )}

        <Grid container spacing={3}>
          {properties.map((property) => (
            <Grid item xs={12} sm={6} md={4} key={property.Property_ID}>
              <Card sx={{ borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ position: 'relative' }}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={property.Image_URL || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'}
                    alt={property.Property_Name}
                  />
                  {property.Relationship_Type && (
                    <Chip
                      label={property.Relationship_Type}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        backgroundColor: property.Relationship_Type === 'Owned' ? '#10b981' : '#3b82f6',
                        color: 'white',
                        fontWeight: 600,
                      }}
                    />
                  )}
                  <Chip
                    label={property.Status}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      backgroundColor: property.Status === 'Leased' ? '#3b82f6' : property.Status === 'Sold' ? '#a855f7' : '#10b981',
                      color: 'white',
                      fontWeight: 600,
                    }}
                  />
                </Box>
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {property.Property_Name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocationOnIcon sx={{ fontSize: 16, color: '#64748b' }} />
                    <Typography variant="body2" color="text.secondary">
                      {property.City}, {property.State}
                    </Typography>
                  </Box>
                  {property.Owner_Name && (
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                      Current Owner: {property.Owner_Name}
                    </Typography>
                  )}

                  {property.Property_Type !== 'Land' && (
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <BedIcon sx={{ fontSize: 16, color: '#64748b' }} />
                        <Typography variant="body2">{property.Bedrooms}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <BathtubIcon sx={{ fontSize: 16, color: '#64748b' }} />
                        <Typography variant="body2">{property.Bathrooms}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <SquareFootIcon sx={{ fontSize: 16, color: '#64748b' }} />
                        <Typography variant="body2">{property.Square_Footage} sqft</Typography>
                      </Box>
                    </Box>
                  )}

                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#2196f3', mt: 'auto' }}>
                    {formatInr(Number(property.Current_Value || 0))}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default TenantProperties;
