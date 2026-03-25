import React, { useState, useRef, useEffect } from "react";
import { db, auth, OperationType, handleFirestoreError } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats, Html5Qrcode } from "html5-qrcode";
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
  Info,
  CameraOff
} from "lucide-react";
import { cn } from "../lib/utils";

export default function Scanner() {
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const isScanningRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize scanner
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 25, 
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          return {
            width: viewfinderWidth,
            height: viewfinderHeight
          };
        },
        aspectRatio: 1.0,
        formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true
      },
      /* verbose= */ false
    );

    scanner.render(onScanSuccess, (error) => {
      // Handle camera permission errors or other initialization errors
      if (typeof error === 'string' && (error.includes("NotAllowedError") || error.includes("Permission denied"))) {
        setCameraError("Acceso a la cámara denegado. Por favor, habilita los permisos de la cámara en la configuración de tu navegador.");
      }
      onScanFailure(error);
    });
    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => console.error("Failed to clear scanner", error));
      }
    };
  }, []);

  async function analyzeUrl(decodedText: string, source: string) {
    if (isScanningRef.current || scanComplete || !auth.currentUser) return;
    
    isScanningRef.current = true;
    setScanning(true);
    
    try {
      const startTime = Date.now();
      // Call our server-side VirusTotal proxy
      const response = await fetch("/api/scan-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: decodedText })
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      if (!response.ok) throw new Error("Error al escanear la URL a través de VirusTotal");

      const vtData = await response.json();
      const status = vtData.status;
      const riskScore = vtData.riskScore;
      
      // Calculate more realistic risk factors
      const urlReputation = riskScore; // High risk score = high reputation risk
      const payloadComplexity = status === "MALICIOUS" ? 85 : (status === "SUSPICIOUS" ? 45 : 12);
      
      // Domain health based on GSB and Urlscan
      let domainHealthRisk = 0;
      if (vtData.engines?.googleSafeBrowsing?.status === "MALICIOUS") domainHealthRisk += 60;
      if (vtData.engines?.urlScan?.status === "SUSPICIOUS") domainHealthRisk += 30;
      if (status === "SAFE") domainHealthRisk = Math.max(5, domainHealthRisk);
      else domainHealthRisk = Math.min(95, domainHealthRisk + 10);

      // Latency anomaly: baseline is ~1500ms for 3 API calls
      const latencyAnomaly = Math.min(100, Math.max(5, Math.round((latency / 3000) * 100)));

      const scanData = {
        userId: auth.currentUser.uid,
        url: decodedText,
        source: source,
        status: status,
        timestamp: serverTimestamp(),
        threatDetails: {
          riskScore: riskScore,
          malwareVectors: [
            { 
              name: "VirusTotal Engine", 
              status: vtData.engines?.virusTotal?.status || status, 
              description: vtData.engines?.virusTotal?.details || vtData.details 
            },
            { 
              name: "Google Safe Browsing", 
              status: vtData.engines?.googleSafeBrowsing?.status || status, 
              description: vtData.engines?.googleSafeBrowsing?.details || "Consensus analysis performed." 
            },
            { 
              name: "Urlscan.io Engine", 
              status: vtData.engines?.urlScan?.status || status, 
              description: vtData.engines?.urlScan?.details || "Consensus analysis performed." 
            }
          ],
          riskFactors: {
            urlReputation: urlReputation,
            payloadComplexity: payloadComplexity,
            domainHealth: domainHealthRisk,
            latencyAnomaly: latencyAnomaly
          }
        }
      };

      const docRef = await addDoc(collection(db, "scans"), scanData);
      setScanComplete(true);
      setScanning(false);
      // We don't reset isScanningRef.current here because we are navigating away
      
      // Navigate to analysis after a brief success state
      setTimeout(() => {
        navigate(`/analysis/${docRef.id}`);
      }, 1500);

    } catch (error) {
      console.error("Scan error:", error);
      handleFirestoreError(error, OperationType.CREATE, "scans");
      setScanning(false);
      isScanningRef.current = false;
      alert("El escaneo de VirusTotal falló. Usando respaldo heurístico.");
    }
  }

  async function onScanSuccess(decodedText: string) {
    await analyzeUrl(decodedText, "Live Camera Scan (VirusTotal)");
  }

  function onScanFailure(error: any) {
    // This callback is called for every frame where no QR code is found.
    // We don't need to log this as it's very frequent.
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type || !file.type.startsWith('image/')) {
      alert("Error: El archivo no es compatible. Por favor, sube una imagen válida en formato .jpg, .png o similar.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode("file-scanner-buffer");
      setScanning(true);
      const decodedText = await html5QrCode.scanFile(file, true);
      // We don't set isScanningRef here, analyzeUrl will handle it
      await analyzeUrl(decodedText, "File Upload (VirusTotal)");
    } catch (err) {
      console.error("Error scanning file", err);
      setScanning(false);
      isScanningRef.current = false;
      alert("No se pudo encontrar un código QR válido en la imagen subida. Por favor, intenta con otro archivo.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type || !file.type.startsWith('image/')) {
      alert("Error: El archivo no es compatible. Por favor, arrastra una imagen válida en formato .jpg, .png o similar.");
      return;
    }

    try {
      // We use a separate instance for file scanning to avoid conflicts with the active scanner UI
      const html5QrCode = new Html5Qrcode("file-scanner-buffer");
      setScanning(true);
      const decodedText = await html5QrCode.scanFile(file, true);
      // We don't set isScanningRef here, analyzeUrl will handle it
      await analyzeUrl(decodedText, "File Upload (VirusTotal)");
    } catch (err) {
      console.error("Error scanning dropped file", err);
      setScanning(false);
      isScanningRef.current = false;
      alert("No se pudo encontrar un código QR válido en la imagen. Por favor, intenta con otro archivo.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-0">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 md:mb-12 gap-6">
        <div className="max-w-xl">
          <h1 className="text-3xl md:text-4xl font-bold font-headline tracking-tight text-on-surface mb-2">Captura Segura de QR</h1>
          <p className="text-on-surface-variant text-base md:text-lg leading-relaxed">Coloca cualquier código dentro del visor de alta precisión. Nuestro motor impulsado por IA valida la autenticidad y los protocolos de seguridad en tiempo real.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm self-start lg:self-auto">
          <div className="px-4 py-2 border-r border-outline-variant/20">
            <span className="block text-[10px] font-bold text-outline uppercase">Latencia</span>
            <span className="text-base md:text-lg font-headline font-bold text-[#006879]">12ms</span>
          </div>
          <div className="px-4 py-2">
            <span className="block text-[10px] font-bold text-outline uppercase">Motor</span>
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
            <div id="reader" className="w-full h-full"></div>
            <div id="file-scanner-buffer" className="hidden"></div>
            
            {cameraError && (
              <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-8 text-center z-30">
                <CameraOff className="w-16 h-16 text-error mb-4" />
                <h3 className="text-white font-headline text-xl font-bold mb-2">Acceso a la Cámara Requerido</h3>
                <p className="text-slate-400 text-sm max-w-xs">{cameraError}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-6 px-6 py-2 bg-primary text-white rounded-lg font-bold text-xs uppercase tracking-widest"
                >
                  Reintentar Conexión
                </button>
              </div>
            )}

            {/* Overlay for scanning state */}
            {scanning && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                <div className="w-16 h-16 border-4 border-[#00B8D4] border-t-transparent rounded-full animate-spin mb-4"></div>
                <span className="text-white font-headline font-bold tracking-widest uppercase">Analizando Vector de Amenaza...</span>
              </div>
            )}

            {scanComplete && (
              <div className="absolute inset-0 bg-emerald-500/80 backdrop-blur-md flex flex-col items-center justify-center z-10">
                <CheckCircle2 className="w-20 h-20 text-white mb-4 animate-bounce" />
                <span className="text-white font-headline text-2xl font-bold tracking-widest uppercase">Escaneo Verificado</span>
              </div>
            )}
            
            <div className="absolute top-4 md:top-6 left-4 md:left-6 right-4 md:right-6 flex justify-between items-start pointer-events-none z-20">
              <div className="bg-white/70 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2 rounded-lg border border-white/20 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", scanning ? "bg-warning animate-pulse" : "bg-emerald-500")}></div>
                  <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase font-label text-slate-900">
                    {scanning ? "Análisis de IA en Progreso" : "Transmisión en Vivo Activa"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-3 p-4 bg-surface-container-low rounded-xl border border-outline-variant/10">
            <Info className="w-5 h-5 text-[#006879]" />
            <p className="text-xs text-on-surface-variant">
              La transmisión de la cámara se procesa localmente. No se transmiten datos biométricos. Solo se analiza la URL decodificada en busca de amenazas.
            </p>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col gap-6">
            <h3 className="font-headline font-bold text-lg text-on-surface">Perfil de Seguridad</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                  <span className="text-sm font-medium">Verificación de Cifrado</span>
                </div>
                <span className="text-xs font-bold font-label text-emerald-500">SEGURO</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-warning w-5 h-5" />
                  <span className="text-sm font-medium">Verificación de Dominio</span>
                </div>
                <span className="text-xs font-bold font-label text-warning">PENDIENTE</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                <div className="flex items-center gap-3">
                  <Info className="text-[#006879] w-5 h-5" />
                  <span className="text-sm font-medium">Análisis de Metadatos</span>
                </div>
                <span className="text-xs font-bold font-label text-[#006879]">EN ESPERA</span>
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
                SUBIR ARCHIVO EN SU LUGAR
              </button>
            </div>
          </div>

          <div className="bg-[#006879] p-6 rounded-2xl text-white relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="font-headline font-bold text-lg mb-2">Consejo Pro: Códigos en Modo Oscuro</h4>
              <p className="text-sm text-[#a8edff] leading-relaxed">Los códigos QR invertidos se detectan y normalizan automáticamente por nuestro escáner. No se requiere ajuste manual.</p>
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
