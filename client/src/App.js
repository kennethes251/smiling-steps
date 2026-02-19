import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import theme from './theme';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import RoleGuard from './components/RoleGuard';

// Import components
import Header from './components/Header';
import Footer from './components/Footer';

// Public pages
import LandingPage from './pages/LandingPage';
import LandingPageRefactored from './pages/LandingPageRefactored';
import MarketingPage from './pages/MarketingPage';
import LearnMorePage from './pages/LearnMorePage';
import Login from './components/auth/Login';
import Register from './pages/Register';
import PsychologistRegister from './pages/PsychologistRegister';
import RoleSelectionPage from './pages/RoleSelectionPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import TherapistsPage from './pages/TherapistsPage';
import BlogListPage from './pages/BlogListPage';
import BlogPostPage from './pages/BlogPostPage';
import ResourcesPage from './pages/ResourcesPage';
import FounderPage from './pages/FounderPage';

import CredentialSubmission from './components/CredentialSubmission';
import ClarificationRequests from './components/ClarificationRequests';

// Protected pages
import Dashboard from './pages/Dashboard';
import BookingPage from './pages/BookingPage';
import BookingPageNew from './pages/BookingPageNew';
import ProfilePage from './pages/ProfilePage';
import AssessmentsPage from './pages/AssessmentsPage';
import AssessmentDetailPage from './pages/AssessmentDetailPage';
import AssessmentResultsPage from './pages/AssessmentResultsPage';
import AssessmentResultDetailPage from './pages/AssessmentResultDetailPage';
import TakeAssessment from './pages/TakeAssessment';
import ProgressPage from './pages/ProgressPage';
import CheckInPage from './pages/CheckInPage';
import MessagesHub from './pages/MessagesHub';
import ChatPage from './pages/ChatPage';
import VideoCallPage from './pages/VideoCallPage';
import VideoCallPageNew from './pages/VideoCallPageNew';

// Admin pages
import AdminCreatePsychologist from './pages/AdminCreatePsychologist';
import BlogManagementPage from './pages/BlogManagementPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider maxSnack={3}>
        <AuthProvider>
          <Header />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPageRefactored />} />
            <Route path="/landing-old" element={<LandingPage />} />
            <Route path="/learn-more" element={<LearnMorePage />} />
            <Route path="/marketing" element={<MarketingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/get-started" element={<RoleSelectionPage />} />
            <Route path="/join" element={<RoleSelectionPage />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/client" element={<Register />} />
            <Route path="/register/psychologist" element={<PsychologistRegister />} />
            <Route path="/register/therapist" element={<PsychologistRegister />} />
            <Route path="/verify-email" element={<EmailVerificationPage />} />
            <Route path="/therapists" element={<TherapistsPage />} />
            <Route path="/blogs" element={<BlogListPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/founder" element={<FounderPage />} />
            
            {/* Protected Routes - All authenticated users */}
            <Route path="/dashboard" element={
              <PrivateRoute>
                <RoleGuard>
                  <Dashboard />
                </RoleGuard>
              </PrivateRoute>
            } />
            <Route path="/profile" element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            } />
            <Route path="/bookings" element={
              <PrivateRoute>
                <BookingPage />
              </PrivateRoute>
            } />
            <Route path="/book" element={
              <PrivateRoute>
                <BookingPageNew />
              </PrivateRoute>
            } />
            <Route path="/assessments" element={
              <PrivateRoute>
                <AssessmentsPage />
              </PrivateRoute>
            } />
            <Route path="/assessment/:id" element={
              <PrivateRoute>
                <AssessmentDetailPage />
              </PrivateRoute>
            } />
            <Route path="/take-assessment/:id" element={
              <PrivateRoute>
                <TakeAssessment />
              </PrivateRoute>
            } />
            <Route path="/assessment-results" element={
              <PrivateRoute>
                <AssessmentResultsPage />
              </PrivateRoute>
            } />
            <Route path="/assessment-result/:id" element={
              <PrivateRoute>
                <AssessmentResultDetailPage />
              </PrivateRoute>
            } />
            <Route path="/progress" element={
              <PrivateRoute>
                <ProgressPage />
              </PrivateRoute>
            } />
            <Route path="/check-in" element={
              <PrivateRoute>
                <CheckInPage />
              </PrivateRoute>
            } />
            <Route path="/messages" element={
              <PrivateRoute>
                <MessagesHub />
              </PrivateRoute>
            } />
            <Route path="/chat/:recipientId" element={
              <PrivateRoute>
                <ChatPage />
              </PrivateRoute>
            } />
            <Route path="/video-call/:sessionId" element={
              <PrivateRoute>
                <VideoCallPage />
              </PrivateRoute>
            } />
            <Route path="/video/:sessionId" element={
              <PrivateRoute>
                <VideoCallPageNew />
              </PrivateRoute>
            } />
            
            {/* Therapist Routes */}
            <Route path="/credentials" element={
              <PrivateRoute>
                <RoleGuard allowedRoles={['psychologist']}>
                  <CredentialSubmission />
                </RoleGuard>
              </PrivateRoute>
            } />
            
            <Route path="/clarifications" element={
              <PrivateRoute>
                <RoleGuard allowedRoles={['psychologist']}>
                  <ClarificationRequests />
                </RoleGuard>
              </PrivateRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin/create-psychologist" element={
              <PrivateRoute>
                <RoleGuard allowedRoles={['admin']}>
                  <AdminCreatePsychologist />
                </RoleGuard>
              </PrivateRoute>
            } />
            <Route path="/admin/blogs" element={
              <PrivateRoute>
                <RoleGuard allowedRoles={['admin']}>
                  <BlogManagementPage />
                </RoleGuard>
              </PrivateRoute>
            } />
          </Routes>
          <Footer />
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
