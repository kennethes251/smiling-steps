import React from 'react';
import { Box, Skeleton, keyframes, styled } from '@mui/material';

// Shimmer animation for skeleton loading
const shimmer = keyframes`
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
`;

const StyledSkeleton = styled(Skeleton)(({ theme, variant, animation = 'pulse', shimmerBg = 'rgba(0, 0, 0, 0.05)' }) => ({
  ...(animation === 'wave' && {
    '&::after': {
      background: `linear-gradient(90deg, transparent, ${shimmerBg}, transparent)`,
      animation: `${shimmer} 1.5s ease-in-out infinite`,
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      transform: 'translateX(-100%)',
    },
  }),
  ...(variant === 'text' && {
    transform: 'none', // Remove the transform to prevent text shifting
  }),
  ...(variant === 'circular' && {
    borderRadius: '50%',
  }),
  ...(variant === 'rectangular' && {
    borderRadius: 1,
  }),
}));

const SkeletonWrapper = styled(Box)(({ fullWidth = true }) => ({
  width: fullWidth ? '100%' : 'auto',
  position: 'relative',
  overflow: 'hidden',
}));

const LoadingSkeleton = ({
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  count = 1,
  spacing = 1,
  fullWidth = true,
  sx = {},
  ...props
}) => {
  // Handle different variants with appropriate default dimensions
  const getDimensions = () => {
    if (width && height) return { width, height };
    
    switch (variant) {
      case 'text':
        return { 
          width: width || '100%', 
          height: height || '1.5rem',
        };
      case 'circular':
        return { 
          width: width || 40, 
          height: height || 40,
        };
      case 'rectangular':
        return { 
          width: width || '100%', 
          height: height || 200,
        };
      default:
        return { width: '100%', height: '1.5rem' };
    }
  };

  const dimensions = getDimensions();
  
  // Generate multiple skeletons if count > 1
  if (count > 1) {
    return (
      <Box sx={{ width: fullWidth ? '100%' : 'auto' }}>
        {Array.from({ length: count }).map((_, index) => (
          <Box 
            key={index} 
            sx={{ 
              mb: index < count - 1 ? spacing : 0,
              width: dimensions.width,
              ...(fullWidth && { width: '100%' })
            }}
          >
            <LoadingSkeleton 
              variant={variant}
              width={dimensions.width}
              height={dimensions.height}
              animation={animation}
              sx={sx}
              {...props}
            />
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <SkeletonWrapper fullWidth={fullWidth}>
      <StyledSkeleton
        variant={variant}
        width={dimensions.width}
        height={dimensions.height}
        animation={animation}
        sx={sx}
        {...props}
      />
    </SkeletonWrapper>
  );
};

// Specific skeleton components for common use cases
const CardSkeleton = ({ variant = 'rectangular', height = 200, ...props }) => (
  <Box sx={{ p: 2, width: '100%' }}>
    <LoadingSkeleton 
      variant={variant} 
      height={height}
      sx={{ borderRadius: 2, mb: 2 }}
      {...props}
    />
    <LoadingSkeleton variant="text" width="60%" sx={{ mb: 1.5 }} />
    <LoadingSkeleton variant="text" width="80%" sx={{ mb: 0.5 }} />
    <LoadingSkeleton variant="text" width="90%" />
  </Box>
);

const ListSkeleton = ({ count = 3, itemHeight = 56, ...props }) => (
  <Box sx={{ width: '100%' }}>
    {Array.from({ length: count }).map((_, index) => (
      <Box 
        key={index} 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <LoadingSkeleton 
          variant="circular" 
          width={40} 
          height={40} 
          sx={{ mr: 2 }} 
          {...props}
        />
        <Box sx={{ flex: 1 }}>
          <LoadingSkeleton variant="text" width="60%" sx={{ mb: 1 }} />
          <LoadingSkeleton variant="text" width="40%" />
        </Box>
      </Box>
    ))}
  </Box>
);

const DashboardSkeleton = () => (
  <Box sx={{ p: 3 }}>
    <LoadingSkeleton variant="text" width={200} height={40} sx={{ mb: 3 }} />
    <Grid container spacing={3}>
      {[1, 2, 3, 4].map((item) => (
        <Grid item xs={12} sm={6} md={3} key={item}>
          <CardSkeleton />
        </Grid>
      ))}
    </Grid>
    <Box sx={{ mt: 4 }}>
      <LoadingSkeleton variant="text" width={200} height={40} sx={{ mb: 3 }} />
      <ListSkeleton count={5} />
    </Box>
  </Box>
);

export { 
  LoadingSkeleton as default, 
  LoadingSkeleton, 
  CardSkeleton, 
  ListSkeleton, 
  DashboardSkeleton 
};
