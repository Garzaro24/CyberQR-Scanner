import React, { useState } from "react";
import { auth, googleProvider, db } from "../firebase";
import { signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldAlert, ShieldCheck, ShieldEllipsis, ArrowRight, Github } from "lucide-react";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user document exists, if not create it
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: "user", // Default role
          createdAt: serverTimestamp(),
        });
      }

      navigate(from, { replace: true });
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "An error occurred during sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-body text-on-surface flex flex-col">
      <main className="flex-grow flex items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[60%] rounded-full bg-primary-container/10 blur-[120px]"></div>
          <div className="absolute top-[20%] -right-[10%] w-[30%] h-[50%] rounded-full bg-secondary-container/20 blur-[100px]"></div>
        </div>

        {/* Login Container */}
        <div className="relative z-10 w-full max-w-[1100px] flex flex-col md:flex-row bg-surface-container-lowest rounded-xl overflow-hidden shadow-2xl">
          {/* Side Illustration/Branding Panel */}
          <div className="hidden md:flex md:w-5/12 bg-[#006879] relative p-12 flex-col justify-between overflow-hidden">
            {/* Decorative Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#006879] to-[#00B8D4] opacity-90"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-12">
                <ShieldCheck className="text-white w-8 h-8" />
                <span className="font-headline font-bold text-2xl text-white tracking-tight">CyberQR</span>
              </div>
              <h2 className="font-headline text-4xl font-bold text-white leading-tight mb-6">Securing the digital frontier.</h2>
              <p className="text-white/80 font-body text-lg max-w-xs leading-relaxed">
                Enterprise-grade QR authentication and threat detection monitoring for modern security protocols.
              </p>
            </div>

            <div className="relative z-10">
              {/* Status Orbital Component */}
              <div className="flex items-center gap-4 bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/10">
                <div className="w-6 h-6 rounded-full border border-[#00B8D4] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-[#00B8D4] rounded-full"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-headline text-sm font-semibold">Global Sentry Active</span>
                  <span className="text-white/60 font-label text-[10px] uppercase tracking-widest">Real-time threat monitoring</span>
                </div>
              </div>
            </div>

            {/* Subtle Pattern Overlay */}
            <div className="absolute bottom-0 right-0 w-full h-full opacity-5 pointer-events-none">
              <svg height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern height="40" id="grid" patternUnits="userSpaceOnUse" width="40">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"></path>
                  </pattern>
                </defs>
                <rect fill="url(#grid)" height="100%" width="100%"></rect>
              </svg>
            </div>
          </div>

          {/* Form Panel */}
          <div className="w-full md:w-7/12 p-8 md:p-16 flex flex-col justify-center bg-white">
            <div className="max-w-md mx-auto w-full">
              <header className="mb-10">
                <h1 className="font-headline text-3xl font-bold text-on-surface mb-2 tracking-tight">Secure Access</h1>
                <p className="text-on-surface-variant font-body">Enter your credentials to access the CyberQR dashboard.</p>
              </header>

              {/* Social Logins */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <button 
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="flex items-center justify-center gap-3 py-3 px-4 rounded-md border border-outline-variant/30 hover:bg-surface-container-low transition-colors duration-200 group disabled:opacity-50"
                >
                  <img 
                    alt="Google" 
                    className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuApIXzlPNIueclwJkHhGVbFBCKGv5H4hl6fpMOSQU-qRy7jROwnmfcofktbA-m-A5b_WvbNVBmR8p9BR0ErtDxWqDBSvYaF6qdVeOXYRx3_x0kHNDhvwK9d4jRg8khL6Yw19fgpRe5pJFgJG3Nl32MrdPHYnGR64pxxinZ4AXGLCNJAo6T5rYUQVIF7RD0FMcWX89QtOUAP-rQ1xWcdcmLHcKiXSgkhaOwxJweSnoHRj5jX3cnH-mxETwdWlW36v0HisHd8EXXzFyw"
                  />
                  <span className="font-label font-medium text-on-surface-variant">Google</span>
                </button>
                <button 
                  disabled={true}
                  className="flex items-center justify-center gap-3 py-3 px-4 rounded-md border border-outline-variant/30 hover:bg-surface-container-low transition-colors duration-200 group opacity-50 cursor-not-allowed"
                >
                  <Github className="w-5 h-5 text-on-surface-variant" />
                  <span className="font-label font-medium text-on-surface-variant">GitHub</span>
                </button>
              </div>

              <div className="relative flex items-center mb-8">
                <div className="flex-grow border-t border-outline-variant/20"></div>
                <span className="flex-shrink mx-4 text-outline font-label text-[10px] uppercase tracking-widest">or continue with email</span>
                <div className="flex-grow border-t border-outline-variant/20"></div>
              </div>

              {/* Input Fields (Mocked for UI) */}
              <div className="space-y-6">
                <div className="group">
                  <label className="block font-label text-[11px] uppercase tracking-wider text-outline mb-2 ml-1" htmlFor="email">Work Email</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">@</span>
                    <input 
                      className="w-full pl-12 pr-4 py-3.5 bg-surface-container-highest border-none rounded-md focus:bg-white focus:ring-0 transition-all duration-300 peer" 
                      id="email" 
                      placeholder="name@company.com" 
                      type="email"
                      disabled={true}
                    />
                    <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 peer-focus:w-full"></div>
                  </div>
                </div>
                <div className="group">
                  <div className="flex justify-between items-center mb-2 ml-1">
                    <label className="block font-label text-[11px] uppercase tracking-wider text-outline" htmlFor="password">Password</label>
                    <a className="font-label text-[11px] text-[#006879] hover:underline transition-all" href="#">Forgot?</a>
                  </div>
                  <div className="relative">
                    <ShieldEllipsis className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                    <input 
                      className="w-full pl-12 pr-12 py-3.5 bg-surface-container-highest border-none rounded-md focus:bg-white focus:ring-0 transition-all duration-300 peer" 
                      id="password" 
                      placeholder="••••••••••••" 
                      type="password"
                      disabled={true}
                    />
                    <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 peer-focus:w-full"></div>
                  </div>
                </div>
                
                {error && <p className="text-error text-sm mt-2">{error}</p>}

                <div className="pt-2">
                  <button 
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full py-4 bg-[#00B8D4] text-white font-headline font-bold rounded-md shadow-lg shadow-[#00B8D4]/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                  >
                    {loading ? "Signing in..." : "Sign In to CyberQR"}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              <footer className="mt-10 text-center">
                <p className="font-body text-sm text-on-surface-variant">
                  New to the enterprise? <a className="text-[#006879] font-semibold hover:underline" href="#">Request Access</a>
                </p>
              </footer>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-8 py-12 max-w-7xl mx-auto">
          <div className="mb-6 md:mb-0">
            <span className="text-lg font-bold text-slate-900 dark:text-white font-headline">CyberQR</span>
            <p className="text-slate-600 dark:text-slate-400 font-body text-sm mt-1">© 2024 CyberQR Enterprise. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <a className="text-slate-600 dark:text-slate-400 font-body text-sm hover:text-[#00B8D4] transition-all" href="#">Privacy Policy</a>
            <a className="text-slate-600 dark:text-slate-400 font-body text-sm hover:text-[#00B8D4] transition-all" href="#">Documentation</a>
            <a className="text-slate-600 dark:text-slate-400 font-body text-sm hover:text-[#00B8D4] transition-all" href="#">Support Center</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
