import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, ShieldAlert, Loader2, Eye, EyeOff, Check, X, ArrowLeft, ArrowRight } from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get("oobCode");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const passwordRequirements = {
    length: newPassword.length >= 6 && newPassword.length <= 10,
    number: /\d/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
  };

  const isPasswordSecure = Object.values(passwordRequirements).every(Boolean);

  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        setError("Código de restablecimiento inválido o faltante.");
        setVerifying(false);
        return;
      }

      try {
        const userEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(userEmail);
      } catch (err: any) {
        console.error("Verification error:", err);
        setError("El enlace de restablecimiento es inválido o ha expirado.");
      } finally {
        setVerifying(false);
      }
    };

    verifyCode();
  }, [oobCode]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;

    if (!isPasswordSecure) {
      setError("Por favor, cumpla con todos los requisitos de seguridad de la contraseña.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess("¡La contraseña ha sido restablecida con éxito! Ahora puede iniciar sesión con su nueva contraseña.");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      console.error("Reset error:", err);
      setError(err.message || "Error al restablecer la contraseña. Por favor, inténtelo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-on-surface-variant font-medium">Verificando código de restablecimiento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-outline-variant/10 overflow-hidden">
        <div className="p-8">
          <header className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-headline text-2xl font-bold text-on-surface tracking-tight">Establecer Nueva Contraseña</h1>
            <p className="text-on-surface-variant text-sm mt-2">
              {email ? `Restableciendo contraseña para ${email}` : "Ingrese su nueva contraseña segura a continuación."}
            </p>
          </header>

          {error && (
            <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-xl flex items-center gap-3 text-error">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-600">
              <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{success}</span>
            </div>
          )}

          {!success && !error && (
            <form onSubmit={handleReset} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nueva Contraseña</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-outline-variant/20 rounded-xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20 outline-none pr-12"
                      placeholder="Ingrese nueva contraseña"
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
                  </div>

                  {newPassword && (
                    <div className="mt-3 space-y-2 p-3 bg-slate-50 rounded-xl border border-outline-variant/10">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Requisitos de Seguridad</p>
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
                      
                      <div className="mt-2 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
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

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Confirmar Contraseña</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-outline-variant/20 rounded-xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="Confirmar nueva contraseña"
                    required
                    maxLength={10}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading || !isPasswordSecure}
                className="w-full py-4 bg-primary text-white font-headline font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Restablecer Contraseña"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          )}

          {(error || success) && (
            <button 
              onClick={() => navigate("/login")}
              className="mt-6 w-full flex items-center justify-center gap-2 text-sm font-semibold text-outline hover:text-on-surface transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Inicio de Sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
