import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { 
  LayoutDashboard, 
  QrCode, 
  History, 
  Settings, 
  Search, 
  UserCircle, 
  ShieldCheck,
  ShieldAlert,
  LogOut,
  FileUp,
  ShieldCheck as ShieldIcon
} from "lucide-react";
import { cn } from "../lib/utils";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
        }
      }
    };
    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Scanner", path: "/scanner", icon: QrCode },
    { name: "History", path: "/history", icon: History },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  const scannerTools = [
    { name: "Live Scanner", path: "/scanner", icon: QrCode, active: location.pathname === "/scanner" },
    { name: "Batch Upload", path: "#", icon: FileUp, active: false },
  ];

  return (
    <div className="bg-background text-on-surface font-body antialiased min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm fixed top-0 w-full z-50 h-20 flex justify-between items-center px-4 md:px-8">
        <div className="flex items-center gap-4 md:gap-8">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <QrCode className="w-6 h-6 text-[#006879]" />
          </button>
          <Link to="/" className="text-xl md:text-2xl font-bold text-[#006879] dark:text-[#00B8D4] font-headline tracking-tight">CyberQR</Link>
          <nav className="hidden md:flex items-center space-x-8 font-headline font-semibold tracking-tight">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "transition-colors pb-1",
                  location.pathname === item.path 
                    ? "text-[#006879] dark:text-[#00B8D4] border-b-2 border-[#00B8D4]" 
                    : "text-slate-500 dark:text-slate-400 hover:text-[#006879]"
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
            <input 
              className="bg-surface-container-highest border-none rounded-lg px-4 py-2 pl-10 text-sm focus:ring-0 focus:bg-white transition-all w-64 border-b-2 border-transparent focus:border-primary" 
              placeholder="Search logs..." 
              type="text"
            />
          </div>
          <div className="relative group">
            <button className="p-2 hover:bg-slate-50 rounded-full transition-colors">
              {auth.currentUser?.photoURL ? (
                <img src={auth.currentUser.photoURL} alt="User" className="w-8 h-8 rounded-full" />
              ) : (
                <UserCircle className="text-outline w-8 h-8" />
              )}
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <div className="p-4 border-b border-slate-100">
                <p className="text-sm font-bold truncate">{auth.currentUser?.displayName}</p>
                <p className="text-xs text-slate-500 truncate">{auth.currentUser?.email}</p>
              </div>
              <button 
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 p-4 text-sm text-error hover:bg-slate-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <span className="text-xl font-bold text-[#006879] font-headline">CyberQR</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1">
                <LogOut className="w-5 h-5 rotate-180" />
              </button>
            </div>
            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                    location.pathname === item.path 
                      ? "bg-[#00B8D4] text-white" 
                      : "text-on-surface-variant hover:bg-surface-container-low"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
            </nav>
            <div className="mt-8 pt-8 border-t border-outline-variant/10">
              <div className="px-4 py-2 text-xs font-bold text-outline uppercase tracking-widest mb-2">Scanner Tools</div>
              {scannerTools.map((tool) => (
                <Link
                  key={tool.name}
                  to={tool.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                    tool.active 
                      ? "bg-[#00B8D4]/10 text-[#006879] font-bold" 
                      : "text-on-surface-variant hover:bg-surface-container-low"
                  )}
                >
                  <tool.icon className="w-5 h-5" />
                  <span>{tool.name}</span>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      )}

      <div className="pt-20 flex flex-grow">
        {/* Sidebar Navigation (Desktop) */}
        <aside className="w-64 bg-surface-container-low hidden md:flex flex-col p-6 fixed h-[calc(100vh-80px)]">
          <div className="space-y-1">
            <div className="px-3 py-2 text-xs font-bold text-outline uppercase tracking-widest mb-2 font-label">Scanner Tools</div>
            {scannerTools.map((tool) => (
              <Link
                key={tool.name}
                to={tool.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg transition-all",
                  tool.active 
                    ? "bg-[#00B8D4] text-white font-medium" 
                    : "text-on-surface-variant hover:bg-white"
                )}
              >
                <tool.icon className={cn("w-5 h-5", tool.active && "fill-current")} />
                <span>{tool.name}</span>
              </Link>
            ))}
          </div>
          <div className="mt-auto p-4 bg-white rounded-xl shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex items-center justify-center w-6 h-6 border-2 border-[#00B8D4] rounded-full">
                <div className="w-2 h-2 bg-[#00B8D4] rounded-full"></div>
              </div>
              <span className="text-sm font-semibold font-headline">System Online</span>
            </div>
            <div className="text-[10px] text-outline uppercase font-bold tracking-tighter mb-1">Encrypted Tunnel</div>
            <div className="h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full bg-[#00B8D4] w-[85%]"></div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 md:ml-64 p-8 bg-background">
          <Outlet />
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row justify-between items-center w-full px-8 py-12 max-w-full relative z-10">
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-2">
            <span className="text-lg font-bold text-slate-900 dark:text-white font-headline">CyberQR Enterprise</span>
            <span className="text-slate-600 dark:text-slate-400 font-body text-sm">© 2024 CyberQR Enterprise. All rights reserved.</span>
          </div>
          <div className="flex gap-8">
            <a className="text-slate-600 dark:text-slate-400 hover:text-[#00B8D4] transition-all font-body text-sm" href="#">Privacy Policy</a>
            <a className="text-slate-600 dark:text-slate-400 hover:text-[#00B8D4] transition-all font-body text-sm" href="#">Documentation</a>
            <a className="text-slate-600 dark:text-slate-400 hover:text-[#00B8D4] transition-all font-body text-sm" href="#">Support Center</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
