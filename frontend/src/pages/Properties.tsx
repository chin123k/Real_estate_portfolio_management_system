import React, { useState, useEffect } from 'react';
import { formatInr } from '../utils/currency.ts';
import {
  Container,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardMedia,
  CardContent,
  Box,
  Chip,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BedIcon from '@mui/icons-material/Bed';
import BathtubIcon from '@mui/icons-material/Bathtub';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';

interface Property {
  Property_ID: number;
  Property_Name: string;
  Street_Address: string;
  City: string;
  State: string;
  ZIP_Code: string;
  Property_Type: string;
  Purchase_Price: number;
  Current_Value: number;
  Status: string;
  Square_Footage: number;
  Bedrooms: number;
  Bathrooms: number;
  Image_URL: string;
  Listing_Type: string;
  Description: string;
  Is_PG: boolean;
  Total_Rooms?: number;
  Available_Rooms?: number;
  Min_Room_Rent?: number;
  Max_Room_Rent?: number;
}

const Properties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState('All');
  const [formData, setFormData] = useState({
    Property_Name: '',
    Street_Address: '',
    City: '',
    State: '',
    ZIP_Code: '',
    Property_Type: 'Apartment',
    Purchase_Price: '',
    Current_Value: '',
    Status: 'Available',
    Square_Footage: '',
    Bedrooms: '',
    Bathrooms: '',
    Image_URL: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
    Listing_Type: 'Sale',
    Description: '',
    Is_PG: false,
  });

  // Get owner ID from localStorage or derive from stored user object
  const [ownerId, setOwnerId] = useState<string>('');

  useEffect(() => {
    // Get owner ID on mount
    console.log('=== Properties Component Mounted ===');
    const fromStorage = localStorage.getItem('ownerId');
    console.log('ownerId from localStorage:', fromStorage);
    
    if (fromStorage) {
      console.log('Setting ownerId from localStorage:', fromStorage);
      setOwnerId(fromStorage);
      return;
    }
    
    try {
      const userRaw = localStorage.getItem('user');
      console.log('user from localStorage:', userRaw);
      if (userRaw) {
        const u = JSON.parse(userRaw);
        console.log('Parsed user object:', u);
        if (u && (u.Owner_ID || u.ownerId)) {
          const id = String(u.Owner_ID || u.ownerId);
          console.log('Setting ownerId from user object:', id);
          localStorage.setItem('ownerId', id);
          setOwnerId(id);
        } else {
          console.error('No Owner_ID found in user object');
        }
      } else {
        console.error('No user object in localStorage');
      }
    } catch (e) {
      console.error('Could not parse user from localStorage:', e);
    }
  }, []);

  useEffect(() => {
    if (!ownerId) {
      console.log('Waiting for owner ID to be set...');
      return; // Wait until we have a valid owner id
    }
    console.log('Fetching properties for owner:', ownerId);
    fetchProperties();
  }, [ownerId]);

  const fetchProperties = async () => {
    if (!ownerId) {
      console.log('Cannot fetch properties - no owner ID');
      return;
    }
    
    try {
      console.log(`Fetching properties for owner ${ownerId} from: http://localhost:5000/api/properties/owner/${ownerId}?seedIfEmpty=1`);
      // Filter properties by owner ID
      const response = await fetch(`http://localhost:5000/api/properties/owner/${ownerId}?seedIfEmpty=1`);
      if (!response.ok) {
        console.error('Failed to fetch properties:', response.status, response.statusText);
        setProperties([]);
        return;
      }
      let data: unknown = [];
      try {
        data = await response.json();
      } catch (e) {
        console.error('Failed to parse properties response as JSON', e);
        setProperties([]);
        return;
      }
      // Ensure we always store an array to avoid runtime errors in .map
      const arr = Array.isArray(data) ? (data as Property[]) : [];
      setProperties(arr);
      console.log('Loaded properties for owner', ownerId, 'count:', arr.length);
    } catch (error) {
      console.error('Error fetching properties:', error);
      setProperties([]);
    }
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditMode(false);
    setSelectedPropertyId(null);
    setFormData({
      Property_Name: '',
      Street_Address: '',
      City: '',
      State: '',
      ZIP_Code: '',
      Property_Type: 'Apartment',
      Purchase_Price: '',
      Current_Value: '',
      Status: 'Available',
      Square_Footage: '',
      Bedrooms: '',
      Bathrooms: '',
      Image_URL: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      Listing_Type: 'Sale',
      Description: '',
      Is_PG: false,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.Street_Address || !formData.City || !formData.State || !formData.ZIP_Code) {
      alert('Please fill in all required fields: Street Address, City, State, and ZIP Code');
      return;
    }

    try {
      const url = editMode 
        ? `http://localhost:5000/api/properties/${selectedPropertyId}`
        : 'http://localhost:5000/api/properties';
      
      // Sanitize data: convert empty strings to null for numeric fields
      const sanitizedData = {
        ...formData,
        Purchase_Price: formData.Purchase_Price === '' ? null : Number(formData.Purchase_Price),
        Current_Value: formData.Current_Value === '' ? null : Number(formData.Current_Value),
        Square_Footage: formData.Square_Footage === '' ? null : Number(formData.Square_Footage),
        Bedrooms: formData.Bedrooms === '' ? 0 : Number(formData.Bedrooms),
        Bathrooms: formData.Bathrooms === '' ? 0 : Number(formData.Bathrooms),
      };
      
      // Include Owner_ID when creating a new property
      const dataToSubmit = editMode 
        ? sanitizedData 
        : { ...sanitizedData, Owner_ID: ownerId };
      
      const response = await fetch(url, {
        method: editMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit)
      });
      
      if (response.ok) {
        fetchProperties();
        handleClose();
      } else {
        const error = await response.json();
        alert(error.message || `Failed to ${editMode ? 'update' : 'add'} property`);
      }
    } catch (error) {
      console.error(`Error ${editMode ? 'updating' : 'adding'} property:`, error);
      alert(`Failed to ${editMode ? 'update' : 'add'} property`);
    }
  };

  const handleEdit = (property: Property) => {
    setEditMode(true);
    setSelectedPropertyId(property.Property_ID);
    setFormData({
      Property_Name: property.Property_Name || '',
      Street_Address: property.Street_Address || '',
      City: property.City || '',
      State: property.State || '',
      ZIP_Code: property.ZIP_Code || '',
      Property_Type: property.Property_Type || 'Apartment',
      Purchase_Price: property.Purchase_Price?.toString() || '',
      Current_Value: property.Current_Value?.toString() || '',
      Status: property.Status || 'Available',
      Square_Footage: property.Square_Footage?.toString() || '',
      Bedrooms: property.Bedrooms?.toString() || '',
      Bathrooms: property.Bathrooms?.toString() || '',
      Image_URL: property.Image_URL || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      Listing_Type: property.Listing_Type || 'Sale',
      Description: property.Description || '',
      Is_PG: property.Is_PG || false,
    });
    setOpen(true);
  };

  const handleDelete = async (propertyId: number) => {
    if (!window.confirm('Are you sure you want to delete this property?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/properties/${propertyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchProperties();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete property');
      }
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Failed to delete property');
    }
  };

  const filteredProperties = filterType === 'All' 
    ? properties 
    : filterType === 'PG'
    // Coerce Is_PG (could be boolean or 0/1 from DB)
    ? properties.filter(p => Boolean(p.Is_PG))
    : properties.filter(p => p.Property_Type === filterType);

  return (
    <Box sx={{ backgroundColor: '#f8fafc', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
              Property Listings
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Browse our exclusive collection of premium properties
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleClickOpen}
            sx={{
              backgroundColor: '#1e3a8a',
              px: 3,
              '&:hover': { backgroundColor: '#1e40af' },
            }}
          >
            Add Property
          </Button>
        </Box>

        {/* Filter Chips */}
        <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {['All', 'Apartment', 'Single Family', 'Penthouse', 'Villa', 'PG', 'Land'].map((type) => (
            <Chip
              key={type}
              label={type}
              onClick={() => setFilterType(type)}
              sx={{
                backgroundColor: filterType === type ? '#1e3a8a' : 'white',
                color: filterType === type ? 'white' : '#64748b',
                fontWeight: 600,
                px: 2,
                '&:hover': {
                  backgroundColor: filterType === type ? '#1e40af' : '#f1f5f9',
                },
              }}
            />
          ))}
        </Box>

        {/* Property Grid */}
        <Grid container spacing={4}>
          {filteredProperties.map((property) => (
            <Grid item xs={12} sm={6} md={4} key={property.Property_ID}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 3,
                  overflow: 'hidden',
                  position: 'relative',
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
                  {property.Is_PG && (
                    <Chip
                      label="PG"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 56,
                        left: 16,
                        backgroundColor: '#10b981',
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
                      top: 16,
                      right: 16,
                      backgroundColor: property.Status === 'Available' ? '#10b981' : '#f59e0b',
                      color: 'white',
                      fontWeight: 600,
                    }}
                  />
                  <IconButton
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                      right: 16,
                      backgroundColor: 'white',
                      '&:hover': { backgroundColor: '#fef2f2', color: '#ef4444' },
                    }}
                  >
                    <FavoriteBorderIcon />
                  </IconButton>
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
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <LocationOnIcon sx={{ fontSize: 18, color: '#64748b' }} />
                    <Typography variant="body2" color="text.secondary">
                      {property.City}, {property.State}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                    {property.Property_Type !== 'Land' && !property.Is_PG && (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <BedIcon sx={{ fontSize: 18, color: '#64748b' }} />
                          <Typography variant="body2" color="text.secondary">
                            {property.Bedrooms || 0} Beds
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <BathtubIcon sx={{ fontSize: 18, color: '#64748b' }} />
                          <Typography variant="body2" color="text.secondary">
                            {property.Bathrooms || 0} Baths
                          </Typography>
                        </Box>
                      </>
                    )}
                    {property.Is_PG && (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <BedIcon sx={{ fontSize: 18, color: '#10b981' }} />
                          <Typography variant="body2" color="text.secondary">
                            {property.Total_Rooms || 0} Rooms
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <BathtubIcon sx={{ fontSize: 18, color: '#10b981' }} />
                          <Typography variant="body2" color="text.secondary">
                            {property.Available_Rooms || 0} Available
                          </Typography>
                        </Box>
                      </>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <SquareFootIcon sx={{ fontSize: 18, color: '#64748b' }} />
                      <Typography variant="body2" color="text.secondary">
                        {property.Square_Footage || 0} sqft
                      </Typography>
                    </Box>
                  </Box>

                  {property.Is_PG && property.Min_Room_Rent && (
                    <Box sx={{ mb: 2, p: 1.5, backgroundColor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Room Rent Range
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#16a34a' }}>
                        {formatInr(property.Min_Room_Rent)} - {formatInr(property.Max_Room_Rent || 0)}/month
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        color: '#2196f3',
                      }}
                    >
                      {property.Is_PG ? 'PG Property' : formatInr(property.Current_Value || 0)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton 
                        size="small" 
                        sx={{ color: '#3b82f6' }}
                        onClick={() => handleEdit(property)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        sx={{ color: '#ef4444' }}
                        onClick={() => handleDelete(property.Property_ID)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>


      {/* Add/Edit Property Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
          {editMode ? 'Edit Property' : 'Add New Property'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                name="Property_Name"
                label="Property Name"
                fullWidth
                value={formData.Property_Name}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="Description"
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={formData.Description}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="Street_Address"
                label="Street Address"
                fullWidth
                required
                value={formData.Street_Address}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="City"
                label="City"
                fullWidth
                required
                value={formData.City}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="State"
                label="State"
                fullWidth
                required
                value={formData.State}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="ZIP_Code"
                label="ZIP Code"
                fullWidth
                required
                value={formData.ZIP_Code}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Property Type</InputLabel>
                <Select
                  name="Property_Type"
                  value={formData.Property_Type}
                  onChange={handleInputChange as any}
                  label="Property Type"
                >
                  <MenuItem value="Apartment">Apartment</MenuItem>
                  <MenuItem value="Single Family">Single Family</MenuItem>
                  <MenuItem value="Penthouse">Penthouse</MenuItem>
                  <MenuItem value="Villa">Villa</MenuItem>
                  <MenuItem value="Condo">Condo</MenuItem>
                  <MenuItem value="PG">PG (Paying Guest)</MenuItem>
                  <MenuItem value="Land">Land / Empty Site</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="Status"
                  value={formData.Status}
                  onChange={handleInputChange as any}
                  label="Status"
                >
                  <MenuItem value="Available">Available</MenuItem>
                  <MenuItem value="Leased">Leased</MenuItem>
                  <MenuItem value="Sold">Sold</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="Bedrooms"
                label="Bedrooms"
                type="number"
                fullWidth
                value={formData.Bedrooms}
                onChange={handleInputChange}
                disabled={formData.Property_Type === 'Land'}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="Bathrooms"
                label="Bathrooms"
                type="number"
                fullWidth
                value={formData.Bathrooms}
                onChange={handleInputChange}
                disabled={formData.Property_Type === 'Land'}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="Square_Footage"
                label="Square Footage"
                type="number"
                fullWidth
                value={formData.Square_Footage}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="Purchase_Price"
                label="Purchase Price"
                type="number"
                fullWidth
                value={formData.Purchase_Price}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="Current_Value"
                label="Current Value"
                type="number"
                fullWidth
                value={formData.Current_Value}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="Image_URL"
                label="Image URL"
                fullWidth
                value={formData.Image_URL}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Listing Type</InputLabel>
                <Select
                  name="Listing_Type"
                  value={formData.Listing_Type}
                  onChange={handleInputChange as any}
                  label="Listing Type"
                >
                  <MenuItem value="Sale">Sale</MenuItem>
                  <MenuItem value="Rent">Rent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.Is_PG}
                    onChange={(e) => setFormData({ ...formData, Is_PG: e.target.checked })}
                    name="Is_PG"
                    color="primary"
                  />
                }
                label="Is this a PG (Paying Guest) property?"
                sx={{ mt: 2 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose} size="large">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            size="large"
            sx={{
              backgroundColor: '#1e3a8a',
              px: 4,
              '&:hover': { backgroundColor: '#1e40af' },
            }}
          >
            {editMode ? 'Update Property' : 'Add Property'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Properties;