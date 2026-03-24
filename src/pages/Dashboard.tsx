import React, { useState, useEffect } from "react";
import { db, auth, OperationType, handleFirestoreError } from "../firebase";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { ScanRecord } from "../types";
import { ShieldCheck, ShieldAlert, ShieldEllipsis, TrendingUp, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";

export default function Dashboard() {
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    blocked: 0,
    safe: 0
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const scansRef = collection(db, "scans");
    const q = query(
      scansRef,
      where("userId", "==", auth.currentUser.uid),
      orderBy("timestamp", "desc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScanRecord));
      setRecentScans(scans);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "scans");
    });

    // Stats query (simplified for demo, in real app use aggregation or separate counter)
    const statsQ = query(scansRef, where("userId", "==", auth.currentUser.uid));
    const unsubscribeStats = onSnapshot(statsQ, (snapshot) => {
      const allScans = snapshot.docs.map(doc => doc.data() as ScanRecord);
      setStats({
        total: allScans.length,
        blocked: allScans.filter(s => s.status === "MALICIOUS").length,
        safe: allScans.filter(s => s.status === "SAFE").length
      });
    });

    return () => {
      unsubscribe();
      unsubscribeStats();
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8 md:mb-12 px-4 md:px-0">
        <h1 className="text-3xl md:text-4xl font-bold font-headline tracking-tight text-on-surface mb-2">Security Overview</h1>
        <p className="text-on-surface-variant text-base md:text-lg leading-relaxed">Real-time monitoring of your digital perimeter and QR authentication sequences.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12 px-4 md:px-0">
        <div className="bg-white p-6 md:p-8 rounded-xl border-l-4 border-[#006879] shadow-sm">
          <span className="text-[10px] md:text-xs font-bold text-[#006879] uppercase tracking-widest mb-2 md:mb-4 block">Total Scans</span>
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-on-surface">{stats.total.toLocaleString()}</h2>
          <div className="flex items-center gap-2 mt-4 text-emerald-600">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] md:text-xs font-bold font-headline">+12% vs last month</span>
          </div>
        </div>
        <div className="bg-white p-6 md:p-8 rounded-xl border-l-4 border-error shadow-sm">
          <span className="text-[10px] md:text-xs font-bold text-error uppercase tracking-widest mb-2 md:mb-4 block">Blocked Threats</span>
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-on-surface">{stats.blocked.toLocaleString()}</h2>
          <div className="flex items-center gap-2 mt-4 text-error">
            <ShieldAlert className="w-4 h-4" />
            <span className="text-[10px] md:text-xs font-bold font-headline">Active Perimeter Shield</span>
          </div>
        </div>
        <div className="bg-white p-6 md:p-8 rounded-xl border-l-4 border-[#10B981] shadow-sm sm:col-span-2 lg:col-span-1">
          <span className="text-[10px] md:text-xs font-bold text-[#10B981] uppercase tracking-widest mb-2 md:mb-4 block">Verified Safe</span>
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-on-surface">{stats.safe.toLocaleString()}</h2>
          <div className="flex items-center gap-2 mt-4 text-[#006879]">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] md:text-xs font-bold font-headline">98.9% Success Rate</span>
          </div>
        </div>
      </div>

      <div className="mt-8 md:mt-12 px-4 md:px-0">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold font-headline tracking-tight">Recent Activity</h2>
          <Link to="/history" className="text-[#006879] font-bold font-label text-[10px] md:text-xs uppercase tracking-widest hover:underline">View All Records</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {recentScans.length > 0 ? (
            recentScans.map((scan) => (
              <Link 
                key={scan.id} 
                to={`/analysis/${scan.id}`}
                className={cn(
                  "bg-white p-6 rounded-2xl shadow-sm border-l-4 flex items-start justify-between group hover:shadow-md transition-all",
                  scan.status === "SAFE" ? "border-[#10B981]" : scan.status === "MALICIOUS" ? "border-error" : "border-warning"
                )}
              >
                <div>
                  <div className="text-[10px] font-bold text-outline uppercase mb-1">
                    {new Date(scan.timestamp?.toDate()).toLocaleTimeString()} • ID: {scan.id.slice(-5)}
                  </div>
                  <h5 className="font-bold text-on-surface mb-1 truncate max-w-[150px]">{scan.source || "Unknown Source"}</h5>
                  <p className="text-xs text-on-surface-variant truncate max-w-[150px]">{scan.url}</p>
                </div>
                {scan.status === "SAFE" ? (
                  <ShieldCheck className="text-[#10B981] w-5 h-5" />
                ) : scan.status === "MALICIOUS" ? (
                  <ShieldAlert className="text-error w-5 h-5" />
                ) : (
                  <ShieldEllipsis className="text-warning w-5 h-5" />
                )}
              </Link>
            ))
          ) : (
            <div className="col-span-full py-12 text-center bg-white rounded-2xl border-2 border-dashed border-outline-variant/20">
              <Activity className="w-12 h-12 text-outline mx-auto mb-4 opacity-20" />
              <p className="text-on-surface-variant">No recent scans detected. Start scanning to see activity.</p>
              <Link to="/scanner" className="mt-4 inline-block text-[#006879] font-bold">Go to Scanner</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
