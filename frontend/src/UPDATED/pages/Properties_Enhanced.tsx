import React, { useState, useEffect } from 'react';
import { formatUsdToInr } from '../../utils';
import {
  Container,
  Paper,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BedIcon from '@mui/icons-material/Bed';
import BathtubIcon from '@mui/icons-material/Bathtub';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import PersonIcon from '@mui/icons-material/Person';
import PeopleIcon from '@mui/icons-material/People';

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
}

interface Room {
  Room_ID: number;
  Property_ID: number;
  Room_Number: string;
  Room_Type: string;
  Occupancy_Capacity: number;
  Current_Occupancy: number;
  Rent_Per_Month: number;
  Status: string;
  Amenities: string;
}

const Properties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [open, setOpen] = useState(false);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
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

  const [roomFormData, setRoomFormData] = useState({
    Room_Number: '',
    Room_Type: 'Single',
    Occupancy_Capacity: 1,
    Rent_Per_Month: '',
    Amenities: '',
  });

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

  const fetchRooms = async (propertyId: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/rooms/property/${propertyId}`);
      const data = await response.json();
      setRooms(data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
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
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        fetchProperties();
        handleClose();
      }
    } catch (error) {
      console.error('Error adding property:', error);
    }
  };

  const handleManageRooms = (propertyId: number) => {
    setSelectedProperty(propertyId);
    fetchRooms(propertyId);
    setRoomDialogOpen(true);
  };

  const handleRoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomFormData({
      ...roomFormData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddRoom = async () => {
    if (!selectedProperty) return;

    try {
      const response = await fetch('http://localhost:5000/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Property_ID: selectedProperty,
          ...roomFormData
        })
      });
      if (response.ok) {
        fetchRooms(selectedProperty);
        setRoomFormData({
          Room_Number: '',
          Room_Type: 'Single',
          Occupancy_Capacity: 1,
          Rent_Per_Month: '',
          Amenities: '',
        });
      }
    } catch (error) {
      console.error('Error adding room:', error);
    }
  };

  const getRoomTypeIcon = (type: string) => {
    switch (type) {
      case 'Single':
        return <PersonIcon fontSize="small" />;
      case 'Double':
        return <PeopleIcon fontSize="small" />;
      case 'Shared':
        return <PeopleIcon fontSize="small" />;
      default:
        return <MeetingRoomIcon fontSize="small" />;
    }
  };

  const filteredProperties = filterType === 'All' 
    ? properties 
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
              Browse our exclusive collection of premium properties & PG accommodations
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
          {['All', 'Apartment', 'Single Family', 'Penthouse', 'Villa', 'PG'].map((type) => (
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
                        top: 16,
                        left: 100,
                        backgroundColor: '#7c3aed',
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

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        color: '#2196f3',
                      }}
                    >
                      {formatUsdToInr(property.Current_Value)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton size="small" sx={{ color: '#3b82f6' }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" sx={{ color: '#ef4444' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {property.Is_PG && (
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<MeetingRoomIcon />}
                      onClick={() => handleManageRooms(property.Property_ID)}
                      sx={{ borderColor: '#7c3aed', color: '#7c3aed' }}
                    >
                      Manage Rooms
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Add Property Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: '1.5rem', fontWeight: 700 }}>Add New Property</DialogTitle>
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
                value={formData.Street_Address}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="City"
                label="City"
                fullWidth
                value={formData.City}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="State"
                label="State"
                fullWidth
                value={formData.State}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="ZIP_Code"
                label="ZIP Code"
                fullWidth
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
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.Is_PG}
                    onChange={handleInputChange}
                    name="Is_PG"
                  />
                }
                label="This is a PG (Paying Guest) property with multiple rooms"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="Bedrooms"
                label="Bedrooms"
                type="number"
                fullWidth
                value={formData.Bedrooms}
                onChange={handleInputChange}
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
                label="Current Value / Monthly Rent"
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
            Add Property
          </Button>
        </DialogActions>
      </Dialog>

      {/* Room Management Dialog */}
      <Dialog open={roomDialogOpen} onClose={() => setRoomDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontSize: '1.5rem', fontWeight: 700 }}>Manage Rooms</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Add New Room</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <TextField
                  name="Room_Number"
                  label="Room Number"
                  fullWidth
                  value={roomFormData.Room_Number}
                  onChange={handleRoomInputChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Room Type</InputLabel>
                  <Select
                    name="Room_Type"
                    value={roomFormData.Room_Type}
                    onChange={handleRoomInputChange as any}
                    label="Room Type"
                  >
                    <MenuItem value="Single">Single</MenuItem>
                    <MenuItem value="Double">Double</MenuItem>
                    <MenuItem value="Shared">Shared</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  name="Occupancy_Capacity"
                  label="Capacity"
                  type="number"
                  fullWidth
                  size="small"
                  value={roomFormData.Occupancy_Capacity}
                  onChange={handleRoomInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  name="Rent_Per_Month"
                  label="Rent/Month"
                  type="number"
                  fullWidth
                  size="small"
                  value={roomFormData.Rent_Per_Month}
                  onChange={handleRoomInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  name="Amenities"
                  label="Amenities"
                  fullWidth
                  size="small"
                  value={roomFormData.Amenities}
                  onChange={handleRoomInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={1}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleAddRoom}
                  size="small"
                  sx={{ height: '100%', backgroundColor: '#10b981' }}
                >
                  Add
                </Button>
              </Grid>
            </Grid>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Room #</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Capacity</TableCell>
                  <TableCell>Occupancy</TableCell>
                  <TableCell>Rent/Month</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Amenities</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.Room_ID}>
                    <TableCell>{room.Room_Number}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getRoomTypeIcon(room.Room_Type)}
                        {room.Room_Type}
                      </Box>
                    </TableCell>
                    <TableCell>{room.Occupancy_Capacity}</TableCell>
                    <TableCell>
                      {room.Current_Occupancy}/{room.Occupancy_Capacity}
                    </TableCell>
                    <TableCell>{formatUsdToInr(room.Rent_Per_Month)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={room.Status} 
                        size="small"
                        color={room.Status === 'Available' ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>{room.Amenities || 'N/A'}</TableCell>
                    <TableCell>
                      <IconButton size="small" sx={{ color: '#3b82f6' }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" sx={{ color: '#ef4444' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {rooms.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                        No rooms added yet. Add rooms using the form above.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setRoomDialogOpen(false)} size="large">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Properties;
