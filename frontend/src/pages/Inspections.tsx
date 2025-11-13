import React from 'react';
import { Container, Typography, Paper } from '@mui/material';

const Inspections: React.FC = () => {
  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>Inspections</Typography>
      <Paper sx={{ p: 2 }}>
        <Typography variant="body1">
          Track property inspections. Connected to backend route /api/inspections.
        </Typography>
      </Paper>
    </Container>
  );
};

export default Inspections;
