import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import axios from 'axios';
import EmailVerificationPrompt from '../components/EmailVerificationPrompt';
import theme from '../theme';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock API endpoints
jest.mock('../config/api', () => ({
  API_ENDPOINTS: {
    BASE_URL: 'http://localhost:5000'
  }
}));

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('EmailVerificationPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders default variant with email', () => {
    renderWithTheme(
      <EmailVerificationPrompt 
        email="test@example.com"
        title="Verify Your Email"
        subtitle="Check your inbox for verification link"
      />
    );

    expect(screen.getByText('Verify Your Email')).toBeInTheDocument();
    expect(screen.getByText('Check your inbox for verification link')).toBeInTheDocument();
    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
    expect(screen.getByText('Resend Verification Email')).toBeInTheDocument();
  });

  test('renders compact variant', () => {
    renderWithTheme(
      <EmailVerificationPrompt 
        variant="compact"
        subtitle="Please verify your email"
      />
    );

    expect(screen.getByText('Please verify your email')).toBeInTheDocument();
    expect(screen.getByText('Resend Email')).toBeInTheDocument();
  });

  test('renders inline variant', () => {
    renderWithTheme(
      <EmailVerificationPrompt 
        variant="inline"
      />
    );

    expect(screen.getByText(/Please check your email and click the verification link/)).toBeInTheDocument();
    expect(screen.getByText('Resend')).toBeInTheDocument();
  });

  test('shows email input when showEmailInput is true', () => {
    renderWithTheme(
      <EmailVerificationPrompt 
        showEmailInput={true}
      />
    );

    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
  });

  test('handles resend verification successfully', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { success: true, message: 'Verification email sent' }
    });

    const mockOnVerificationSent = jest.fn();

    renderWithTheme(
      <EmailVerificationPrompt 
        email="test@example.com"
        onVerificationSent={mockOnVerificationSent}
      />
    );

    const resendButton = screen.getByText('Resend Verification Email');
    fireEvent.click(resendButton);

    expect(screen.getByText('Sending...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Verification email sent successfully/)).toBeInTheDocument();
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:5000/api/email-verification/resend',
      { email: 'test@example.com' }
    );
    expect(mockOnVerificationSent).toHaveBeenCalledWith('test@example.com');
  });

  test('handles resend verification error', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { message: 'Email not found' } }
    });

    renderWithTheme(
      <EmailVerificationPrompt 
        email="test@example.com"
      />
    );

    const resendButton = screen.getByText('Resend Verification Email');
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(screen.getByText('Email not found')).toBeInTheDocument();
    });
  });

  test('handles email input change', () => {
    const mockOnEmailChange = jest.fn();

    renderWithTheme(
      <EmailVerificationPrompt 
        showEmailInput={true}
        onEmailChange={mockOnEmailChange}
      />
    );

    const emailInput = screen.getByLabelText('Email Address');
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

    expect(mockOnEmailChange).toHaveBeenCalledWith('new@example.com');
  });

  test('disables resend button when no email provided', () => {
    renderWithTheme(
      <EmailVerificationPrompt />
    );

    const resendButton = screen.getByText('Resend Verification Email');
    expect(resendButton).toBeDisabled();
  });

  test('shows error message when trying to resend without email', async () => {
    const { rerender } = renderWithTheme(
      <EmailVerificationPrompt showEmailInput={true} />
    );

    const resendButton = screen.getByText('Resend Verification Email');
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter your email address.')).toBeInTheDocument();
    });
  });
});