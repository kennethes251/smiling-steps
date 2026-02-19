/**
 * Tests for the Therapist "Pending Approval" Notice functionality
 * 
 * This test file verifies that the PendingApprovalPage component
 * renders correctly for different approval statuses.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { PendingApprovalPage } from '../components/RoleGuard';

const theme = createTheme();

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('PendingApprovalPage', () => {
  test('renders pending approval notice for pending psychologist', () => {
    const user = {
      role: 'psychologist',
      approvalStatus: 'pending',
      name: 'Dr. Test Psychologist'
    };

    renderWithProviders(<PendingApprovalPage user={user} />);

    // Check main heading
    expect(screen.getByText('Account Pending Approval')).toBeInTheDocument();
    
    // Check status display
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    
    // Check explanation text
    expect(screen.getByText(/Thank you for registering as a psychologist/)).toBeInTheDocument();
    
    // Check support contact
    expect(screen.getByText(/support@smilingsteps.com/)).toBeInTheDocument();
    
    // Check warning icon
    expect(screen.getByText('⏳')).toBeInTheDocument();
  });

  test('renders rejection notice for rejected psychologist', () => {
    const user = {
      role: 'psychologist',
      approvalStatus: 'rejected',
      approvalReason: 'Incomplete credentials',
      name: 'Dr. Test Psychologist'
    };

    renderWithProviders(<PendingApprovalPage user={user} />);

    // Check main heading
    expect(screen.getByText('Account Pending Approval')).toBeInTheDocument();
    
    // Check status display
    expect(screen.getByText('Application Rejected')).toBeInTheDocument();
    
    // Check rejection reason
    expect(screen.getByText('Reason: Incomplete credentials')).toBeInTheDocument();
  });

  test('renders under review notice for unknown status', () => {
    const user = {
      role: 'psychologist',
      approvalStatus: 'unknown_status',
      name: 'Dr. Test Psychologist'
    };

    renderWithProviders(<PendingApprovalPage user={user} />);

    // Check main heading
    expect(screen.getByText('Account Pending Approval')).toBeInTheDocument();
    
    // Check status display (should default to "Under Review")
    expect(screen.getByText('Under Review')).toBeInTheDocument();
  });

  test('does not show rejection reason when not provided', () => {
    const user = {
      role: 'psychologist',
      approvalStatus: 'rejected',
      name: 'Dr. Test Psychologist'
      // No approvalReason provided
    };

    renderWithProviders(<PendingApprovalPage user={user} />);

    // Check that rejection reason is not shown
    expect(screen.queryByText(/Reason:/)).not.toBeInTheDocument();
  });

  test('renders correctly with minimal user data', () => {
    const user = {
      role: 'psychologist'
      // No approvalStatus provided
    };

    renderWithProviders(<PendingApprovalPage user={user} />);

    // Should still render the main components
    expect(screen.getByText('Account Pending Approval')).toBeInTheDocument();
    expect(screen.getByText('Under Review')).toBeInTheDocument();
  });
});