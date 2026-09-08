import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Improvements from './pages/Improvements';
import Debts from './pages/Debts';
import UpdatePassword from './pages/UpdatePassword';
import DataRequests from './pages/DataRequests';
import Entities from './pages/Entities';
import EntityDetails from './pages/EntityDetails';
import Users from './pages/Users';
import Report from './pages/Report';
import EvaluationCriteria from './pages/EvaluationCriteria';
import { UserProvider, useUser } from './contexts/UserContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useUser();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/improvements" element={<ProtectedRoute><Improvements /></ProtectedRoute>} />
      <Route path="/debts" element={<ProtectedRoute><Debts /></ProtectedRoute>} />
      <Route path="/data-requests" element={<ProtectedRoute><DataRequests /></ProtectedRoute>} />
      <Route path="/entities" element={<ProtectedRoute><Entities /></ProtectedRoute>} />
      <Route path="/entities/:id" element={<ProtectedRoute><EntityDetails /></ProtectedRoute>} />
      <Route path="/evaluation-criteria" element={<ProtectedRoute><EvaluationCriteria /></ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;
