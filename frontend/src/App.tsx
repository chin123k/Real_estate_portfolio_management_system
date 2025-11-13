import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import theme from './theme.ts';
import PortalNavbar from './components/PortalNavbar.tsx';

// Landing and Auth Pages
import Home from './pages/Home.tsx';
import OwnerSignin from './pages/OwnerSignin.tsx';
import OwnerRegister from './pages/OwnerRegister.tsx';
import TenantSignin from './pages/TenantSignin.tsx';
import TenantRegister from './pages/TenantRegister.tsx';

// Dashboard Pages
import Dashboard from './pages/Dashboard.tsx';
import TenantDashboard from './pages/TenantDashboard.tsx';
import OwnerDashboard from './pages/OwnerDashboard.tsx';

// Legacy pages (keep for compatibility)
import Properties from './pages/Properties.tsx';
import TenantProperties from './pages/TenantProperties.tsx';
import Tenants from './pages/Tenants.tsx';
import Leases from './pages/Leases.tsx';
import Maintenance from './pages/Maintenance.tsx';
import Owners from './pages/Owners.tsx';
import Inspections from './pages/Inspections.tsx';
import Documents from './pages/Documents.tsx';
import Insurance from './pages/Insurance.tsx';
import Transactions from './pages/Transactions.tsx';
import OwnerPayments from './pages/OwnerPayments.tsx';

// Insurance Pages
import OwnerInsurance from './pages/OwnerInsurance.tsx';
import TenantInsurance from './pages/TenantInsurance.tsx';

// Protected Route Component with Navbar
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredType: 'owner' | 'tenant' }> = ({
  children,
  requiredType,
}) => {
  const userType = localStorage.getItem('userType');
  const userRaw = localStorage.getItem('user');
  const expiresAt = localStorage.getItem('loginExpiresAt');

  // Optional: auto-derive ids if missing (prevents dashboards from defaulting to 1)
  try {
    if (userRaw) {
      const u = JSON.parse(userRaw);
      if (u?.Owner_ID && !localStorage.getItem('ownerId')) {
        localStorage.setItem('ownerId', String(u.Owner_ID));
      }
      if (u?.Tenant_ID && !localStorage.getItem('tenantId')) {
        localStorage.setItem('tenantId', String(u.Tenant_ID));
      }
    }
  } catch (err) {
    console.error('Error parsing user data:', err);
  }

  // Debug logging
  console.log('ProtectedRoute Check:', { 
    userType, 
    requiredType, 
    hasUser: !!userRaw,
    expiresAt: expiresAt ? new Date(Number(expiresAt)).toLocaleString() : 'N/A',
    isExpired: expiresAt ? Date.now() > Number(expiresAt) : false
  });

  // Simple long-lived session (30d). If expired, clear and redirect.
  if (expiresAt && Date.now() > Number(expiresAt)) {
    console.warn('Session expired, logging out');
    localStorage.removeItem('userType');
    localStorage.removeItem('user');
    localStorage.removeItem('tenantId');
    localStorage.removeItem('ownerId');
    localStorage.removeItem('loginExpiresAt');
    return <Navigate to="/" replace />;
  }
  
  if (!userType) {
    console.warn('No userType found, redirecting to home');
    return <Navigate to="/" replace />;
  }
  
  if (userType !== requiredType) {
    console.warn(`UserType mismatch: ${userType} !== ${requiredType}`);
    return <Navigate to="/" replace />;
  }
  
  return (
    <Box>
      <PortalNavbar />
      {children}
    </Box>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<Home />} />
          
          {/* Owner Portal Routes */}
          <Route path="/owner/signin" element={<OwnerSignin />} />
          <Route path="/owner/register" element={<OwnerRegister />} />
          <Route
            path="/owner/dashboard"
            element={
              <ProtectedRoute requiredType="owner">
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/properties"
            element={
              <ProtectedRoute requiredType="owner">
                <Properties />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/tenants"
            element={
              <ProtectedRoute requiredType="owner">
                <Tenants />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/maintenance"
            element={
              <ProtectedRoute requiredType="owner">
                <Maintenance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/payments"
            element={
              <ProtectedRoute requiredType="owner">
                <OwnerPayments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/inspections"
            element={
              <ProtectedRoute requiredType="owner">
                <Inspections />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/insurance"
            element={
              <ProtectedRoute requiredType="owner">
                <OwnerInsurance />
              </ProtectedRoute>
            }
          />
          
          {/* Tenant Portal Routes */}
          <Route path="/tenant/signin" element={<TenantSignin />} />
          <Route path="/tenant/register" element={<TenantRegister />} />
          <Route
            path="/tenant/dashboard"
            element={
              <ProtectedRoute requiredType="tenant">
                <TenantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/properties"
            element={
              <ProtectedRoute requiredType="tenant">
                <TenantProperties />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/maintenance"
            element={
              <ProtectedRoute requiredType="tenant">
                <Maintenance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/payments"
            element={
              <ProtectedRoute requiredType="tenant">
                <Transactions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/documents"
            element={
              <ProtectedRoute requiredType="tenant">
                <Documents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/insurance"
            element={
              <ProtectedRoute requiredType="tenant">
                <TenantInsurance />
              </ProtectedRoute>
            }
          />
          
          {/* Legacy Routes (for backward compatibility) */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/leases" element={<Leases />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/owners" element={<Owners />} />
          <Route path="/inspections" element={<Inspections />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/insurance" element={<Insurance />} />
          <Route path="/transactions" element={<Transactions />} />
          
          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
