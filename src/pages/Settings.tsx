import React from "react";
import { auth } from "../firebase";
import { UserCircle, Mail, Shield, Calendar } from "lucide-react";

export default function Settings() {
  const user = auth.currentUser;

  return (
    <div className="max-w-4xl mx-auto w-full px-4 md:px-0">
      <header className="mb-8 md:mb-12">
        <h1 className="font-headline text-3xl md:text-5xl font-bold text-on-surface mb-2 tracking-tighter">System Configuration</h1>
        <p className="text-on-surface-variant text-sm md:text-base">Manage your operator profile and security clearance parameters.</p>
      </header>

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
            <button className="w-full md:w-auto px-6 py-2 bg-surface-container-low text-on-surface font-semibold rounded-lg hover:bg-surface-container-high transition-colors text-sm">
              Edit Profile
            </button>
          </div>

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
        </section>

        {/* Security Preferences */}
        <section className="bg-white rounded-xl p-6 md:p-8 border border-outline-variant/10 shadow-sm">
          <h3 className="font-headline text-lg md:text-xl font-bold mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Security Preferences
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-container-low/50 rounded-xl">
              <div className="space-y-1">
                <p className="font-bold text-sm md:text-base">Real-time Threat Interception</p>
                <p className="text-xs text-on-surface-variant">Automatically block domains with risk scores above 80.</p>
              </div>
              <div className="w-10 md:w-12 h-5 md:h-6 bg-primary rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-3 md:w-4 h-3 md:h-4 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-container-low/50 rounded-xl">
              <div className="space-y-1">
                <p className="font-bold text-sm md:text-base">AI Deep Analysis</p>
                <p className="text-xs text-on-surface-variant">Use Gemini Pro for advanced payload inspection.</p>
              </div>
              <div className="w-10 md:w-12 h-5 md:h-6 bg-primary rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-3 md:w-4 h-3 md:h-4 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-container-low/50 rounded-xl">
              <div className="space-y-1">
                <p className="font-bold text-sm md:text-base">Biometric Verification</p>
                <p className="text-xs text-on-surface-variant">Require fingerprint for critical domain whitelisting.</p>
              </div>
              <div className="w-10 md:w-12 h-5 md:h-6 bg-surface-container-highest rounded-full relative cursor-pointer">
                <div className="absolute left-1 top-1 w-3 md:w-4 h-3 md:h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Account Metadata */}
        <section className="bg-white rounded-xl p-6 md:p-8 border border-outline-variant/10 shadow-sm">
          <h3 className="font-headline text-lg md:text-xl font-bold mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Account Metadata
          </h3>
          <div className="p-4 bg-surface-container-low/50 rounded-xl">
            <div className="flex justify-between items-center">
              <p className="font-bold text-sm md:text-base text-on-surface">Account Created</p>
              <p className="text-xs md:text-sm text-on-surface-variant">{user?.metadata.creationTime}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
