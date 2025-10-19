import React, { useContext } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Chip } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '@mui/material/styles';
import Logo from './Logo';

const Header = () => {
  const { isAuthenticated, logout, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const theme = useTheme();

  const onLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <AppBar position="static" sx={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
      <Toolbar>
        <Typography 
          variant="h6" 
          component={RouterLink} 
          to="/" 
          sx={{ 
            textDecoration: 'none', 
            color: theme.palette.primary.main,
            fontWeight: 'bold',
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Logo size={32} />
          Smiling Steps
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button 
            color="inherit" 
            component={RouterLink} 
            to="/"
            sx={{ color: theme.palette.text.primary }}
          >
            Home
          </Button>
          
          {isAuthenticated ? (
            <>
              <Chip 
                label={`Welcome, ${user?.name || 'User'}`}
                sx={{ 
                  backgroundColor: theme.palette.background.soft,
                  color: theme.palette.primary.main,
                  fontWeight: 600
                }}
              />
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/dashboard"
                sx={{ color: theme.palette.text.primary }}
              >
                Dashboard
              </Button>
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/profile"
                sx={{ color: theme.palette.text.primary }}
              >
                Profile
              </Button>
              <Button 
                variant="outlined"
                onClick={onLogout}
                sx={{ 
                  borderColor: theme.palette.primary.main,
                  color: theme.palette.primary.main,
                  '&:hover': {
                    backgroundColor: 'rgba(102, 51, 153, 0.04)'
                  }
                }}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/login"
                sx={{ color: theme.palette.text.primary }}
              >
                Login
              </Button>
              <Button 
                variant="contained"
                component={RouterLink} 
                to="/register"
                sx={{
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                  '&:hover': {
                    background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`
                  }
                }}
              >
                Register
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;