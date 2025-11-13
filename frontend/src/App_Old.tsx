import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme.ts';
import Navbar from './components/Navbar.tsx';
import Footer from './components/Footer.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Properties from './pages/Properties.tsx';
import Tenants from './pages/Tenants.tsx';
import Leases from './pages/Leases.tsx';
import Maintenance from './pages/Maintenance.tsx';
import Owners from './pages/Owners.tsx';
import Inspections from './pages/Inspections.tsx';
import Documents from './pages/Documents.tsx';
import Insurance from './pages/Insurance.tsx';
import Transactions from './pages/Transactions.tsx';
import Signin from './pages/Signin.tsx';
import Register from './pages/Register.tsx';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/leases" element={<Leases />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/owners" element={<Owners />} />
          <Route path="/inspections" element={<Inspections />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/insurance" element={<Insurance />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/signin" element={<Signin />} />
          <Route path="/register" element={<Register />} />
        </Routes>
        <Footer />
      </Router>
    </ThemeProvider>
  );
}

export default App;