import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth, OperationType, handleFirestoreError } from "../firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ScanRecord } from "../types";
import { ShieldAlert, ShieldCheck, ShieldEllipsis, Bug, Globe, Database, MapPin, Search, Activity } from "lucide-react";
import { cn } from "../lib/utils";

export default function ThreatAnalysis() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDone, setActionDone] = useState(false);

  useEffect(() => {
    const fetchScan = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "scans", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setScan({ id: docSnap.id, ...docSnap.data() } as ScanRecord);
        } else {
          navigate("/history");
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `scans/${id}`);
      } finally {
        setLoading(false);
      }
    };
    fetchScan();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!scan) return null;

  const isMalicious = scan.status === "MALICIOUS";
  const isSuspicious = scan.status === "SUSPICIOUS";

  const handleDomainAction = async () => {
    if (!scan || !auth.currentUser || actionLoading || actionDone) return;

    setActionLoading(true);
    try {
      let domain = "";
      try {
        const url = new URL(scan.url);
        domain = url.hostname;
      } catch (e) {
        // Fallback for non-standard URLs
        domain = scan.url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
      }

      const action = isMalicious ? "BLOCK" : "WHITELIST";

      await addDoc(collection(db, "domain_actions"), {
        userId: auth.currentUser.uid,
        domain,
        action,
        timestamp: serverTimestamp()
      });

      setActionDone(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "domain_actions");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-6">
        <div className="space-y-2">
          <div className={cn(
            "flex items-center gap-2 font-semibold",
            isMalicious ? "text-error" : isSuspicious ? "text-warning" : "text-emerald-500"
          )}>
            {isMalicious ? <ShieldAlert className="w-4 h-4" /> : isSuspicious ? <ShieldEllipsis className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            <span className="font-label uppercase tracking-widest text-[10px]">
              {isMalicious ? "Alerta de Seguridad Crítica" : isSuspicious ? "Advertencia de Seguridad" : "Verificación de Seguridad"}
            </span>
          </div>
          <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight text-on-surface">Informe de Análisis de Amenazas</h1>
          <p className="text-on-surface-variant text-sm md:text-base max-w-xl">
            {isMalicious 
              ? "La inspección profunda de la carga útil codificada en QR detectó secuencias de redirección maliciosas dirigidas a infraestructuras financieras."
              : isSuspicious
              ? "Riesgo potencial detectado en la secuencia de redirección. Se recomienda verificación manual."
              : "No se detectaron amenazas. La carga útil y el destino han sido verificados contra nuestra base de datos de seguridad global."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button 
            onClick={handleDomainAction}
            disabled={actionLoading || actionDone}
            className={cn(
              "flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 font-semibold rounded-md shadow-lg transition-all text-sm flex items-center justify-center gap-2",
              isMalicious 
                ? (actionDone ? "bg-slate-500 text-white" : "bg-error text-white shadow-error/20 hover:bg-error/90") 
                : (actionDone ? "bg-slate-500 text-white" : "bg-primary text-white shadow-primary/20 hover:bg-primary/90"),
              (actionLoading || actionDone) && "opacity-70 cursor-not-allowed"
            )}
          >
            {actionLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : actionDone ? (
              <>
                <ShieldCheck className="w-4 h-4" />
                {isMalicious ? "Dominio Bloqueado" : "Dominio en Lista Blanca"}
              </>
            ) : (
              isMalicious ? "Bloquear Dominio" : "Permitir Dominio"
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Risk Score Metric */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-xl p-6 md:p-8 flex flex-col items-center justify-center border border-outline-variant/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldAlert className="w-16 h-16 md:w-24 md:h-24" />
          </div>
          <span className="font-label uppercase tracking-tighter text-on-surface-variant mb-4 text-xs">Puntuación de Riesgo Acumulada</span>
          <div className="relative">
            <span className={cn(
              "font-headline text-[80px] md:text-[120px] font-bold leading-none tracking-tighter",
              isMalicious ? "text-error" : isSuspicious ? "text-warning" : "text-emerald-500"
            )}>
              {scan.threatDetails?.riskScore || 0}
            </span>
            <span className={cn(
              "font-headline text-xl md:text-3xl font-medium absolute -bottom-1 md:-bottom-2 -right-6 md:-right-10",
              isMalicious ? "text-error/60" : isSuspicious ? "text-warning/60" : "text-emerald-500/60"
            )}>/100</span>
          </div>
          <div className="mt-6 md:mt-8 flex flex-col items-center gap-2">
            <span className={cn(
              "font-bold text-base md:text-lg",
              isMalicious ? "text-error" : isSuspicious ? "text-warning" : "text-emerald-500"
            )}>
              {isMalicious ? "AMENAZA CRÍTICA" : isSuspicious ? "ACTIVIDAD SOSPECHOSA" : "VERIFICADO SEGURO"}
            </span>
            <div className="h-1 w-32 bg-surface-container-high rounded-full overflow-hidden">
              <div className={cn(
                "h-full transition-all duration-1000",
                isMalicious ? "bg-error" : isSuspicious ? "bg-warning" : "bg-emerald-500"
              )} style={{ width: `${scan.threatDetails?.riskScore || 0}%` }}></div>
            </div>
          </div>
        </div>

        {/* Target URL Analysis */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-xl p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-headline text-lg md:text-xl font-bold">Análisis de URL de Destino</h3>
            <div className="relative flex items-center justify-center w-5 h-5 md:w-6 md:h-6 border-2 border-[#00B8D4] rounded-full">
              <div className="w-1.5 md:w-2 h-1.5 md:h-2 bg-[#00B8D4] rounded-full"></div>
            </div>
          </div>
          <div className={cn(
            "p-3 md:p-4 rounded-lg font-mono text-xs md:text-sm break-all border-l-4",
            isMalicious ? "bg-error/5 border-error" : isSuspicious ? "bg-warning/5 border-warning" : "bg-emerald-500/5 border-emerald-500"
          )}>
            {scan.url}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            <div className="space-y-1">
              <span className="font-label text-[10px] md:text-xs text-on-surface-variant">Antigüedad del Dominio</span>
              <p className="font-medium text-sm md:text-base">2 Días</p>
            </div>
            <div className="space-y-1">
              <span className="font-label text-[10px] md:text-xs text-on-surface-variant">Registrador</span>
              <p className="font-medium text-sm md:text-base">Privacidad Protegida</p>
            </div>
            <div className="space-y-1">
              <span className="font-label text-[10px] md:text-xs text-on-surface-variant">Ubicación del Servidor</span>
              <p className="font-medium text-sm md:text-base">Vilna, Lituania</p>
            </div>
          </div>
          {isMalicious && (
            <div className="p-4 md:p-6 bg-error/5 rounded-xl flex items-start gap-3 md:gap-4">
              <Globe className="text-error w-5 h-5 md:w-6 md:h-6 shrink-0" />
              <div>
                <p className="font-semibold text-sm md:text-base text-error">Suplantación Detectada</p>
                <p className="text-xs md:text-sm text-on-surface-variant">La URL imita un portal de inicio de sesión de una institución financiera legítima utilizando caracteres homógrafos en el subdominio.</p>
              </div>
            </div>
          )}
        </div>

        {/* Malware Breakdown */}
        <div className="col-span-12 lg:col-span-7 bg-white rounded-xl p-6 md:p-8">
          <h3 className="font-headline text-lg md:text-xl font-bold mb-6 md:mb-8">Resultados del Motor de Consenso</h3>
          <div className="space-y-6 md:space-y-8">
            {scan.threatDetails?.malwareVectors.map((vector, idx) => (
              <div key={idx} className="flex gap-4 md:gap-6 items-start">
                <div className="bg-primary/10 p-2 md:p-3 rounded-lg text-[#006879] shrink-0">
                  {vector.name.includes("VirusTotal") ? <ShieldAlert className="w-5 h-5 md:w-6 md:h-6" /> : vector.name.includes("Google") ? <Globe className="w-5 h-5 md:w-6 md:h-6" /> : <Search className="w-5 h-5 md:w-6 md:h-6" />}
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-sm md:text-base">{vector.name}</h4>
                    <span className={cn(
                      "text-[10px] font-bold font-label px-2 py-0.5 rounded",
                      vector.status === "MALICIOUS" ? "bg-error/10 text-error" : vector.status === "SUSPICIOUS" ? "bg-warning/10 text-warning" : "bg-emerald-500/10 text-emerald-500"
                    )}>{vector.status}</span>
                  </div>
                  <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed">{vector.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Factors Sidebar */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          <div className="bg-surface-container-low rounded-xl p-6 md:p-8 h-full">
            <h3 className="font-headline text-lg md:text-xl font-bold mb-6">Pesos de los Factores de Riesgo</h3>
            <div className="space-y-5 md:space-y-6">
              {Object.entries(scan.threatDetails?.riskFactors || {}).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between text-xs md:text-sm capitalize">
                    <span className="font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className={cn("font-bold", value > 70 ? "text-error" : value > 40 ? "text-warning" : "text-emerald-500")}>
                      {value}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-highest rounded-full">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        value > 70 ? "bg-error" : value > 40 ? "bg-warning" : "bg-emerald-500"
                      )} 
                      style={{ width: `${value}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 md:mt-10 p-4 md:p-6 bg-white rounded-xl shadow-sm space-y-4">
              <h4 className="font-bold text-xs md:text-sm">Mapa de Origen</h4>
              <div className="h-24 md:h-32 rounded-lg bg-surface-container-high relative overflow-hidden">
                <img 
                  className="w-full h-full object-cover grayscale opacity-50" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBP8JTX7CYzLyNO7yMUbxT2Hfxfu9P2DnIpBLBGprg4_deGrQhJcOvi4WiqBPM80XXLVv9dO8jwDWmhP4JA_EplPlyJo1dzoHv-jdAADhB33lHjFOn905tfVLIVSE-W9GixrONYPAheiEbO03z-Bdj2EHxwp34BtJP2XoaQZ_hhuawkUKuck4CM0xtZki7cHGKZJjoLmee3D7BYNp32QmJoG1kxFM5p1siPsMwyE__l2pVLKxUn09KUJtDUj_nLLu2joi66t2NKDSU"
                  alt="Map"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <MapPin className="text-error w-6 h-6 md:w-8 md:h-8 fill-current" />
                </div>
              </div>
              <p className="text-[10px] md:text-xs text-on-surface-variant italic">La carga útil proviene de un nodo de enrutamiento no estándar: AS12903</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
