import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
} from '@mui/material';
import { MenuBook as WikiIcon } from '@mui/icons-material';

const Navbar = () => {
  const location = useLocation();

  return (
    <AppBar
      position="static"
      className="bg-gray-800 shadow-md"
      style={{
        backgroundColor: '#1f2937',
      }}
    >
      <Toolbar className="justify-between">
        <Typography
          variant="h6"
          component={Link}
          to="/"
          className="font-semibold text-white no-underline hover:opacity-80 transition-opacity"
          style={{
            textDecoration: 'none',
          }}
        >
          Ludzie Nikodema
        </Typography>
        <Box>
          <Button
            component={Link}
            to="/wiki"
            className="text-white hover:bg-gray-700 transition-colors"
            startIcon={<WikiIcon />}
          >
            Wiki
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;

