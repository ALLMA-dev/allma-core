import { JSX, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useTranslation } from 'react-i18next';

import { PageLoader } from '../components/shared/PageLoader';
import { LoginPage } from '../pages/LoginPage';
import { ProjectsListPage } from '../pages/ProjectsListPage';
import { ProjectSummaryPage } from '../pages/ProjectSummaryPage';
import { NewProjectUploadPage } from '../pages/NewProjectUploadPage';
import { ProfilePage } from '../pages/ProfilePage';

import { useApiView, useApiCommand } from '@/hooks/useApi';
import { UserProfileViewModel } from '@optiroq/types';
import { ProjectEditPage } from '../pages/ProjectEditPage';
import { useCurrency } from '@/hooks/useCurrency';
import { RfqWizardPage } from '@/pages/RfqWizardPage';
import { SuppliersListPage } from '../pages/SuppliersListPage';
import { SupplierDetailPage } from '../pages/SupplierDetailPage';
import { SupplierImportPage } from '../pages/SupplierImportPage';

const PREFERRED_LANGUAGE_KEY = 'preferredLanguage';

/**
 * A wrapper component that handles fetching user-specific settings (like language)
 * after authentication and before rendering the main application. It also enforces
 * mandatory profile completion for new users.
 */
function AuthWrapper({ children }: { children: JSX.Element }) {
  const { i18n } = useTranslation();
  const location = useLocation();
  const { data: profile, isSuccess, isLoading, isError } = useApiView<UserProfileViewModel>('profile', 'me');

  const { mutate: updateProfile } = useApiCommand('profile', 'me');
  
  useCurrency();

  useEffect(() => {
    if (isSuccess && profile) {
      // 1. Synchronize i18next with the language from the fetched profile.
      if (profile.language && i18n.language !== profile.language) {
        i18n.changeLanguage(profile.language);
      }

      // 2. ONE-TIME-ACTION: If this is a new user, check for a language preference from the login screen.
      const preferredLanguage = localStorage.getItem(PREFERRED_LANGUAGE_KEY);
      if (!profile.isProfileComplete && preferredLanguage && preferredLanguage !== profile.language) {
        // A language was chosen on the login screen that differs from the default profile.
        // Update the profile on the backend immediately.
        updateProfile({
          command: 'updateProfile',
          payload: { language: preferredLanguage },
          // Suppress the generic "Success" notification for a smoother UX.
          suppressNotification: true,
        });
        
        // Clean up the temporary value from localStorage.
        localStorage.removeItem(PREFERRED_LANGUAGE_KEY);
      }
    }
  }, [isSuccess, profile, i18n, updateProfile]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError) {
    console.error("Failed to fetch user profile. Halting render.");
    return <PageLoader />;
  }

  if (!profile) {
      console.error("Profile data is missing without an error or loading state.");
      return <PageLoader />;
  }

  if (!profile.isProfileComplete && location.pathname !== '/profile') {
    return <Navigate to="/profile" state={{ from: location }} replace />;
  }

  const isLanguageReady = profile.language ? i18n.language === profile.language : true;
  if (!isLanguageReady) {
    return <PageLoader />;
  }
  
  return children;
}


/**
 * A wrapper for routes that require authentication.
 * It checks the auth status and redirects to the login page if the user is not authenticated.
 */
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { authStatus } = useAuthenticator(context => [context.authStatus]);
  const location = useLocation();

  if (authStatus === 'configuring') {
    return <PageLoader />;
  }

  if (authStatus !== 'authenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <AuthWrapper>{children}</AuthWrapper>;
}

/**
 * Main component for defining the application's routes.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route path="/" element={<ProtectedRoute><Navigate to="/projects" replace /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><ProjectsListPage /></ProtectedRoute>} />
      <Route path="/projects/new/upload" element={<ProtectedRoute><NewProjectUploadPage /></ProtectedRoute>} />
      
      {/* Route for creating a new project from scratch */}
      <Route path="/projects/initiation" element={<ProtectedRoute><ProjectEditPage /></ProtectedRoute>} />
      
      {/* Unified route for editing any project (draft or active) */}
      <Route path="/projects/edit/:projectId" element={<ProtectedRoute><ProjectEditPage /></ProtectedRoute>} />

      {/* Route for viewing the project dashboard (read-only view) */}
      <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectSummaryPage /></ProtectedRoute>} />
      
      {/* Route for creating/editing an RFQ */}
      <Route path="/rfqs/:rfqId/edit" element={<ProtectedRoute><RfqWizardPage /></ProtectedRoute>} />

      {/* Routes for Suppliers */}
      <Route path="/suppliers" element={<ProtectedRoute><SuppliersListPage /></ProtectedRoute>} />
      <Route path="/suppliers/new" element={<ProtectedRoute><SupplierDetailPage /></ProtectedRoute>} />
      <Route path="/suppliers/import" element={<ProtectedRoute><SupplierImportPage /></ProtectedRoute>} />
      <Route path="/suppliers/:supplierId" element={<ProtectedRoute><SupplierDetailPage /></ProtectedRoute>} />
      
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}