import { GlobalStyles as MuiGlobalStyles, useTheme } from '@mui/material';

const GlobalStyles = () => {
  const theme = useTheme();

  return (
    <MuiGlobalStyles
      styles={{
        '*': {
          boxSizing: 'border-box',
          margin: 0,
          padding: 0,
        },
        html: {
          height: '100%',
          width: '100%',
          WebkitTextSizeAdjust: '100%',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        body: {
          minHeight: '100vh',
          width: '100%',
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
          lineHeight: 1.5,
          overflowX: 'hidden',
        },
        '#root': {
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: '100%',
        },
        // Typography
        'h1, h2, h3, h4, h5, h6': {
          margin: 0,
          fontWeight: 700,
          lineHeight: 1.2,
          color: theme.palette.text.primary,
        },
        p: {
          margin: 0,
        },
        // Links
        a: {
          color: theme.palette.primary.main,
          textDecoration: 'none',
          transition: 'color 0.2s ease-in-out',
          '&:hover': {
            color: theme.palette.primary.dark,
            textDecoration: 'underline',
          },
        },
        // Images
        'img, svg': {
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
        },
        // Forms
        'input, button, select, textarea': {
          fontFamily: 'inherit',
          fontSize: 'inherit',
          lineHeight: 'inherit',
        },
        button: {
          cursor: 'pointer',
          '&:disabled': {
            cursor: 'not-allowed',
            opacity: 0.6,
          },
        },
        // Utility classes
        '.sr-only': {
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        },
        '.container': {
          width: '100%',
          paddingLeft: theme.spacing(2),
          paddingRight: theme.spacing(2),
          marginLeft: 'auto',
          marginRight: 'auto',
          [theme.breakpoints.up('sm')]: {
            maxWidth: '540px',
          },
          [theme.breakpoints.up('md')]: {
            maxWidth: '720px',
          },
          [theme.breakpoints.up('lg')]: {
            maxWidth: '960px',
          },
          [theme.breakpoints.up('xl')]: {
            maxWidth: '1140px',
          },
        },
      }}
    />
  );
};

export default GlobalStyles;
