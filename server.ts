import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Multi-API Scan Consensus Logic
  app.post("/api/scan-url", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const vtApiKey = process.env.VIRUSTOTAL_API_KEY;
    const gsbApiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
    const urlScanApiKey = process.env.URLSCAN_API_KEY;

    // Helper for fetch with timeout
    const fetchWithTimeout = async (resource: string, options: any = {}, timeout = 8000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(resource, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(id);
        return response;
      } catch (error) {
        clearTimeout(id);
        throw error;
      }
    };

    // Helper to call VirusTotal
    const scanVirusTotal = async () => {
      if (!vtApiKey) throw new Error("VT_KEY_MISSING");
      try {
        const urlId = Buffer.from(url).toString('base64').replace(/=/g, '');
        const response = await fetchWithTimeout(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
          headers: { "x-apikey": vtApiKey }
        });
        if (!response.ok) return { status: "SAFE", riskScore: 0, details: "Not previously seen by VT" };
        const data = await response.json();
        const stats = data.data.attributes.last_analysis_stats;
        let status: "SAFE" | "MALICIOUS" | "SUSPICIOUS" = "SAFE";
        if (stats.malicious > 0) status = "MALICIOUS";
        else if (stats.suspicious > 0) status = "SUSPICIOUS";
        return { status, riskScore: Math.min(100, (stats.malicious * 20) + (stats.suspicious * 10)), details: `VT: ${stats.malicious} malicious detections.` };
      } catch (e) {
        console.error("VT Scan Error:", e);
        return { status: "SAFE", riskScore: 0, details: "VT scan timed out or failed" };
      }
    };

    // Helper to call Google Safe Browsing
    const scanGoogleSafeBrowsing = async () => {
      if (!gsbApiKey) throw new Error("GSB_KEY_MISSING");
      try {
        const response = await fetchWithTimeout(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${gsbApiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client: { clientId: "qr-shield", clientVersion: "1.0.0" },
            threatInfo: {
              threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
              platformTypes: ["ANY_PLATFORM"],
              threatEntryTypes: ["URL"],
              threatEntries: [{ url }]
            }
          })
        });
        if (!response.ok) return { status: "SAFE", riskScore: 0, details: "GSB scan failed" };
        const data = await response.json();
        const status = data.matches && data.matches.length > 0 ? "MALICIOUS" : "SAFE";
        return { status, riskScore: status === "MALICIOUS" ? 100 : 0, details: status === "MALICIOUS" ? "GSB: Flagged as malicious." : "GSB: No threats detected." };
      } catch (e) {
        console.error("GSB Scan Error:", e);
        return { status: "SAFE", riskScore: 0, details: "GSB scan timed out or failed" };
      }
    };

    // Helper to call Urlscan.io
    const scanUrlScan = async () => {
      if (!urlScanApiKey) throw new Error("URLSCAN_KEY_MISSING");
      try {
        let hostname = url;
        try {
          const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
          hostname = urlObj.hostname;
        } catch (e) {
          // Fallback if URL parsing fails
        }
        
        const response = await fetchWithTimeout(`https://urlscan.io/api/v1/search/?q=domain:${hostname}`, {
          headers: { "API-Key": urlScanApiKey }
        });
        if (!response.ok) return { status: "SAFE", riskScore: 0, details: "Urlscan search failed" };
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          const isFrequent = data.total > 10;
          return { 
            status: isFrequent ? "SUSPICIOUS" : "SAFE", 
            riskScore: isFrequent ? 40 : 0, 
            details: `Urlscan: Found ${data.total} previous scans for this domain.` 
          };
        }
        return { status: "SAFE", riskScore: 0, details: "Urlscan: No previous threats found for this domain." };
      } catch (e) {
        console.error("Urlscan Error:", e);
        return { status: "SAFE", riskScore: 0, details: "Urlscan scan timed out or failed" };
      }
    };

    try {
      // Run all scans in parallel
      const results = await Promise.allSettled([
        scanVirusTotal().catch(e => ({ status: "SAFE", riskScore: 0, details: e.message })),
        scanGoogleSafeBrowsing().catch(e => ({ status: "SAFE", riskScore: 0, details: e.message })),
        scanUrlScan().catch(e => ({ status: "SAFE", riskScore: 0, details: e.message }))
      ]);

      const successfulResults = results.map(r => r.status === 'fulfilled' ? r.value : { status: "SAFE", riskScore: 0, details: "Scan failed" });
      
      // Consensus Logic (Back to 3 engines)
      const maliciousCount = successfulResults.filter(r => r.status === "MALICIOUS").length;
      const suspiciousCount = successfulResults.filter(r => r.status === "SUSPICIOUS").length;
      
      let finalStatus: "SAFE" | "MALICIOUS" | "SUSPICIOUS" = "SAFE";
      let finalRiskScore = 0;
      
      if (maliciousCount >= 2) {
        finalStatus = "MALICIOUS";
      } else if (maliciousCount === 1 || suspiciousCount >= 2) {
        finalStatus = "SUSPICIOUS";
      }
      
      // Average risk score
      finalRiskScore = Math.round(successfulResults.reduce((acc, r) => acc + r.riskScore, 0) / successfulResults.length);
      
      // Combine details
      const combinedDetails = successfulResults.map(r => r.details).join(" | ");

      res.json({
        status: finalStatus,
        riskScore: finalRiskScore,
        details: combinedDetails,
        engines: {
          virusTotal: successfulResults[0],
          googleSafeBrowsing: successfulResults[1],
          urlScan: successfulResults[2]
        }
      });

    } catch (error) {
      console.error("Multi-scan error:", error);
      res.status(500).json({ error: "Failed to perform multi-engine scan" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
