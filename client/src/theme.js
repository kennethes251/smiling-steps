import { createTheme } from '@mui/material/styles';

// Smiling Steps Healing Color Palette
const colors = {
  primary: {
    main: '#663399', // Deep healing purple
    light: '#9C27B0', // Lighter purple
    dark: '#512DA8', // Darker purple
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#BA68C8', // Soft lavender
    light: '#E1BEE7', // Very light lavender
    dark: '#8E24AA', // Deep lavender
    contrastText: '#FFFFFF',
  },
  tertiary: {
    main: '#2E7D32', // Healing green (for growth/hope)
    light: '#81C784', // Light green
    dark: '#1B5E20', // Dark green
    contrastText: '#FFFFFF',
  },
  accent: {
    main: '#F57C00', // Warm orange (for creativity)
    light: '#FFB74D', // Light orange
    dark: '#E65100', // Dark orange
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#FAFAFA', // Very light grey (matches website)
    paper: '#FFFFFF',
    soft: '#F3E5F5', // Soft lavender background
    gradient: 'linear-gradient(135deg, rgba(186, 104, 200, 0.1), rgba(149, 117, 205, 0.1))',
  },
  text: {
    primary: '#2C2C2C', // Dark grey for readability
    secondary: '#666666', // Medium grey
    disabled: '#BDBDBD', // Light grey
    accent: '#663399', // Purple for highlights
  },
  grey: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  error: {
    main: '#D32F2F',
    light: '#FFCDD2',
    dark: '#B71C1C',
    contrastText: '#FFFFFF',
  },
  success: {
    main: '#2E7D32', // Using healing green
    light: '#C8E6C9',
    dark: '#1B5E20',
    contrastText: '#FFFFFF',
  },
  warning: {
    main: '#F57C00', // Using creativity orange
    light: '#FFE0B2',
    dark: '#E65100',
    contrastText: '#FFFFFF',
  },
  info: {
    main: '#1976D2',
    light: '#BBDEFB',
    dark: '#0D47A1',
    contrastText: '#FFFFFF',
  },
  // Healing-specific colors
  healing: {
    hope: '#9C27B0', // Purple for hope
    empowerment: '#2E7D32', // Green for empowerment
    creativity: '#F57C00', // Orange for creativity
    trust: '#1976D2', // Blue for trust/confidentiality
    respect: '#663399', // Deep purple for respect
  },
};

// Create theme instance
const theme = createTheme({
  palette: colors,
  typography: {
    fontFamily: '"PT Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      color: colors.text.primary,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.3,
      color: colors.text.primary,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
      color: colors.text.primary,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: colors.text.primary,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: colors.text.primary,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.5,
      color: colors.text.primary,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.75,
      color: colors.text.primary,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: colors.text.secondary,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.5px',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
      color: colors.text.secondary,
    },
    overline: {
      fontSize: '0.625rem',
      fontWeight: 600,
      lineHeight: 1.6,
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
      color: colors.text.secondary,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          scrollBehavior: 'smooth',
        },
        body: {
          backgroundColor: colors.background.default,
          color: colors.text.primary,
        },
        '&::-webkit-scrollbar': {
          width: 8,
          height: 8,
        },
        '&::-webkit-scrollbar-track': {
          background: colors.grey[100],
        },
        '&::-webkit-scrollbar-thumb': {
          background: colors.grey[300],
          borderRadius: 4,
          '&:hover': {
            background: colors.grey[400],
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 25, // More rounded for healing aesthetic
          padding: '10px 20px',
          boxShadow: 'none',
          fontWeight: 600,
          textTransform: 'none',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 4px 15px rgba(102, 51, 153, 0.3)',
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          background: `linear-gradient(45deg, ${colors.primary.main}, ${colors.primary.light})`,
          '&:hover': {
            background: `linear-gradient(45deg, ${colors.primary.dark}, ${colors.primary.main})`,
          },
        },
        outlined: {
          borderWidth: 2,
          borderColor: colors.primary.main,
          color: colors.primary.main,
          '&:hover': {
            borderWidth: 2,
            borderColor: colors.primary.dark,
            backgroundColor: 'rgba(102, 51, 153, 0.04)',
          },
        },
        sizeLarge: {
          padding: '12px 28px',
          fontSize: '1.1rem',
          borderRadius: 30,
        },
        sizeSmall: {
          padding: '6px 16px',
          fontSize: '0.875rem',
          borderRadius: 20,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 15, // More rounded for healing aesthetic
          boxShadow: '0 4px 20px 0 rgba(102, 51, 153, 0.08)',
          transition: 'all 0.3s ease-in-out',
          border: '1px solid rgba(186, 104, 200, 0.1)',
          '&:hover': {
            boxShadow: '0 8px 30px 0 rgba(102, 51, 153, 0.15)',
            transform: 'translateY(-2px)',
            borderColor: 'rgba(186, 104, 200, 0.2)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: colors.background.soft,
            borderRadius: 12,
            transition: 'all 0.3s ease',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.secondary.main,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.primary.main,
              borderWidth: '2px',
              boxShadow: `0 0 0 3px rgba(102, 51, 153, 0.1)`,
            },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: colors.primary.main,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          color: colors.text.primary,
          boxShadow: '0 2px 10px 0 rgba(102, 51, 153, 0.1)',
          borderBottom: '1px solid rgba(186, 104, 200, 0.1)',
        },
      },
    },
    // Add new components for healing theme
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          fontWeight: 600,
        },
        colorPrimary: {
          backgroundColor: colors.background.soft,
          color: colors.primary.main,
          '& .MuiChip-icon': {
            color: colors.primary.main,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 15,
          boxShadow: '0 4px 20px 0 rgba(102, 51, 153, 0.08)',
        },
        elevation1: {
          boxShadow: '0 2px 10px 0 rgba(102, 51, 153, 0.05)',
        },
        elevation3: {
          boxShadow: '0 6px 25px 0 rgba(102, 51, 153, 0.12)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          color: colors.text.secondary,
          '&.Mui-selected': {
            color: colors.primary.main,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: colors.primary.main,
          height: 3,
          borderRadius: 2,
        },
      },
    },
  },
});

export default theme;