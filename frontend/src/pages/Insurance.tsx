import React from 'react';
import { Container, Typography, Paper } from '@mui/material';

const Insurance: React.FC = () => {
  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>Insurance</Typography>
      <Paper sx={{ p: 2 }}>
        <Typography variant="body1">
          Manage insurance policies associated with properties. Backend route: /api/insurance.
        </Typography>
      </Paper>
    </Container>
  );
};

export default Insurance;
