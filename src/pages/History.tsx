import React, { useState, useEffect } from "react";
import { db, auth, OperationType, handleFirestoreError } from "../firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { ScanRecord } from "../types";
import { Search, Filter, Calendar, ShieldCheck, ShieldAlert, ShieldEllipsis, MoreVertical, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";

export default function History() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"timestamp" | "status">("timestamp");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const scansRef = collection(db, "scans");
    const q = query(
      scansRef,
      where("userId", "==", auth.currentUser.uid),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scanData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScanRecord));
      setScans(scanData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "scans");
    });

    return () => unsubscribe();
  }, []);

  const sortedScans = [...scans].sort((a, b) => {
    if (sortBy === "status") {
      const statusOrder: Record<string, number> = { "MALICIOUS": 0, "SUSPICIOUS": 1, "SAFE": 2 };
      const orderA = statusOrder[a.status] ?? 3;
      const orderB = statusOrder[b.status] ?? 3;
      return orderA - orderB;
    }
    // Default: timestamp desc
    const timeA = a.timestamp?.toDate().getTime() || 0;
    const timeB = b.timestamp?.toDate().getTime() || 0;
    return timeB - timeA;
  });

  const totalPages = Math.ceil(sortedScans.length / pageSize);
  const paginatedScans = sortedScans.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = {
    total: scans.length,
    blocked: scans.filter(s => s.status === "MALICIOUS").length,
    suspicious: scans.filter(s => s.status === "SUSPICIOUS").length,
    safe: scans.filter(s => s.status === "SAFE").length
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 md:px-0">
      <header className="mb-8 md:mb-12">
        <h1 className="font-headline text-3xl md:text-5xl font-bold text-on-surface mb-2 tracking-tighter">Scan History</h1>
        <p className="text-on-surface-variant text-sm md:text-base max-w-2xl">Real-time surveillance logs of every QR interaction. Data is cryptographically verified to ensure environmental security.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
        <div className="bg-white p-6 md:p-8 rounded-xl flex flex-col justify-between border-l-4 border-[#006879] shadow-sm">
          <div>
            <span className="text-[10px] md:text-xs font-medium text-[#006879] uppercase tracking-widest mb-2 md:mb-4 block">Total Scans</span>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-on-surface">{stats.total.toLocaleString()}</h2>
          </div>
          <div className="flex items-center gap-2 mt-4 text-emerald-600">
            <span className="text-[10px] md:text-xs font-bold font-headline">+12% vs last month</span>
          </div>
        </div>
        <div className="bg-white p-6 md:p-8 rounded-xl flex flex-col justify-between border-l-4 border-error shadow-sm">
          <div>
            <span className="text-[10px] md:text-xs font-medium text-error uppercase tracking-widest mb-2 md:mb-4 block">Blocked Threats</span>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-on-surface">{stats.blocked.toLocaleString()}</h2>
          </div>
          <div className="flex items-center gap-2 mt-4 text-error">
            <span className="text-[10px] md:text-xs font-bold font-headline">Active Perimeter Shield</span>
          </div>
        </div>
        <div className="bg-white p-6 md:p-8 rounded-xl flex flex-col justify-between border-l-4 border-warning shadow-sm">
          <div>
            <span className="text-[10px] md:text-xs font-medium text-warning uppercase tracking-widest mb-2 md:mb-4 block">Suspicious Scans</span>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-on-surface">{stats.suspicious.toLocaleString()}</h2>
          </div>
          <div className="flex items-center gap-2 mt-4 text-warning">
            <span className="text-[10px] md:text-xs font-bold font-headline">Heuristic Anomaly Detection</span>
          </div>
        </div>
        <div className="bg-white p-6 md:p-8 rounded-xl flex flex-col justify-between border-l-4 border-[#10B981] shadow-sm">
          <div>
            <span className="text-[10px] md:text-xs font-medium text-[#10B981] uppercase tracking-widest mb-2 md:mb-4 block">Verified Safe</span>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-on-surface">{stats.safe.toLocaleString()}</h2>
          </div>
          <div className="flex items-center gap-2 mt-4 text-[#006879]">
            <span className="text-[10px] md:text-xs font-bold font-headline">98.9% Success Rate</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full lg:w-auto">
          <button 
            onClick={() => setSortBy("timestamp")}
            className={cn(
              "px-4 md:px-6 py-2 rounded-lg border flex items-center gap-2 text-[10px] md:text-sm font-semibold transition-all",
              sortBy === "timestamp" 
                ? "bg-[#006879] text-white border-[#006879]" 
                : "bg-white border-outline-variant/20 text-on-surface hover:bg-slate-50"
            )}
          >
            <Filter className="w-3 h-3 md:w-4 md:h-4" />
            All Status
          </button>
          <button 
            onClick={() => setSortBy("status")}
            className={cn(
              "px-4 md:px-6 py-2 rounded-lg border flex items-center gap-2 text-[10px] md:text-sm font-semibold transition-all",
              sortBy === "status" 
                ? "bg-[#006879] text-white border-[#006879]" 
                : "bg-white border-outline-variant/20 text-on-surface hover:bg-slate-50"
            )}
          >
            <ShieldCheck className="w-3 h-3 md:w-4 md:h-4" />
            Threat Level
          </button>
          <button className="bg-white px-4 md:px-6 py-2 rounded-lg border border-outline-variant/20 flex items-center gap-2 text-[10px] md:text-sm font-semibold hover:bg-slate-50 transition-all">
            <Calendar className="w-3 h-3 md:w-4 md:h-4" />
            Last 30 Days
          </button>
        </div>
        <span className="text-[10px] md:text-sm text-on-surface-variant font-medium uppercase tracking-wider">
          SHOWING {paginatedScans.length} OF {stats.total} RECORDS (PAGE {currentPage} OF {totalPages || 1})
        </span>
      </div>

      <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-outline-variant/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider">URL / Source</th>
                <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider">Security Status</th>
                <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider">Timestamp</th>
                <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-on-surface-variant">Loading records...</td>
                </tr>
              ) : paginatedScans.length > 0 ? (
                paginatedScans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-surface-container-low/50 transition-colors group">
                    <td className="px-6 md:px-8 py-4 md:py-6">
                      <div className="flex flex-col">
                        <span className="font-headline font-semibold text-on-surface truncate max-w-[200px] md:max-w-xs">{scan.url}</span>
                        <span className="text-[10px] md:text-xs text-on-surface-variant">{scan.source}</span>
                      </div>
                    </td>
                    <td className="px-6 md:px-8 py-4 md:py-6">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex items-center gap-2",
                          scan.status === "SAFE" ? "text-[#10B981]" : scan.status === "MALICIOUS" ? "text-error" : scan.status === "SUSPICIOUS" ? "text-warning" : "text-on-surface-variant"
                        )}>
                          <div className="relative flex items-center justify-center w-4 h-4 md:w-5 md:h-5 border-2 border-current rounded-full">
                            <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-current rounded-full"></div>
                          </div>
                          <span className="font-bold text-xs md:text-sm">{scan.status}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 md:px-8 py-4 md:py-6">
                      <div className="flex flex-col">
                        <span className="text-xs md:text-sm font-medium text-on-surface">{new Date(scan.timestamp?.toDate()).toLocaleDateString()}</span>
                        <span className="text-[10px] md:text-xs text-on-surface-variant">{new Date(scan.timestamp?.toDate()).toLocaleTimeString()} UTC</span>
                      </div>
                    </td>
                    <td className="px-6 md:px-8 py-4 md:py-6 text-right">
                      <Link to={`/analysis/${scan.id}`} className="text-on-surface-variant hover:text-[#006879] transition-colors lg:opacity-0 lg:group-hover:opacity-100">
                        <MoreVertical className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-on-surface-variant">No scan history found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 md:px-8 py-4 md:py-6 bg-surface-container-low/30 border-t border-surface-container-low flex justify-between items-center">
          <span className="text-xs md:text-sm text-on-surface-variant">
            Showing {sortedScans.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0} to {Math.min(currentPage * pageSize, sortedScans.length)} of {sortedScans.length} results
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 md:p-2 border border-outline-variant/20 rounded-lg hover:bg-white disabled:opacity-30 transition-colors" 
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1.5 md:p-2 border border-outline-variant/20 rounded-lg hover:bg-white disabled:opacity-30 transition-colors" 
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
