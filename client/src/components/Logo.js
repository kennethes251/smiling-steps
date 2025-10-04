import { useState } from 'react';
import { Box } from '@mui/material';
import logoImage from '../assets/smiling-steps-logo.png';

const Logo = ({ size = 40, showText = false, sx = {} }) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        ...sx
      }}
    >
      {!imageError ? (
        /* Your Custom Logo Image */
        <img
          src={logoImage}
          alt="Smiling Steps Logo"
          onError={handleImageError}
          style={{
            width: size,
            height: size,
            objectFit: 'contain'
          }}
        />
      ) : (
        /* Fallback SVG Logo */
        <svg
          width={size}
          height={size}
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="100"
            cy="100"
            r="95"
            fill="#BA68C8"
            stroke="#663399"
            strokeWidth="4"
          />
          <path
            d="M50 150 Q75 120 100 130 Q125 140 150 110"
            stroke="#663399"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="5,3"
          />
          <circle cx="100" cy="60" r="15" fill="#FFD54F" />
          <g stroke="#FFD54F" strokeWidth="2" strokeLinecap="round">
            <line x1="100" y1="35" x2="100" y2="40" />
            <line x1="100" y1="80" x2="100" y2="85" />
            <line x1="75" y1="60" x2="80" y2="60" />
            <line x1="120" y1="60" x2="125" y2="60" />
            <line x1="82" y1="42" x2="85" y2="45" />
            <line x1="115" y1="75" x2="118" y2="78" />
            <line x1="118" y1="42" x2="115" y2="45" />
            <line x1="85" y1="75" x2="82" y2="78" />
          </g>
        </svg>
      )}

      {showText && (
        <Box
          sx={{
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            fontWeight: 600,
            fontSize: size > 30 ? '1.5rem' : '1.2rem',
            color: '#663399',
            letterSpacing: '0.5px'
          }}
        >
          Smiling Steps
        </Box>
      )}
    </Box>
  );
};

export default Logo;