import React, { useContext, useState, useEffect } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import axios from 'axios';

/**
 * RoleGuard Component
 * 
 * Protects routes based on user authentication and role.
 * - Checks user authentication
 * - Checks user role against allowed roles
 * - Redirects to appropriate dashboard if unauthorized
 * - Shows pending approval page for pending psychologists
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

// Loading spinner component
const LoadingSpinner = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      gap: 2
    }}
  >
    <CircularProgress size={48} />
    <Typography variant="body1" color="text.secondary">
      Loading...
    </Typography>
  </Box>
);

// Pending Approval Page for psychologists awaiting approval
const PendingApprovalPage = ({ user }) => {
  const [credentialStatus, setCredentialStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCredentialStatus = async () => {
      try {
        const response = await axios.get('/api/credentials/status');
        setCredentialStatus(response.data);
      } catch (error) {
        console.error('Error fetching credential status:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'psychologist') {
      fetchCredentialStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return <LoadingSpinner />;
  }

  const hasSubmittedCredentials = credentialStatus?.credentialsSubmitted;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh',
        padding: 4,
        textAlign: 'center'
      }}
    >
      <Box
        sx={{
          backgroundColor: 'warning.light',
          borderRadius: '50%',
          width: 80,
          height: 80,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          mb: 3
        }}
      >
        <Typography variant="h3">⏳</Typography>
      </Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        Account Pending Approval
      </Typography>
      
      {!hasSubmittedCredentials ? (
        <>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mb: 3 }}>
            To complete your registration as a psychologist, please submit your professional 
            credentials for review by our admin team.
          </Typography>
          <Button
            component={Link}
            to="/credentials"
            variant="contained"
            size="large"
            sx={{ mb: 3 }}
          >
            Submit Credentials
          </Button>
        </>
      ) : (
        <>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mb: 3 }}>
            Thank you for submitting your credentials. Your account is currently under review 
            by our admin team. You will receive an email notification once your account has been approved.
          </Typography>
          <Button
            component={Link}
            to="/credentials"
            variant="outlined"
            sx={{ mb: 3 }}
          >
            View Submission Status
          </Button>
        </>
      )}
      
      <Box sx={{ backgroundColor: 'grey.100', p: 3, borderRadius: 2, maxWidth: 400 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Account Status
        </Typography>
        <Typography variant="h6" color="warning.main" sx={{ fontWeight: 600 }}>
          {user?.approvalStatus === 'pending' ? 'Pending Review' : 
           user?.approvalStatus === 'rejected' ? 'Application Rejected' : 'Under Review'}
        </Typography>
        {user?.approvalStatus === 'rejected' && user?.approvalReason && (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            Reason: {user.approvalReason}
          </Typography>
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
        If you have any questions, please contact support at support@smilingsteps.com
      </Typography>
    </Box>
  );
};

/**
 * Get the appropriate dashboard path based on user role
 * @param {string} role - User role
 * @returns {string} - Dashboard path
 */
const getDashboardPath = (role) => {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'psychologist':
      return '/psychologist-dashboard';
    case 'client':
    default:
      return '/dashboard';
  }
};

/**
 * RoleGuard Component
 * 
 * @param {Object} props
 * @param {string[]} props.allowedRoles - Array of roles allowed to access the route
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {boolean} props.requireApproval - Whether to require psychologist approval (default: true)
 */
const RoleGuard = ({ allowedRoles = [], children, requireApproval = true }) => {
  const { isAuthenticated, loading, user } = useContext(AuthContext);
  const location = useLocation();

  // Show loading spinner while auth state is being determined
  if (loading) {
    return <LoadingSpinner />;
  }

  // Requirement 8.3: Redirect unauthenticated users to login
  if (!isAuthenticated) {
    // Save the attempted URL for redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Requirement 8.4: Show pending approval page for pending psychologists
  if (requireApproval && user?.role === 'psychologist' && user?.approvalStatus !== 'approved') {
    console.log('🚫 RoleGuard: Showing pending approval page', {
      role: user?.role,
      approvalStatus: user?.approvalStatus,
      requireApproval
    });
    return <PendingApprovalPage user={user} />;
  }

  // If no specific roles are required, allow any authenticated user
  if (!allowedRoles || allowedRoles.length === 0) {
    return children;
  }

  // Requirement 8.1, 8.2: Check if user role is in allowed roles
  if (!user || !allowedRoles.includes(user.role)) {
    // Requirement 8.5: Redirect to appropriate dashboard based on role
    const redirectPath = getDashboardPath(user?.role);
    return <Navigate to={redirectPath} replace />;
  }

  // User is authenticated and has the required role
  return children;
};

export default RoleGuard;
export { getDashboardPath, LoadingSpinner, PendingApprovalPage };
