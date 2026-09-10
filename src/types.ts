export interface Node {
  id: string;
  label: string;
  type: "host" | "service" | "vulnerability" | "attacker";
  cve?: string;
  cvss?: number;
  group?: number;
}

export interface Link {
  source: string;
  target: string;
  type: "exploits" | "hosts" | "accesses";
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
}

export interface AttackPath {
  id: string;
  title: string;
  description: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  cvssScore: number;
  steps: string[];
  remediation: string;
  status: "pending" | "approved" | "rejected";
}

export interface ReconData {
  rawOutput: string;
  source: string;
  timestamp: string;
}

export interface AnalysisReport {
  id: string;
  summary: string;
  paths: AttackPath[];
  graph: GraphData;
  createdAt: string;
}
