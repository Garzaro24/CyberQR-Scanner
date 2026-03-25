import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import History from "./pages/History";
import Scanner from "./pages/Scanner";
import ThreatAnalysis from "./pages/ThreatAnalysis";
import Settings from "./pages/Settings";
import ResetPassword from "./pages/ResetPassword";

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Scanner />} />
            <Route path="scanner" element={<Scanner />} />
            <Route path="history" element={<History />} />
            <Route path="analysis/:id" element={<ThreatAnalysis />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
