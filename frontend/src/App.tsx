import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route
            path="applications"
            element={
              <PlaceholderPage
                title="Applications"
                description="Applicants will create and track submissions for academic document review."
              />
            }
          />
          <Route
            path="documents"
            element={
              <PlaceholderPage
                title="Documents"
                description="Uploaded transcripts and language certificates will be managed from this area."
              />
            }
          />
          <Route
            path="reviews"
            element={
              <PlaceholderPage
                title="Reviews"
                description="Reviewers will inspect documents, leave comments, and record decisions here."
              />
            }
          />
          <Route
            path="settings"
            element={
              <PlaceholderPage
                title="Settings"
                description="Administrators will manage roles, document types, and verification rules here."
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
