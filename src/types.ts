export type ScanStatus = "SAFE" | "MALICIOUS" | "SUSPICIOUS" | "PENDING";

export interface MalwareVector {
  name: string;
  status: string;
  description: string;
}

export interface RiskFactors {
  urlReputation: number;
  payloadComplexity: number;
  domainHealth: number;
  latencyAnomaly: number;
}

export interface ThreatDetails {
  riskScore: number;
  malwareVectors: MalwareVector[];
  riskFactors: RiskFactors;
}

export interface ScanRecord {
  id: string;
  userId: string;
  url: string;
  source: string;
  status: ScanStatus;
  timestamp: any; // Firestore Timestamp
  threatDetails?: ThreatDetails;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: "admin" | "user";
  createdAt: any; // Firestore Timestamp
}
