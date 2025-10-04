import React from 'react';
import { Box, Container, Typography, Breadcrumbs, Link, Skeleton, useTheme } from '@mui/material';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';

const Page = ({
  title,
  titleVariant = 'h4',
  subtitle,
  breadcrumbs = [],
  headerAction,
  loading = false,
  loadingSkeleton = null,
  children,
  maxWidth = 'lg',
  containerSx = {},
  contentSx = {},
  disableGutters = false,
  ...props
}) => {
  const theme = useTheme();
  const location = useLocation();

  // Generate breadcrumbs if not provided
  const getBreadcrumbs = () => {
    if (breadcrumbs.length > 0) return breadcrumbs;
    
    const pathnames = location.pathname.split('/').filter((x) => x);
    return pathnames.map((value, index) => {
      const last = index === pathnames.length - 1;
      const to = `/${pathnames.slice(0, index + 1).join('/')}`;
      
      // Format the breadcrumb text
      const text = value
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      return last ? (
        <Typography color="text.primary" key={to}>
          {text}
        </Typography>
      ) : (
        <Link 
          component={RouterLink} 
          to={to} 
          key={to}
          sx={{
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
        >
          {text}
        </Link>
      );
    });
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
    >
      <Container 
        maxWidth={maxWidth} 
        sx={{
          py: 3,
          ...(disableGutters && { px: 0 }),
          ...containerSx,
        }}
        {...props}
      >
        {/* Breadcrumbs */}
        {(breadcrumbs !== false) && (
          <Breadcrumbs 
            aria-label="breadcrumb" 
            sx={{ 
              mb: 2,
              '& .MuiBreadcrumbs-separator': {
                mx: 1,
              },
            }}
          >
            <Link 
              component={RouterLink} 
              to="/" 
              sx={{
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              Home
            </Link>
            {getBreadcrumbs()}
          </Breadcrumbs>
        )}

        {/* Page Header */}
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            {loading ? (
              <>
                <Skeleton 
                  variant="text" 
                  width={200} 
                  height={40} 
                  sx={{ mb: 1 }} 
                />
                {subtitle && (
                  <Skeleton 
                    variant="text" 
                    width={300} 
                    height={24} 
                  />
                )}
              </>
            ) : (
              <>
                <Typography 
                  variant={titleVariant} 
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.2,
                    mb: 0.5,
                  }}
                >
                  {title}
                </Typography>
                {subtitle && (
                  <Typography 
                    variant="subtitle1" 
                    color="text.secondary"
                    sx={{
                      lineHeight: 1.5,
                    }}
                  >
                    {subtitle}
                  </Typography>
                )}
              </>
            )}
          </Box>
          
          {headerAction && (
            <Box>
              {loading ? (
                <Skeleton 
                  variant="rectangular" 
                  width={120} 
                  height={40} 
                  sx={{ borderRadius: 1 }} 
                />
              ) : (
                headerAction
              )}
            </Box>
          )}
        </Box>

        {/* Page Content */}
        <Box 
          sx={{
            backgroundColor: 'background.paper',
            borderRadius: 2,
            boxShadow: theme.shadows[1],
            p: 3,
            flex: 1,
            minHeight: '60vh',
            ...contentSx,
          }}
        >
          {loading && loadingSkeleton ? (
            loadingSkeleton
          ) : loading ? (
            <Skeleton 
              variant="rectangular" 
              width="100%" 
              height="100%" 
              sx={{ 
                borderRadius: 2,
                height: '60vh',
              }} 
            />
          ) : (
            children
          )}
        </Box>
      </Container>
    </motion.div>
  );
};

export default Page;
