import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { RegisterPage } from './pages/RegisterPage';

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
              <Route
                path="applications"
                element={
                  <PlaceholderPage
                    title="Applications"
                    description="Applicants create and track submissions. Reviewers and administrators can inspect applications assigned for review."
                  />
                }
              />
              <Route
                path="documents"
                element={
                  <PlaceholderPage
                    title="Documents"
                    description="Upload and manage academic transcripts and language certificates for your own applications."
                  />
                }
              />
              <Route element={<ProtectedRoute roles={['REVIEWER', 'ADMIN']} />}>
                <Route
                  path="reviews"
                  element={
                    <PlaceholderPage
                      title="Reviews"
                      description="Reviewers inspect documents, leave comments, and record decisions."
                    />
                  }
                />
              </Route>
              <Route element={<ProtectedRoute roles={['ADMIN']} />}>
                <Route
                  path="settings"
                  element={
                    <PlaceholderPage
                      title="Administration"
                      description="Administrators manage users, roles, document types, and verification rules."
                    />
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
