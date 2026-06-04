import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Organizations from './pages/Organizations';
import Clients from './pages/Clients';
import Engagements from './pages/Engagements';
import EngagementDetail from './pages/EngagementDetail';
import OrganizationDetail from './pages/OrganizationDetail';
import Findings from './pages/Findings';
import Repository from './pages/Repository';
import Reports from './pages/Reports';
import ReportDetail from './pages/ReportDetail';
import FindingEditor from './pages/FindingEditor';
import Calendar from './pages/Calendar';
import Assessments from './pages/Assessments';
import AssessmentDetail from './pages/AssessmentDetail';
import BreachMonitor from './pages/BreachMonitor';
import Settings from './pages/Settings';
import GrcProjects from './pages/GrcProjects';
import GrcProjectDetail from './pages/GrcProjectDetail';
import AdminPortal from './pages/AdminPortal';

// Layout
import MainLayout from './components/MainLayout';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="organizations" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN']}><Organizations /></ProtectedRoute>} />
          <Route path="organizations/:id" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN']}><OrganizationDetail /></ProtectedRoute>} />
          <Route path="clients" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN']}><Clients /></ProtectedRoute>} />
          <Route path="calendar" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'PENTESTER', 'GRC_CONSULTANT', 'PROJECT_MANAGER', 'CLIENT']}><Calendar /></ProtectedRoute>} />
          <Route path="engagements" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'PENTESTER', 'PROJECT_MANAGER']}><Engagements /></ProtectedRoute>} />
          <Route path="engagements/:id" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'PENTESTER', 'PROJECT_MANAGER']}><EngagementDetail /></ProtectedRoute>} />
          <Route path="assessments" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'GRC_CONSULTANT', 'PROJECT_MANAGER', 'CLIENT']}><Assessments /></ProtectedRoute>} />
          <Route path="assessments/:id" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'GRC_CONSULTANT', 'PROJECT_MANAGER', 'CLIENT']}><AssessmentDetail /></ProtectedRoute>} />
          <Route path="findings" element={<Findings />} />
          <Route path="repository" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'PENTESTER', 'PROJECT_MANAGER']}><Repository /></ProtectedRoute>} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:id" element={<ReportDetail />} />
          <Route path="findings/new" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'PENTESTER']}><FindingEditor /></ProtectedRoute>} />
          <Route path="findings/:findingId/edit" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'PENTESTER']}><FindingEditor /></ProtectedRoute>} />
          <Route path="breach" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'PENTESTER']}><BreachMonitor /></ProtectedRoute>} />
          <Route path="grc" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'GRC_CONSULTANT', 'PROJECT_MANAGER']}><GrcProjects /></ProtectedRoute>} />
          <Route path="grc/:id" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'GRC_CONSULTANT', 'PROJECT_MANAGER']}><GrcProjectDetail /></ProtectedRoute>} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN']}><AdminPortal /></ProtectedRoute>} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
