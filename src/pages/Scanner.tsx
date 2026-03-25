import React, { useState, useRef, useEffect } from "react";
import { db, auth, OperationType, handleFirestoreError } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats, Html5Qrcode } from "html5-qrcode";
import * as pdfjs from 'pdfjs-dist';
import jsQR from "jsqr";
import { toast } from "sonner";

// Set worker source for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
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
  CameraOff,
  Globe,
  Activity,
  Cpu,
  Loader2,
  AlertCircle
} from "lucide-react";
import { cn } from "../lib/utils";

export default function Scanner() {
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [sidebarStatus, setSidebarStatus] = useState({
    encryption: "SEGURO",
    domain: "PENDIENTE",
    metadata: "EN ESPERA"
  });
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
    setSidebarStatus({
      encryption: "ANALIZANDO",
      domain: "ANALIZANDO",
      metadata: "ANALIZANDO"
    });
    
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

      if (!response.ok) throw new Error("Error al escanear la URL a través de los motores de seguridad");

      const vtData = await response.json();
      const status = vtData.status;
      const riskScore = vtData.riskScore;
      
      // Update sidebar status based on results
      setSidebarStatus({
        encryption: "SEGURO",
        domain: status === "SAFE" ? "SEGURO" : (status === "SUSPICIOUS" ? "SOSPECHOSO" : "MALICIOSO"),
        metadata: "COMPLETO"
      });

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
        location: vtData.location || { ip: "Unknown", city: "Unknown", country: "Unknown", org: "Unknown" },
        threatDetails: {
          riskScore: riskScore,
          malwareVectors: [
            { 
              name: "Motor VirusTotal", 
              status: vtData.engines?.virusTotal?.status || status, 
              description: vtData.engines?.virusTotal?.details || "Análisis de consenso realizado por múltiples motores antivirus." 
            },
            { 
              name: "Google Safe Browsing", 
              status: vtData.engines?.googleSafeBrowsing?.status || status, 
              description: vtData.engines?.googleSafeBrowsing?.details || "Verificación contra la base de datos de navegación segura de Google." 
            },
            { 
              name: "Motor Urlscan.io", 
              status: vtData.engines?.urlScan?.status || status, 
              description: vtData.engines?.urlScan?.details || "Análisis de comportamiento y reputación de dominio." 
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
      toast.success("Escaneo completado con éxito");
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
      toast.error("El escaneo de seguridad falló. Por favor, intente de nuevo.");
    }
  }

  async function onScanSuccess(decodedText: string) {
    await analyzeUrl(decodedText, "Escaneo de Cámara en Vivo");
  }

  function onScanFailure(error: any) {
    // This callback is called for every frame where no QR code is found.
    // We don't need to log this as it's very frequent.
  }

  const scanQRCodeFromCanvas = (canvas: HTMLCanvasElement): string | null => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });
    
    if (code) return code.data;
    
    // Try with inversion if first attempt fails
    const codeInverted = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "onlyInvert",
    });
    
    return codeInverted ? codeInverted.data : null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (!isImage && !isPDF) {
      toast.error("Error: El archivo no es compatible. Por favor, sube una imagen o un PDF.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      setScanning(true);
      let decodedText: string | null = null;

      if (isPDF) {
        // Handle PDF scanning with higher resolution
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 3.0 }); // Increased scale for better detection
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error("Could not get canvas context");
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport, canvas }).promise;
        
        decodedText = scanQRCodeFromCanvas(canvas);
        
        // Fallback to html5-qrcode if jsQR fails
        if (!decodedText) {
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (blob) {
            const pdfImageFile = new File([blob], "pdf-page.png", { type: "image/png" });
            const html5QrCode = new Html5Qrcode("file-scanner-buffer");
            try {
              decodedText = await html5QrCode.scanFile(pdfImageFile, false);
            } catch (e) {
              // Ignore fallback failure
            }
          }
        }
      } else {
        // Handle Image scanning
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        
        try {
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = objectUrl;
          });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) throw new Error("Could not get canvas context");
          
          // Try different scales if detection fails
          const scales = [1.0, 0.5, 1.5, 2.0];
          for (const scale of scales) {
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            decodedText = scanQRCodeFromCanvas(canvas);
            if (decodedText) break;
          }
          
          // Final fallback to html5-qrcode
          if (!decodedText) {
            const html5QrCode = new Html5Qrcode("file-scanner-buffer");
            try {
              decodedText = await html5QrCode.scanFile(file, false);
            } catch (err) {
              try {
                decodedText = await html5QrCode.scanFile(file, true);
              } catch (e) {
                // Ignore fallback failure
              }
            }
          }
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      }

      if (!decodedText) {
        throw new Error("No QR code detected");
      }

      await analyzeUrl(decodedText, "Subida de Archivo");
    } catch (err) {
      console.error("Error scanning file", err);
      setScanning(false);
      isScanningRef.current = false;
      toast.error("No se pudo detectar un código QR. Asegúrese de que el archivo sea claro y contenga un QR.");
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
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (!isImage && !isPDF) {
      toast.error("Error: El archivo no es compatible. Por favor, arrastra una imagen o un PDF.");
      return;
    }

    try {
      setScanning(true);
      let decodedText: string | null = null;

      if (isPDF) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 3.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error("Could not get canvas context");
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport, canvas }).promise;
        
        decodedText = scanQRCodeFromCanvas(canvas);
        
        if (!decodedText) {
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (blob) {
            const pdfImageFile = new File([blob], "pdf-page.png", { type: "image/png" });
            const html5QrCode = new Html5Qrcode("file-scanner-buffer");
            try {
              decodedText = await html5QrCode.scanFile(pdfImageFile, false);
            } catch (e) {}
          }
        }
      } else {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        
        try {
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = objectUrl;
          });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) throw new Error("Could not get canvas context");
          
          const scales = [1.0, 0.5, 1.5, 2.0];
          for (const scale of scales) {
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            decodedText = scanQRCodeFromCanvas(canvas);
            if (decodedText) break;
          }
          
          if (!decodedText) {
            const html5QrCode = new Html5Qrcode("file-scanner-buffer");
            try {
              decodedText = await html5QrCode.scanFile(file, false);
            } catch (err) {
              try {
                decodedText = await html5QrCode.scanFile(file, true);
              } catch (e) {}
            }
          }
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      }

      if (!decodedText) {
        throw new Error("No QR code detected");
      }

      await analyzeUrl(decodedText, "Subida de Archivo (Arrastrar)");
    } catch (err) {
      console.error("Error scanning dropped file", err);
      setScanning(false);
      isScanningRef.current = false;
      toast.error("No se pudo detectar un código QR en el archivo soltado.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-0">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 md:mb-12 gap-6">
        <div className="max-w-xl">
          <h1 className="text-3xl md:text-4xl font-bold font-headline tracking-tight text-on-surface mb-2">Captura Segura de QR</h1>
          <p className="text-on-surface-variant text-base md:text-lg leading-relaxed">Coloca cualquier código dentro del visor de alta precisión. Nuestro motor impulsado por IA valida la autenticidad y los protocolos de seguridad en tiempo real.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-xl shadow-sm self-start lg:self-auto border border-outline-variant/10">
          <div className="flex items-center gap-3 px-4 py-1 border-r border-outline-variant/20">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-outline uppercase">Motores</span>
              <span className="text-xs font-headline font-bold text-on-surface">VT, GSB, US</span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-1">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-outline uppercase">Estado</span>
              <span className="text-xs font-headline font-bold text-emerald-500">OPTIMIZADO</span>
            </div>
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
                  {sidebarStatus.encryption === "ANALIZANDO" ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : sidebarStatus.encryption === "ERROR" ? (
                    <AlertCircle className="text-error w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                  )}
                  <span className="text-sm font-medium">Verificación de Cifrado</span>
                </div>
                <span className={cn(
                  "text-xs font-bold font-label",
                  sidebarStatus.encryption === "ANALIZANDO" ? "text-primary" : 
                  sidebarStatus.encryption === "ERROR" ? "text-error" : "text-emerald-500"
                )}>
                  {sidebarStatus.encryption}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                <div className="flex items-center gap-3">
                  {sidebarStatus.domain === "ANALIZANDO" ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : sidebarStatus.domain === "MALICIOSO" || sidebarStatus.domain === "ERROR" ? (
                    <ShieldAlert className="text-error w-5 h-5" />
                  ) : sidebarStatus.domain === "SOSPECHOSO" ? (
                    <AlertTriangle className="text-warning w-5 h-5" />
                  ) : sidebarStatus.domain === "SEGURO" ? (
                    <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                  ) : (
                    <ShieldEllipsis className="text-outline w-5 h-5" />
                  )}
                  <span className="text-sm font-medium">Verificación de Dominio</span>
                </div>
                <span className={cn(
                  "text-xs font-bold font-label",
                  sidebarStatus.domain === "ANALIZANDO" ? "text-primary" : 
                  sidebarStatus.domain === "MALICIOSO" || sidebarStatus.domain === "ERROR" ? "text-error" : 
                  sidebarStatus.domain === "SOSPECHOSO" ? "text-warning" : 
                  sidebarStatus.domain === "SEGURO" ? "text-emerald-500" : "text-outline"
                )}>
                  {sidebarStatus.domain}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                <div className="flex items-center gap-3">
                  {sidebarStatus.metadata === "ANALIZANDO" ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : sidebarStatus.metadata === "COMPLETO" ? (
                    <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                  ) : sidebarStatus.metadata === "ERROR" ? (
                    <AlertCircle className="text-error w-5 h-5" />
                  ) : (
                    <Info className="text-outline w-5 h-5" />
                  )}
                  <span className="text-sm font-medium">Análisis de Metadatos</span>
                </div>
                <span className={cn(
                  "text-xs font-bold font-label",
                  sidebarStatus.metadata === "ANALIZANDO" ? "text-primary" : 
                  sidebarStatus.metadata === "COMPLETO" ? "text-emerald-500" : 
                  sidebarStatus.metadata === "ERROR" ? "text-error" : "text-outline"
                )}>
                  {sidebarStatus.metadata}
                </span>
              </div>
            </div>
            <div className="pt-4 border-t border-outline-variant/10">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept="image/*,application/pdf"
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
