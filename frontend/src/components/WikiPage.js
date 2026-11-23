import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const WikiPage = () => {
  return (
    <Container maxWidth="md" className="py-8">
      <Box className="text-center">
        <Typography variant="h4" className="mb-4" style={{ color: '#333', fontWeight: 'normal' }}>
          Biela wiki juz wkrótce
        </Typography>
      </Box>
    </Container>
  );
};

export default WikiPage;

