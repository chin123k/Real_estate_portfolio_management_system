import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Alert,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';

interface Document {
  Document_ID: number;
  Property_ID: number;
  Property_Name?: string;
  Document_Type: string;
  Document_Name: string;
  File_Path: string;
  Upload_Date: string;
}

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    Property_ID: '',
    Document_Type: 'Lease Agreement',
    Document_Name: '',
    File_Path: '',
  });

  const tenantId = localStorage.getItem('tenantId') || '1';

  useEffect(() => {
    fetchDocuments();
    fetchTenantProperties();
  }, [tenantId]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/documents/tenant/${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    }
  };

  const fetchTenantProperties = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/properties/tenant/${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setProperties(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      setProperties([]);
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setUploadMethod('file');
    setSelectedFile(null);
    setFormData({
      Property_ID: '',
      Document_Type: 'Lease Agreement',
      Document_Name: '',
      File_Path: '',
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill document name from file name if empty
      if (!formData.Document_Name) {
        setFormData({ ...formData, Document_Name: file.name });
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.Property_ID || !formData.Document_Name) {
      setMessage('Please fill in all required fields');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (uploadMethod === 'file' && !selectedFile) {
      setMessage('Please select a file to upload');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (uploadMethod === 'url' && !formData.File_Path) {
      setMessage('Please enter a file URL');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      // If uploading a file, convert to base64 or simulate upload
      if (uploadMethod === 'file' && selectedFile) {
        // Convert file to base64
        const reader = new FileReader();
        
        reader.onerror = () => {
          setMessage('Failed to read file');
          setTimeout(() => setMessage(''), 3000);
        };

        reader.onloadend = async () => {
          try {
            const base64String = reader.result as string;
            
            const uploadData = {
              Property_ID: formData.Property_ID,
              Document_Type: formData.Document_Type,
              Document_Name: formData.Document_Name,
              File_Path: `/documents/${selectedFile.name}`,
              File_Data: base64String,
              File_Name: selectedFile.name,
              File_Type: selectedFile.type,
              Tenant_ID: tenantId,
            };

            console.log('Uploading document:', uploadData);

            const response = await fetch('http://localhost:5000/api/documents', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(uploadData),
            });

            if (response.ok) {
              setMessage('Document uploaded successfully');
              fetchDocuments();
              handleCloseDialog();
              setTimeout(() => setMessage(''), 3000);
            } else {
              const error = await response.json();
              setMessage(error.message || 'Failed to upload document');
              setTimeout(() => setMessage(''), 3000);
            }
          } catch (error) {
            console.error('Error uploading document:', error);
            setMessage('Failed to upload document');
            setTimeout(() => setMessage(''), 3000);
          }
        };
        
        reader.readAsDataURL(selectedFile);
      } else {
        // URL upload
        const uploadData = {
          Property_ID: formData.Property_ID,
          Document_Type: formData.Document_Type,
          Document_Name: formData.Document_Name,
          File_Path: formData.File_Path,
          Tenant_ID: tenantId,
        };

        console.log('Uploading document via URL:', uploadData);

        const response = await fetch('http://localhost:5000/api/documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(uploadData),
        });

        if (response.ok) {
          setMessage('Document uploaded successfully');
          fetchDocuments();
          handleCloseDialog();
          setTimeout(() => setMessage(''), 3000);
        } else {
          const error = await response.json();
          setMessage(error.message || 'Failed to upload document');
          setTimeout(() => setMessage(''), 3000);
        }
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      setMessage('Failed to upload document');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDelete = async (documentId: number) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage('Document deleted successfully');
        fetchDocuments();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to delete document');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      setMessage('Failed to delete document');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const getDocumentTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'Lease Agreement': '#3b82f6',
      'ID Proof': '#10b981',
      'Income Proof': '#f59e0b',
      'Bank Statement': '#8b5cf6',
      'Utility Bill': '#ef4444',
      'Other': '#64748b',
    };
    return colors[type] || '#64748b';
  };

  return (
    <Box sx={{ backgroundColor: '#f8fafc', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="lg">
        {message && (
          <Alert severity={message.includes('success') ? 'success' : 'error'} sx={{ mb: 3 }}>
            {message}
          </Alert>
        )}

        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
              My Documents
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Upload and manage your property documents
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<UploadFileIcon />}
            onClick={handleOpenDialog}
            sx={{
              backgroundColor: '#1e3a8a',
              px: 3,
              '&:hover': { backgroundColor: '#1e40af' },
            }}
          >
            Upload Document
          </Button>
        </Box>

        {documents.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
            <DescriptionIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No documents yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Upload your first document to get started
            </Typography>
            <Button
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={handleOpenDialog}
              sx={{ backgroundColor: '#1e3a8a' }}
            >
              Upload Document
            </Button>
          </Paper>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell><strong>Document Name</strong></TableCell>
                  <TableCell><strong>Property</strong></TableCell>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell><strong>Upload Date</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.Document_ID}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DescriptionIcon sx={{ color: '#64748b' }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {doc.Document_Name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{doc.Property_Name || `Property #${doc.Property_ID}`}</TableCell>
                    <TableCell>
                      <Chip
                        label={doc.Document_Type}
                        size="small"
                        sx={{
                          backgroundColor: `${getDocumentTypeColor(doc.Document_Type)}20`,
                          color: getDocumentTypeColor(doc.Document_Type),
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>{new Date(doc.Upload_Date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          sx={{ color: '#3b82f6' }}
                          title="Download"
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          sx={{ color: '#ef4444' }}
                          onClick={() => handleDelete(doc.Document_ID)}
                          title="Delete"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Upload Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
            Upload Document
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Property *</InputLabel>
                <Select
                  value={formData.Property_ID}
                  onChange={(e) => setFormData({ ...formData, Property_ID: e.target.value })}
                  label="Property *"
                >
                  {properties.map((property) => (
                    <MenuItem key={property.Property_ID} value={property.Property_ID}>
                      {property.Property_Name || `Property #${property.Property_ID}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Document Type</InputLabel>
                <Select
                  value={formData.Document_Type}
                  onChange={(e) => setFormData({ ...formData, Document_Type: e.target.value })}
                  label="Document Type"
                >
                  <MenuItem value="Lease Agreement">Lease Agreement</MenuItem>
                  <MenuItem value="ID Proof">ID Proof</MenuItem>
                  <MenuItem value="Income Proof">Income Proof</MenuItem>
                  <MenuItem value="Bank Statement">Bank Statement</MenuItem>
                  <MenuItem value="Utility Bill">Utility Bill</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Document Name *"
                value={formData.Document_Name}
                onChange={(e) => setFormData({ ...formData, Document_Name: e.target.value })}
                sx={{ mb: 3 }}
                placeholder="e.g., Lease_Agreement_2025.pdf"
              />

              {/* Upload Method Selection */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Upload Method
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant={uploadMethod === 'file' ? 'contained' : 'outlined'}
                    onClick={() => setUploadMethod('file')}
                    sx={{ flex: 1 }}
                  >
                    Browse File
                  </Button>
                  <Button
                    variant={uploadMethod === 'url' ? 'contained' : 'outlined'}
                    onClick={() => setUploadMethod('url')}
                    sx={{ flex: 1 }}
                  >
                    Enter URL
                  </Button>
                </Box>
              </Box>

              {/* File Upload */}
              {uploadMethod === 'file' && (
                <Box
                  sx={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    mb: 2,
                  }}
                >
                  <input
                    accept="*/*"
                    style={{ display: 'none' }}
                    id="file-upload"
                    type="file"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="file-upload">
                    <Button
                      variant="contained"
                      component="span"
                      startIcon={<UploadFileIcon />}
                      sx={{ mb: 2 }}
                    >
                      Choose File
                    </Button>
                  </label>
                  {selectedFile && (
                    <Box sx={{ mt: 2 }}>
                      <Chip
                        icon={<DescriptionIcon />}
                        label={selectedFile.name}
                        onDelete={() => setSelectedFile(null)}
                        sx={{ maxWidth: '100%' }}
                      />
                      <Typography variant="caption" display="block" sx={{ mt: 1, color: '#64748b' }}>
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </Typography>
                    </Box>
                  )}
                  {!selectedFile && (
                    <Typography variant="body2" color="text.secondary">
                      Click to browse or drag and drop your file here
                    </Typography>
                  )}
                </Box>
              )}

              {/* URL Input */}
              {uploadMethod === 'url' && (
                <TextField
                  fullWidth
                  label="File URL *"
                  value={formData.File_Path}
                  onChange={(e) => setFormData({ ...formData, File_Path: e.target.value })}
                  placeholder="https://example.com/document.pdf"
                  helperText="Enter the URL of your document"
                />
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseDialog} size="large">
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
              Upload
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Documents;

