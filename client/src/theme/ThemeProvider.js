import React, { useMemo, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, responsiveFontSizes } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { deepmerge } from '@mui/utils';
import { ThemeProvider as EmotionThemeProvider } from '@emotion/react';

// Base theme configuration
const baseTheme = {
  palette: {
    mode: 'light',
    primary: {
      main: '#77B5FE', // Muted blue
      light: '#A3CDFE',
      dark: '#4C8FE5',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FFECB3', // Warm yellow
      light: '#FFF3C7',
      dark: '#FFD95C',
      contrastText: '#1E293B',
    },
    error: {
      main: '#FF6B6B',
      light: '#FF9B9B',
      dark: '#E64A19',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#FFB74D',
      light: '#FFCC80',
      dark: '#FFA000',
      contrastText: '#1E293B',
    },
    info: {
      main: '#4FC3F7',
      light: '#81D4FA',
      dark: '#29B6F6',
      contrastText: '#1E293B',
    },
    success: {
      main: '#81C784',
      light: '#A5D6A7',
      dark: '#66BB6A',
      contrastText: '#1E293B',
    },
    background: {
      default: '#F0F8FF', // Light blue
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1E293B', // Dark blue-gray
      secondary: '#64748B',
      disabled: '#94A3B8',
    },
    divider: '#E2E8F0',
  },
  typography: {
    fontFamily: '"PT Sans", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.5px',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.6,
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        sizeSmall: {
          padding: '4px 12px',
          fontSize: '0.875rem',
        },
        sizeLarge: {
          padding: '12px 24px',
          fontSize: '1.125rem',
        },
        contained: {
          '&:hover': {
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.05)',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0 8px 30px 0 rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        fullWidth: true,
        size: 'medium',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'currentColor',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: 1,
          },
        },
        input: {
          padding: '12px 14px',
        },
        inputSizeSmall: {
          padding: '8px 12px',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          marginBottom: 4,
          '&.Mui-focused': {
            color: 'inherit',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 10px 0 rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },
};

// Dark theme overrides
const darkThemeOverrides = {
  palette: {
    mode: 'dark',
    background: {
      default: '#121212',
      paper: '#1E1E1E',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#A0AEC0',
      disabled: '#718096',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
};

// Create a theme instance with responsive font sizes
const createAppTheme = (mode = 'light') => {
  const themeConfig = mode === 'dark' 
    ? deepmerge(baseTheme, darkThemeOverrides)
    : baseTheme;
  
  let theme = createTheme(themeConfig);
  theme = responsiveFontSizes(theme);
  
  return theme;
};

// Theme context
const ThemeContext = React.createContext({
  mode: 'light',
  toggleColorMode: () => {},
  isDarkMode: false,
});

// Custom hook to use theme
const useThemeMode = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return context;
};

// Theme provider component
const CustomThemeProvider = ({ children }) => {
  const [mode, setMode] = useState('light');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedMode = localStorage.getItem('themeMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedMode === 'dark' || (!savedMode && prefersDark)) {
      setMode('dark');
    }
    
    setMounted(true);
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const newMode = e.matches ? 'dark' : 'light';
      setMode(newMode);
      localStorage.setItem('themeMode', newMode);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Toggle between light and dark mode
  const toggleColorMode = useCallback(() => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', newMode);
      return newMode;
    });
  }, []);

  // Create theme based on mode
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  // Prevent flash of unstyled content
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider
      value={{
        mode,
        toggleColorMode,
        isDarkMode: mode === 'dark',
      }}
    >
      <MuiThemeProvider theme={theme}>
        <EmotionThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </EmotionThemeProvider>
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export { CustomThemeProvider as ThemeProvider, useThemeMode, ThemeContext };
