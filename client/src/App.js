import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import theme from './theme';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Import components
import Header from './components/Header';
import Footer from './components/Footer';
import ApiTest from './components/ApiTest';
import AuthTest from './components/AuthTest';
import LandingPage from './pages/LandingPage';
import Login from './components/auth/Login';
import Register from './pages/Register';
import PsychologistRegister from './pages/PsychologistRegister';
import PsychologistDashboard from './components/dashboards/PsychologistDashboard';

import Dashboard from './pages/Dashboard';
import BookingPage from './pages/BookingPageSimple';
import BookingPageNew from './pages/BookingPageNew';
import AssessmentsPage from './pages/AssessmentsPage';
import TakeAssessment from './pages/TakeAssessment';
import AssessmentDetailPage from './pages/AssessmentDetailPage';
import AssessmentResultsPage from './pages/AssessmentResultsPage';
import AssessmentResultDetailPage from './pages/AssessmentResultDetailPage';
import ProfilePage from './pages/ProfilePage';
import ChatPage from './pages/ChatPage';
import MessagesHub from './pages/MessagesHub';
import ProgressPage from './pages/ProgressPage';
import CheckInPage from './pages/CheckInPage';
import MarketingPage from './pages/MarketingPage';
import FounderPage from './pages/FounderPage';
import VideoCallPage from './pages/VideoCallPage';
import VideoCallPageNew from './pages/VideoCallPageNew';
import TestVideoCall from './pages/TestVideoCall';
import AdminCreatePsychologist from './pages/AdminCreatePsychologist';
import AdminDashboardNew from './components/dashboards/AdminDashboard-new';
import AdminPaymentDashboard from './components/dashboards/AdminPaymentDashboard';
import AccountingDashboard from './components/dashboards/AccountingDashboard';
import BlogManagementPage from './pages/BlogManagementPage';
import BlogListPage from './pages/BlogListPage';
import BlogPostPage from './pages/BlogPostPage';
import ResourcesPage from './pages/ResourcesPage';
import TherapistsPage from './pages/TherapistsPage';
import EmailVerification from './pages/EmailVerification';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        <AuthProvider>
          <Header />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/learn-more" element={<MarketingPage />} />
            <Route path="/founder" element={<FounderPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/psychologist" element={<PsychologistRegister />} />
            <Route path="/verify-email" element={<EmailVerification />} />
            <Route path="/api-test" element={<ApiTest />} />
            <Route path="/auth-test" element={<AuthTest />} />
            
            {/* Protected Routes */}
            <Route path="/psychologist-dashboard" element={<PrivateRoute roles={['psychologist']}><PsychologistDashboard /></PrivateRoute>} />

            <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="/bookings" element={
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
            <Route path="/profile" element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            } />
            <Route path="/messages" element={
              <PrivateRoute>
                <MessagesHub />
              </PrivateRoute>
            } />
            <Route path="/chat" element={
              <PrivateRoute>
                <ChatPage />
              </PrivateRoute>
            } />
            <Route path="/chat/:conversationId" element={
              <PrivateRoute>
                <ChatPage />
              </PrivateRoute>
            } />
            <Route path="/settings" element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            } />
            {/* Video Call Routes */}
            <Route path="/video-call/:sessionId" element={<PrivateRoute><VideoCallPageNew /></PrivateRoute>} />
            <Route path="/video-call-old/:sessionId" element={<PrivateRoute><VideoCallPage /></PrivateRoute>} />
            <Route path="/test-video-call" element={<PrivateRoute><TestVideoCall /></PrivateRoute>} />
            
            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<PrivateRoute roles={['admin']}><AdminDashboardNew /></PrivateRoute>} />
            <Route path="/admin/payments" element={<PrivateRoute roles={['admin']}><AdminPaymentDashboard /></PrivateRoute>} />
            <Route path="/admin/accounting" element={<PrivateRoute roles={['admin']}><AccountingDashboard /></PrivateRoute>} />
            <Route path="/admin/create-psychologist" element={<PrivateRoute roles={['admin']}><AdminCreatePsychologist /></PrivateRoute>} />
            <Route path="/admin/blogs" element={<PrivateRoute roles={['admin']}><BlogManagementPage /></PrivateRoute>} />
            {/* Developer dashboard removed - all features now in main admin dashboard */}
            
            {/* Placeholder routes for missing pages */}
            <Route path="/progress" element={<PrivateRoute><ProgressPage /></PrivateRoute>} />
            <Route path="/checkin" element={<PrivateRoute><CheckInPage /></PrivateRoute>} />
            <Route path="/schedule-session" element={<PrivateRoute><BookingPageNew /></PrivateRoute>} />
            <Route path="/clients" element={<PrivateRoute><div style={{padding: '2rem', textAlign: 'center'}}><h2>Client Management - Coming Soon</h2></div></PrivateRoute>} />
            <Route path="/client-assessments" element={<PrivateRoute><AssessmentResultsPage /></PrivateRoute>} />
            {/* Public placeholder routes */}
            <Route path="/about" element={<MarketingPage />} />
            <Route path="/therapists" element={<TherapistsPage />} />
            <Route path="/blog" element={<BlogListPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/careers" element={<div style={{padding: '2rem', textAlign: 'center'}}><h2>Careers - Coming Soon</h2></div>} />
            <Route path="/faq" element={<div style={{padding: '2rem', textAlign: 'center'}}><h2>FAQ - Coming Soon</h2></div>} />
            <Route path="/privacy" element={<div style={{padding: '2rem', textAlign: 'center'}}><h2>Privacy Policy - Coming Soon</h2></div>} />
            <Route path="/terms" element={<div style={{padding: '2rem', textAlign: 'center'}}><h2>Terms of Service - Coming Soon</h2></div>} />
            <Route path="/contact" element={<div style={{padding: '2rem', textAlign: 'center'}}><h2>Contact Us - Coming Soon</h2></div>} />
          </Routes>
          <Footer />
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
