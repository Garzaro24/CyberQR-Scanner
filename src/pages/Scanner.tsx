import React, { useState, useRef, useEffect } from "react";
import { db, auth, OperationType, handleFirestoreError } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { 
  ShieldCheck, 
  ShieldAlert, 
  ShieldEllipsis, 
  Maximize, 
  Scan, 
  Sun, 
  Upload, 
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info
} from "lucide-react";
import { cn } from "../lib/utils";

export default function Scanner() {
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleCapture = async () => {
    if (!auth.currentUser) return;
    setScanning(true);

    // Simulate AI analysis delay
    setTimeout(async () => {
      try {
        const statuses: ("SAFE" | "MALICIOUS" | "SUSPICIOUS")[] = ["SAFE", "MALICIOUS", "SUSPICIOUS"];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        const scanData = {
          userId: auth.currentUser.uid,
          url: "https://secure-auth-login.web-verify-302.com/redirect?session=8291-xka-992",
          source: "Production Hub URL",
          status: randomStatus,
          timestamp: serverTimestamp(),
          threatDetails: {
            riskScore: randomStatus === "SAFE" ? 5 : randomStatus === "MALICIOUS" ? 98 : 45,
            malwareVectors: [
              { name: "JS.Redirector.Trojan", status: randomStatus === "MALICIOUS" ? "MALICIOUS" : "SAFE", description: "Injected script found in QR landing page." },
              { name: "C2 Exfiltration Hook", status: randomStatus === "MALICIOUS" ? "MALICIOUS" : "SAFE", description: "Encrypted outbound connection established." }
            ],
            riskFactors: {
              urlReputation: randomStatus === "SAFE" ? 10 : 95,
              payloadComplexity: randomStatus === "SAFE" ? 5 : 88,
              domainHealth: randomStatus === "SAFE" ? 90 : 42,
              latencyAnomaly: 12
            }
          }
        };

        const docRef = await addDoc(collection(db, "scans"), scanData);
        setScanComplete(true);
        setScanning(false);
        
        // Navigate to analysis after a brief success state
        setTimeout(() => {
          navigate(`/analysis/${docRef.id}`);
        }, 1500);

      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, "scans");
      }
    }, 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCapture();
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleCapture();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-0">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 md:mb-12 gap-6">
        <div className="max-w-xl">
          <h1 className="text-3xl md:text-4xl font-bold font-headline tracking-tight text-on-surface mb-2">Secure QR Intake</h1>
          <p className="text-on-surface-variant text-base md:text-lg leading-relaxed">Position any code within the high-precision viewfinder. Our AI-driven engine validates authenticity and security protocols in real-time.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm self-start lg:self-auto">
          <div className="px-4 py-2 border-r border-outline-variant/20">
            <span className="block text-[10px] font-bold text-outline uppercase">Latency</span>
            <span className="text-base md:text-lg font-headline font-bold text-[#006879]">12ms</span>
          </div>
          <div className="px-4 py-2">
            <span className="block text-[10px] font-bold text-outline uppercase">Engine</span>
            <span className="text-base md:text-lg font-headline font-bold text-[#006879]">v4.2-Pro</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div 
          className={cn(
            "lg:col-span-8 relative group transition-all",
            isDragging && "scale-[1.02]"
          )}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div className={cn(
            "aspect-square md:aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-xl border-4 relative transition-colors",
            isDragging ? "border-[#00B8D4]" : "border-white"
          )}>
            <img 
              className="w-full h-full object-cover opacity-40 mix-blend-overlay" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBHazR0Ovw6XgZCAUT_dpTmlG4eGO5zmVNP58mk9xnw9xs-_GQQrTzibvH1VHhr6YjXepkkjcrvQojUE6RZf4EbEvE0DA1QqhOK8wNvNK14GoiqcQPJY4jywk_LI-HLL3VI8KY_xF4tIBOsg7KFstFPRCBQE00DRBVEJVq4YztCpLTeCIBa8PdiDHuy1bjjy-SoCIGcFbXhVGVDqnAkYMh45D6D5S4pBnG6lktyuhzRcrB1pdl5cdBkPKTBViSCPBjJiuaOuuIS6x4"
              alt="Scanner Background"
            />
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 md:w-64 md:h-64 border-2 border-[#00B8D4]/50 rounded-3xl flex items-center justify-center relative">
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-[#00B8D4] rounded-tl-lg"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-[#00B8D4] rounded-tr-lg"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-[#00B8D4] rounded-bl-lg"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-[#00B8D4] rounded-br-lg"></div>
                
                {scanning && (
                  <div className="w-[90%] h-[2px] bg-[#00B8D4] shadow-[0_0_15px_#00B8D4] absolute top-1/4 animate-scan"></div>
                )}
                <Scan className={cn("text-[#00B8D4] w-12 h-12 md:w-16 md:h-16 transition-opacity", isDragging ? "opacity-100" : "opacity-30")} />
                {isDragging && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#00B8D4]/20 backdrop-blur-sm rounded-3xl">
                    <span className="text-white font-bold text-sm uppercase tracking-widest">Drop QR to Scan</span>
                  </div>
                )}
              </div>
            </div>

            <div className="absolute top-4 md:top-6 left-4 md:left-6 right-4 md:right-6 flex justify-between items-start">
              <div className="bg-white/70 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2 rounded-lg border border-white/20 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", scanning ? "bg-warning animate-pulse" : "bg-emerald-500")}></div>
                  <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase font-label text-slate-900">
                    {scanning ? "AI Analysis in Progress" : "Live Feed Active"}
                  </span>
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2 rounded-lg border border-white/20 shadow-lg hidden sm:block">
                <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase font-label text-slate-900">4K Precision Mode</span>
              </div>
            </div>

            <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 md:gap-4 w-full justify-center px-4">
              <button className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all border border-white/10 shrink-0">
                <Maximize className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button 
                onClick={handleCapture}
                disabled={scanning || scanComplete}
                className={cn(
                  "flex-1 max-w-[200px] py-2.5 md:py-3 rounded-full font-headline font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg transition-all",
                  scanComplete ? "bg-emerald-500 text-white" : "bg-[#00B8D4] text-white hover:scale-105 active:scale-95"
                )}
              >
                {scanning ? (
                  <Zap className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                ) : scanComplete ? (
                  <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                ) : (
                  <Scan className="w-4 h-4 md:w-5 md:h-5" />
                )}
                {scanning ? "ANALYZING..." : scanComplete ? "SECURE" : "CAPTURE"}
              </button>
              <button className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all border border-white/10 shrink-0">
                <Sun className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col gap-6">
            <h3 className="font-headline font-bold text-lg text-on-surface">Security Profile</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                  <span className="text-sm font-medium">Encryption Check</span>
                </div>
                <span className="text-xs font-bold font-label text-emerald-500">SECURE</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-warning w-5 h-5" />
                  <span className="text-sm font-medium">Domain Verification</span>
                </div>
                <span className="text-xs font-bold font-label text-warning">PENDING</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                <div className="flex items-center gap-3">
                  <Info className="text-[#006879] w-5 h-5" />
                  <span className="text-sm font-medium">Metadata Analysis</span>
                </div>
                <span className="text-xs font-bold font-label text-[#006879]">STANDBY</span>
              </div>
            </div>
            <div className="pt-4 border-t border-outline-variant/10">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept="image/*"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 border-2 border-outline-variant/20 rounded-xl text-outline font-headline font-bold hover:bg-surface-container-low hover:text-[#006879] transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                UPLOAD FILE INSTEAD
              </button>
            </div>
          </div>

          <div className="bg-[#006879] p-6 rounded-2xl text-white relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="font-headline font-bold text-lg mb-2">Pro Tip: Dark Mode Codes</h4>
              <p className="text-sm text-[#a8edff] leading-relaxed">Inverted QR codes are automatically detected and normalized by our scanner. No manual adjustment required.</p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 transform group-hover:scale-110 transition-transform">
              <Zap className="w-24 h-24" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
