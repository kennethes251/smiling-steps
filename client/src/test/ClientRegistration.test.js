import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { AuthContext } from '../context/AuthContext';
import Register from '../pages/Register';
import theme from '../theme';

// Mock the navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock AuthContext
const mockRegister = jest.fn();
const mockAuthContext = {
  register: mockRegister,
  isAuthenticated: false,
  loading: false,
  user: null,
  error: null
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

describe('Client Registration Form', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  test('renders client registration form with all required fields', () => {
    renderWithProviders(<Register />);
    
    expect(screen.getByText('Join Smiling Steps')).toBeInTheDocument();
    expect(screen.getByText('Create your client account to get started')).toBeInTheDocument();
    expect(screen.getByText('📧 You\'ll need to verify your email address before accessing your account')).toBeInTheDocument();
    
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create client account/i })).toBeInTheDocument();
  });

  test('shows validation errors for empty fields', async () => {
    renderWithProviders(<Register />);
    
    const submitButton = screen.getByRole('button', { name: /create client account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  test('shows validation error for invalid email', async () => {
    renderWithProviders(<Register />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    const submitButton = screen.getByRole('button', { name: /create client account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email is invalid')).toBeInTheDocument();
    });
  });

  test('shows validation error for short password', async () => {
    renderWithProviders(<Register />);
    
    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(passwordInput, { target: { value: '123' } });
    
    const submitButton = screen.getByRole('button', { name: /create client account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  test('submits form with valid data and redirects to email verification', async () => {
    mockRegister.mockResolvedValue({
      requiresVerification: true,
      user: { id: '123', name: 'John Doe', email: 'john@example.com', role: 'client' }
    });

    renderWithProviders(<Register />);
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    
    const submitButton = screen.getByRole('button', { name: /create client account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'client',
        skipVerification: false
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('/verify-email', {
        state: {
          email: 'john@example.com',
          message: 'Registration successful! Please check your email to verify your account.'
        }
      });
    });
  });

  test('handles registration error gracefully', async () => {
    const errorMessage = 'Email is already in use';
    mockRegister.mockRejectedValue({
      response: { data: { message: errorMessage } }
    });

    renderWithProviders(<Register />);
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    
    const submitButton = screen.getByRole('button', { name: /create client account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  test('shows helper text for email field', () => {
    renderWithProviders(<Register />);
    
    expect(screen.getByText('We\'ll send a verification link to this email')).toBeInTheDocument();
  });

  test('has link to login page', () => {
    renderWithProviders(<Register />);
    
    expect(screen.getByText('Already have an account?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});