import React from 'react';
import { Container, Typography, Paper } from '@mui/material';

const Owners: React.FC = () => {
  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>Owners</Typography>
      <Paper sx={{ p: 2 }}>
        <Typography variant="body1">
          Manage property owners. This is a placeholder page wired to the backend route /api/owners.
        </Typography>
      </Paper>
    </Container>
  );
};

export default Owners;
