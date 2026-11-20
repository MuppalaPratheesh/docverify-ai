import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminDocumentTypesPage } from './pages/admin/AdminDocumentTypesPage';
import { AdminReferenceSourcesPage } from './pages/admin/AdminReferenceSourcesPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminVerificationRulesPage } from './pages/admin/AdminVerificationRulesPage';
import { ApplicationDetailPage } from './pages/ApplicationDetailPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { NewApplicationPage } from './pages/NewApplicationPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { RegisterPage } from './pages/RegisterPage';
import { ReviewerApplicationDetailPage } from './pages/reviewer/ReviewerApplicationDetailPage';
import { ReviewerApplicationsPage } from './pages/reviewer/ReviewerApplicationsPage';
import { ReviewerDashboardPage } from './pages/reviewer/ReviewerDashboardPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="dashboard" element={<Navigate to="/" replace />} />
              <Route path="applications" element={<ApplicationsPage />} />
              <Route element={<ProtectedRoute roles={['APPLICANT', 'ADMIN']} />}>
                <Route path="applications/new" element={<NewApplicationPage />} />
              </Route>
              <Route path="applications/:id" element={<ApplicationDetailPage />} />
              <Route
                path="documents"
                element={
                  <PlaceholderPage
                    title="Documents"
                    description="Document uploads are managed from each application detail page."
                  />
                }
              />

              <Route element={<ProtectedRoute roles={['REVIEWER', 'ADMIN']} />}>
                <Route path="reviewer/dashboard" element={<ReviewerDashboardPage />} />
                <Route path="reviewer/applications" element={<ReviewerApplicationsPage />} />
                <Route
                  path="reviewer/applications/:id"
                  element={<ReviewerApplicationDetailPage />}
                />
                <Route path="reviews" element={<Navigate to="/reviewer/applications" replace />} />
              </Route>

              <Route element={<ProtectedRoute roles={['ADMIN']} />}>
                <Route path="admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="admin/users" element={<AdminUsersPage />} />
                <Route path="admin/document-types" element={<AdminDocumentTypesPage />} />
                <Route path="admin/verification-rules" element={<AdminVerificationRulesPage />} />
                <Route path="admin/reference-sources" element={<AdminReferenceSourcesPage />} />
                <Route path="admin/audit-logs" element={<AdminAuditLogsPage />} />
                <Route path="settings" element={<Navigate to="/admin/dashboard" replace />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
