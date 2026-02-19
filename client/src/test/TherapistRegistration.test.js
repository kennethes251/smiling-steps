import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import theme from '../theme';
import { AuthContext } from '../context/AuthContext';
import PsychologistRegister from '../pages/PsychologistRegister';

// Mock the AuthContext
const mockAuthContext = {
  register: jest.fn(),
  isAuthenticated: false,
  user: null,
  loading: false
};

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AuthContext.Provider value={mockAuthContext}>
          {component}
        </AuthContext.Provider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('TherapistRegistration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders therapist registration form', () => {
    renderWithProviders(<PsychologistRegister />);
    
    expect(screen.getByText('Join as a Therapist')).toBeInTheDocument();
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  test('shows validation errors for empty required fields', async () => {
    renderWithProviders(<PsychologistRegister />);
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  test('validates password confirmation', async () => {
    renderWithProviders(<PsychologistRegister />);
    
    const passwordInputs = screen.getAllByLabelText(/password/i);
    const passwordField = passwordInputs.find(input => input.placeholder === 'Minimum 6 characters');
    const confirmPasswordField = screen.getByLabelText(/confirm password/i);
    
    fireEvent.change(passwordField, {
      target: { value: 'password123' }
    });
    fireEvent.change(confirmPasswordField, {
      target: { value: 'different' }
    });
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  test('progresses through steps with valid data', async () => {
    renderWithProviders(<PsychologistRegister />);
    
    // Fill basic information
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Dr. John Smith' }
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'john@example.com' }
    });
    
    const passwordInputs = screen.getAllByLabelText(/password/i);
    const passwordField = passwordInputs.find(input => input.placeholder === 'Minimum 6 characters');
    const confirmPasswordField = screen.getByLabelText(/confirm password/i);
    
    fireEvent.change(passwordField, {
      target: { value: 'password123' }
    });
    fireEvent.change(confirmPasswordField, {
      target: { value: 'password123' }
    });
    
    // Go to next step
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Professional Details')).toBeInTheDocument();
      expect(screen.getByLabelText(/specializations/i)).toBeInTheDocument();
    });
  });

  test('shows trust indicators', () => {
    renderWithProviders(<PsychologistRegister />);
    
    expect(screen.getByText('Secure Registration')).toBeInTheDocument();
    expect(screen.getByText('Email Verification')).toBeInTheDocument();
    expect(screen.getByText('Admin Approval')).toBeInTheDocument();
  });

  test('displays application review process information', () => {
    renderWithProviders(<PsychologistRegister />);
    
    expect(screen.getByText('Application Review Process:')).toBeInTheDocument();
    expect(screen.getByText(/hr@smilingsteps.com/)).toBeInTheDocument();
    expect(screen.getByText(/1-2 business days/)).toBeInTheDocument();
  });

  test('calls register function with correct data on submit', async () => {
    mockAuthContext.register.mockResolvedValue({ requiresVerification: true });
    
    renderWithProviders(<PsychologistRegister />);
    
    // Fill all required fields
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Dr. John Smith' }
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'john@example.com' }
    });
    
    const passwordInputs = screen.getAllByLabelText(/password/i);
    const passwordField = passwordInputs.find(input => input.placeholder === 'Minimum 6 characters');
    const confirmPasswordField = screen.getByLabelText(/confirm password/i);
    
    fireEvent.change(passwordField, {
      target: { value: 'password123' }
    });
    fireEvent.change(confirmPasswordField, {
      target: { value: 'password123' }
    });
    
    // Go to professional details
    fireEvent.click(screen.getByText('Next'));
    
    await waitFor(() => {
      expect(screen.getByText('Professional Details')).toBeInTheDocument();
    });
    
    // Fill professional details
    fireEvent.change(screen.getByLabelText(/years of experience/i), {
      target: { value: '5 years' }
    });
    fireEvent.change(screen.getByLabelText(/education/i), {
      target: { value: 'PhD in Clinical Psychology' }
    });
    
    // Go to review step
    fireEvent.click(screen.getByText('Next'));
    
    await waitFor(() => {
      expect(screen.getByText('Review & Submit')).toBeInTheDocument();
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Submit Application'));
    
    await waitFor(() => {
      expect(mockAuthContext.register).toHaveBeenCalledWith({
        name: 'Dr. John Smith',
        email: 'john@example.com',
        password: 'password123',
        role: 'psychologist',
        psychologistDetails: {
          specializations: [],
          experience: '5 years',
          education: 'PhD in Clinical Psychology',
          bio: '',
          approvalStatus: 'pending',
          isActive: false
        },
        skipVerification: false
      });
    });
  });
});