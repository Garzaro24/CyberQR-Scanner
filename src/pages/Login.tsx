import React, { useState } from "react";
import { auth, googleProvider, db } from "../firebase";
import { 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification,
  updateProfile,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldAlert, ShieldCheck, ShieldEllipsis, ArrowRight, Mail, Lock, User, Eye, EyeOff, Check, X, ArrowLeft } from "lucide-react";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const sanitizeInput = (input: string) => {
    // Basic sanitization to prevent script injection
    return input.replace(/<script.*?>.*?<\/script>/gi, '').trim();
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const passwordRequirements = {
    length: password.length >= 6 && password.length <= 10,
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const isPasswordSecure = Object.values(passwordRequirements).every(Boolean);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: "user",
          createdAt: serverTimestamp(),
        });
      }

      navigate(from, { replace: true });
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Ocurrió un error durante el inicio de sesión.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const cleanEmail = sanitizeInput(email);

    if (!validateEmail(cleanEmail)) {
      setError("Por favor, introduce una dirección de correo electrónico válida.");
      setLoading(false);
      return;
    }

    try {
      const actionCodeSettings = {
        // Use the current origin to ensure it points to the custom reset page
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: true,
      };
      await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
      setSuccess("¡Correo de restablecimiento de contraseña enviado! Por favor, revisa tu bandeja de entrada.");
    } catch (err: any) {
      console.error("Reset error:", err);
      if (err.code === 'auth/user-not-found') {
        setError("No se encontró ninguna cuenta con esta dirección de correo electrónico.");
      } else {
        setError(err.message || "Ocurrió un error al enviar el correo de restablecimiento.");
      }
    } finally {
      setLoading(false);
    }
  };

  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleResendVerification = async () => {
    if (!auth.currentUser) return;
    setResendLoading(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setSuccess("¡Correo de verificación reenviado! Por favor, revisa tu bandeja de entrada.");
      setCanResend(false);
    } catch (err: any) {
      setError(err.message || "Error al reenviar el correo de verificación.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setCanResend(false);

    const cleanEmail = sanitizeInput(email);
    const cleanPassword = password; // Don't sanitize password as it might contain special chars, but it's handled by Firebase
    const cleanName = sanitizeInput(displayName);

    if (!validateEmail(cleanEmail)) {
      setError("Por favor, introduce una dirección de correo electrónico válida.");
      setLoading(false);
      return;
    }

    if (isSignUp && !isPasswordSecure) {
      setError("Por favor, cumple con todos los requisitos de seguridad de la contraseña.");
      setLoading(false);
      return;
    }

    if (!isSignUp && (cleanPassword.length < 6 || cleanPassword.length > 10)) {
      setError("La contraseña debe tener entre 6 y 10 caracteres.");
      setLoading(false);
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // Sign Up Flow
        try {
          const result = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
          const user = result.user;

          // Update profile with display name
          if (cleanName) {
            await updateProfile(user, { displayName: cleanName });
          }

          // Send verification email
          await sendEmailVerification(user);

          // Create user doc in Firestore
          await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: cleanName || user.email?.split('@')[0],
            role: "user",
            createdAt: serverTimestamp(),
          });

          setSuccess("¡Cuenta creada! Por favor, revisa tu correo para ver el enlace de verificación antes de iniciar sesión.");
          setIsSignUp(false);
          setEmail("");
          setPassword("");
          setDisplayName("");
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
            setError("Error: Esta cuenta ya existe. Por favor, inicia sesión en su lugar.");
          } else {
            throw err;
          }
        }
      } else {
        // Sign In Flow
        const result = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        const user = result.user;

        // Reload user to get latest emailVerified status
        await user.reload();
        const updatedUser = auth.currentUser;

        if (updatedUser && !updatedUser.emailVerified) {
          setError("Por favor, verifica tu dirección de correo electrónico antes de iniciar sesión.");
          setCanResend(true);
          // We don't sign out immediately here so they can click "Resend"
          // But we will sign them out if they refresh or navigate away
          return;
        }

        navigate(from, { replace: true });
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Correo electrónico o contraseña no válidos. Por favor, comprueba tus credenciales.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("La autenticación por correo/contraseña no está habilitada en la consola de Firebase. Por favor, habilítala en la pestaña Autenticación > Método de inicio de sesión.");
      } else {
        setError(err.message || "Ocurrió un error durante la autenticación.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-body text-on-surface flex flex-col">
      <main className="flex-grow flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[60%] rounded-full bg-primary-container/10 blur-[120px]"></div>
          <div className="absolute top-[20%] -right-[10%] w-[30%] h-[50%] rounded-full bg-secondary-container/20 blur-[100px]"></div>
        </div>

        <div className="relative z-10 w-full max-w-[1100px] flex flex-col md:flex-row bg-surface-container-lowest rounded-xl overflow-hidden shadow-2xl">
          <div className="hidden md:flex md:w-5/12 bg-[#006879] relative p-12 flex-col justify-between overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#006879] to-[#00B8D4] opacity-90"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-12">
                <ShieldCheck className="text-white w-8 h-8" />
                <span className="font-headline font-bold text-2xl text-white tracking-tight">CyberQR</span>
              </div>
              <h2 className="font-headline text-4xl font-bold text-white leading-tight mb-6">Asegurando la frontera digital.</h2>
              <p className="text-white/80 font-body text-lg max-w-xs leading-relaxed">
                Autenticación QR de grado empresarial y monitoreo de detección de amenazas para protocolos de seguridad modernos.
              </p>
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-4 bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/10">
                <div className="w-6 h-6 rounded-full border border-[#00B8D4] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-[#00B8D4] rounded-full"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-headline text-sm font-semibold">Centinela Global Activo</span>
                  <span className="text-white/60 font-label text-[10px] uppercase tracking-widest">Monitoreo de amenazas en tiempo real</span>
                </div>
              </div>
            </div>

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

          <div className="w-full md:w-7/12 p-8 md:p-16 flex flex-col justify-center bg-white">
            <div className="max-w-md mx-auto w-full">
              <header className="mb-10">
                <h1 className="font-headline text-3xl font-bold text-on-surface mb-2 tracking-tight">
                  {isForgotPassword ? "Restablecer Contraseña" : (isSignUp ? "Crear Cuenta" : "Acceso Seguro")}
                </h1>
                <p className="text-on-surface-variant font-body">
                  {isForgotPassword 
                    ? "Introduce tu correo para recibir un enlace de restablecimiento de contraseña." 
                    : (isSignUp ? "Registra tus credenciales empresariales." : "Introduce tus credenciales para acceder al panel de CyberQR.")}
                </p>
              </header>

              {!isForgotPassword && (
                <div className="mb-8">
                  <button 
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-md border border-outline-variant/30 hover:bg-surface-container-low transition-colors duration-200 group disabled:opacity-50"
                  >
                    <img 
                      alt="Google" 
                      className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuApIXzlPNIueclwJkHhGVbFBCKGv5H4hl6fpMOSQU-qRy7jROwnmfcofktbA-m-A5b_WvbNVBmR8p9BR0ErtDxWqDBSvYaF6qdVeOXYRx3_x0kHNDhvwK9d4jRg8khL6Yw19fgpRe5pJFgJG3Nl32MrdPHYnGR64pxxinZ4AXGLCNJAo6T5rYUQVIF7RD0FMcWX89QtOUAP-rQ1xWcdcmLHcKiXSgkhaOwxJweSnoHRj5jX3cnH-mxETwdWlW36v0HisHd8EXXzFyw"
                    />
                    <span className="font-label font-medium text-on-surface-variant">Continuar con Google</span>
                  </button>
                </div>
              )}

              {!isForgotPassword && (
                <div className="relative flex items-center mb-8">
                  <div className="flex-grow border-t border-outline-variant/20"></div>
                  <span className="flex-shrink mx-4 text-outline font-label text-[10px] uppercase tracking-widest">o usa tu correo</span>
                  <div className="flex-grow border-t border-outline-variant/20"></div>
                </div>
              )}

              <form onSubmit={isForgotPassword ? handleForgotPassword : handleEmailAuth} className="space-y-6">
                {isSignUp && !isForgotPassword && (
                  <div className="group">
                    <label className="block font-label text-[11px] uppercase tracking-wider text-outline mb-2 ml-1" htmlFor="name">Nombre Completo</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                      <input 
                        className="w-full pl-12 pr-4 py-3.5 bg-surface-container-highest border-none rounded-md focus:bg-white focus:ring-0 transition-all duration-300 peer" 
                        id="name" 
                        placeholder="John Doe" 
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required={isSignUp}
                      />
                      <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 peer-focus:w-full"></div>
                    </div>
                  </div>
                )}
                <div className="group">
                  <label className="block font-label text-[11px] uppercase tracking-wider text-outline mb-2 ml-1" htmlFor="email">Correo de Trabajo</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                    <input 
                      className="w-full pl-12 pr-4 py-3.5 bg-surface-container-highest border-none rounded-md focus:bg-white focus:ring-0 transition-all duration-300 peer" 
                      id="email" 
                      placeholder="name@company.com" 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 peer-focus:w-full"></div>
                  </div>
                </div>
                
                {!isForgotPassword && (
                  <div className="group">
                    <div className="flex justify-between items-center mb-2 ml-1">
                      <label className="block font-label text-[11px] uppercase tracking-wider text-outline" htmlFor="password">Contraseña</label>
                      {!isSignUp && (
                        <button 
                          type="button"
                          onClick={() => {
                            setIsForgotPassword(true);
                            setError(null);
                            setSuccess(null);
                          }}
                          className="font-label text-[11px] text-[#006879] hover:underline transition-all"
                        >
                          ¿Olvidaste?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                      <input 
                        className="w-full pl-12 pr-12 py-3.5 bg-surface-container-highest border-none rounded-md focus:bg-white focus:ring-0 transition-all duration-300 peer" 
                        id="password" 
                        placeholder="••••••••••••" 
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        maxLength={10}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 peer-focus:w-full"></div>
                    </div>

                    {isSignUp && (
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                          <Lock className="w-5 h-5" />
                        </div>
                        <input 
                          type={showPassword ? "text" : "password"} 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-b-2 border-outline-variant/10 focus:border-primary outline-none font-body text-on-surface transition-all peer"
                          placeholder="Confirmar Contraseña"
                          required
                          maxLength={10}
                        />
                        <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 peer-focus:w-full"></div>
                      </div>
                    )}

                    {isSignUp && (
                      <div className="mt-3 space-y-2 p-3 bg-surface-container-low rounded-md border border-outline-variant/10">
                        <p className="text-[10px] font-label uppercase tracking-widest text-outline mb-2">Requisitos de Seguridad</p>
                        <div className="grid grid-cols-1 gap-1.5">
                          <div className={`flex items-center gap-2 text-xs ${passwordRequirements.length ? 'text-emerald-600' : 'text-outline'}`}>
                            {passwordRequirements.length ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            <span>Entre 6 y 10 caracteres</span>
                          </div>
                          <div className={`flex items-center gap-2 text-xs ${passwordRequirements.number ? 'text-emerald-600' : 'text-outline'}`}>
                            {passwordRequirements.number ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            <span>Al menos 1 número</span>
                          </div>
                          <div className={`flex items-center gap-2 text-xs ${passwordRequirements.special ? 'text-emerald-600' : 'text-outline'}`}>
                            {passwordRequirements.special ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            <span>Al menos 1 carácter especial</span>
                          </div>
                        </div>
                        
                        <div className="mt-2 h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              Object.values(passwordRequirements).filter(Boolean).length === 3 ? 'bg-emerald-500' : 
                              Object.values(passwordRequirements).filter(Boolean).length >= 1 ? 'bg-amber-500' : 'bg-error'
                            }`}
                            style={{ width: `${(Object.values(passwordRequirements).filter(Boolean).length / 3) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {error && (
                  <div className="p-3 bg-error/10 border border-error/20 rounded-md flex flex-col gap-2 text-error text-sm">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                    {canResend && (
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resendLoading}
                        className="text-xs font-bold uppercase tracking-widest text-[#006879] hover:underline self-start mt-1 disabled:opacity-50"
                      >
                        {resendLoading ? "Enviando..." : "Reenviar correo de verificación"}
                      </button>
                    )}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center gap-2 text-emerald-600 text-sm">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-[#00B8D4] text-white font-headline font-bold rounded-md shadow-lg shadow-[#00B8D4]/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                  >
                    {loading ? "Procesando..." : (isForgotPassword ? "Enviar Enlace de Restablecimiento" : (isSignUp ? "Crear Cuenta" : "Iniciar Sesión en CyberQR"))}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                {isForgotPassword && (
                  <button 
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setError(null);
                      setSuccess(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-outline hover:text-on-surface transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al Inicio de Sesión
                  </button>
                )}
              </form>

              {!isForgotPassword && (
                <footer className="mt-10 text-center">
                  <p className="font-body text-sm text-on-surface-variant">
                    {isSignUp ? (
                      <>¿Ya tienes una cuenta? <button onClick={() => setIsSignUp(false)} className="text-[#006879] font-semibold hover:underline">Iniciar Sesión</button></>
                    ) : (
                      <>¿Eres nuevo en la empresa? <button onClick={() => setIsSignUp(true)} className="text-[#006879] font-semibold hover:underline">Registrar Acceso</button></>
                    )}
                  </p>
                </footer>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-8 py-12 max-w-7xl mx-auto">
          <div className="mb-6 md:mb-0">
            <span className="text-lg font-bold text-slate-900 dark:text-white font-headline">CyberQR</span>
            <p className="text-slate-600 dark:text-slate-400 font-body text-sm mt-1">© 2026 Proyecto de Ingeniería de Software II. Todos los derechos reservados.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <a className="text-slate-600 dark:text-slate-400 font-body text-sm hover:text-[#00B8D4] transition-all" href="#">Política de Privacidad</a>
            <a className="text-slate-600 dark:text-slate-400 font-body text-sm hover:text-[#00B8D4] transition-all" href="#">Documentación</a>
            <a className="text-slate-600 dark:text-slate-400 font-body text-sm hover:text-[#00B8D4] transition-all" href="#">Centro de Soporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
