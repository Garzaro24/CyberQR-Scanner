import React, { useState } from "react";
import { auth } from "../firebase";
import { updateProfile, updatePassword } from "firebase/auth";
import { UserCircle, Mail, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function Settings() {
  const user = auth.currentUser;
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const passwordRequirements = {
    length: newPassword.length >= 6 && newPassword.length <= 10,
    number: /\d/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
  };

  const isPasswordSecure = Object.values(passwordRequirements).every(Boolean);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Update Display Name if changed
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }

      // Update Password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (!isPasswordSecure) {
          throw new Error("New password does not meet security requirements (6-10 chars, 1 number, 1 special char)");
        }
        await updatePassword(user, newPassword);
      }

      setSuccess("Profile updated successfully");
      setIsEditing(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-4 md:px-0">
      <header className="mb-8 md:mb-12">
        <h1 className="font-headline text-3xl md:text-5xl font-bold text-on-surface mb-2 tracking-tighter">System Configuration</h1>
        <p className="text-on-surface-variant text-sm md:text-base">Manage your operator profile and security clearance parameters.</p>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-xl flex items-center gap-3 text-error">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-500">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">{success}</span>
        </div>
      )}

      <div className="space-y-6 md:space-y-8">
        {/* Profile Section */}
        <section className="bg-white rounded-xl p-6 md:p-8 border border-outline-variant/10 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
            <div className="relative group">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-surface-container-low object-cover"
                />
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-surface-container-low flex items-center justify-center border-4 border-surface-container-low">
                  <UserCircle className="w-10 h-10 md:w-12 md:h-12 text-outline" />
                </div>
              )}
            </div>
            <div className="flex-grow">
              <h2 className="font-headline text-xl md:text-2xl font-bold text-on-surface">{user?.displayName || "Operator"}</h2>
              <p className="text-on-surface-variant text-sm md:text-base flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4" />
                {user?.email}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] md:text-xs font-bold rounded uppercase tracking-widest">Clearance Level 4</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] md:text-xs font-bold rounded uppercase tracking-widest">Active Status</span>
              </div>
            </div>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="w-full md:w-auto px-6 py-2 bg-surface-container-low text-on-surface font-semibold rounded-lg hover:bg-surface-container-high transition-colors text-sm"
              >
                Edit Profile
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider">Display Name</label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/20 rounded-lg text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="Enter display name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider">Email Address</label>
                  <div className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/20 rounded-lg text-sm font-medium text-on-surface opacity-60">
                    {user?.email}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/20 rounded-lg text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20 outline-none pr-10"
                      placeholder="Leave blank to keep current"
                      maxLength={10}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {newPassword && (
                    <div className="mt-3 space-y-2 bg-surface-container-low p-3 rounded-lg border border-outline-variant/10">
                      <div className="flex gap-1 h-1">
                        {[1, 2, 3].map((i) => (
                          <div 
                            key={i}
                            className={`flex-1 rounded-full transition-all duration-500 ${
                              i <= Object.values(passwordRequirements).filter(Boolean).length
                                ? i === 1 ? 'bg-error' : i === 2 ? 'bg-warning' : 'bg-emerald-500'
                                : 'bg-outline-variant/20'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        <div className={`flex items-center gap-2 text-[10px] font-medium transition-colors ${passwordRequirements.length ? 'text-emerald-500' : 'text-outline'}`}>
                          {passwordRequirements.length ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          Between 6 and 10 characters
                        </div>
                        <div className={`flex items-center gap-2 text-[10px] font-medium transition-colors ${passwordRequirements.number ? 'text-emerald-500' : 'text-outline'}`}>
                          {passwordRequirements.number ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          At least 1 number
                        </div>
                        <div className={`flex items-center gap-2 text-[10px] font-medium transition-colors ${passwordRequirements.special ? 'text-emerald-500' : 'text-outline'}`}>
                          {passwordRequirements.special ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          At least 1 special character
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider">Confirm Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/20 rounded-lg text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="Confirm new password"
                    maxLength={10}
                  />
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-3 pt-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary text-white font-bold py-2.5 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setDisplayName(user?.displayName || "");
                    setNewPassword("");
                    setConfirmPassword("");
                    setError(null);
                  }}
                  className="flex-1 bg-surface-container-low text-on-surface font-bold py-2.5 rounded-lg hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider">Display Name</label>
                <div className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/20 rounded-lg text-sm font-medium text-on-surface">
                  {user?.displayName || "N/A"}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider">Email Address</label>
                <div className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/20 rounded-lg text-sm font-medium text-on-surface opacity-60">
                  {user?.email || "N/A"}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
