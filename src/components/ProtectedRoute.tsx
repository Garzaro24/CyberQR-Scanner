import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { auth, FirebaseUser } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // If user is logged in but not verified, we treat them as not logged in for protected routes
      if (user && !user.emailVerified) {
        setUser(null);
      } else {
        setUser(user);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
