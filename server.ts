import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";

const app = express();
const PORT = 3000;

app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// Store reports in-memory for prototype
const reports: Record<string, any> = {};

// Initialize Gemini client lazily
let aiClient: GoogleGenAI | null = null;
function getAI() {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// API Routes
app.post("/api/analyze", upload.single("reconFile"), async (req, res) => {
  try {
    const rawData = req.file ? req.file.buffer.toString() : req.body.rawData;
    if (!rawData) {
      return res.status(400).json({ error: "No recon data provided" });
    }

    const ai = getAI();
    
    // Construct the prompt for the LLM
    const prompt = `
You are GhostMind, an expert AI security copilot. Analyze the following raw reconnaissance data (like Nmap output or asset inventory).
Extract the hosts, services, and any identified vulnerabilities.
Construct a probable attack graph consisting of nodes (attacker, hosts, services, vulnerabilities) and links showing exploit paths.
Also propose prioritized attack paths for a penetration test, complete with CVSS scores, step-by-step descriptions, and remediation advice.
Return ONLY valid JSON matching this schema exactly, do not use markdown blocks:
{
  "summary": "High-level summary of the attack surface and critical exposures",
  "paths": [
    {
      "id": "path-1",
      "title": "Short title",
      "description": "Detailed explanation of the path",
      "severity": "Critical|High|Medium|Low",
      "cvssScore": 9.8,
      "steps": ["Step 1", "Step 2"],
      "remediation": "How to fix it",
      "status": "pending"
    }
  ],
  "graph": {
    "nodes": [
      { "id": "Attacker", "label": "Internet (Attacker)", "type": "attacker", "group": 1 },
      { "id": "Host-IP", "label": "Host Name/IP", "type": "host", "group": 2 },
      { "id": "Service-Port", "label": "Service Name", "type": "service", "group": 3 },
      { "id": "CVE-XXXX", "label": "Vulnerability Name", "type": "vulnerability", "cve": "CVE-XXXX", "cvss": 9.8, "group": 4 }
    ],
    "links": [
      { "source": "Attacker", "target": "Service-Port", "type": "accesses" },
      { "source": "Host-IP", "target": "Service-Port", "type": "hosts" },
      { "source": "Service-Port", "target": "CVE-XXXX", "type": "exploits" }
    ]
  }
}

Recon Data:
${rawData}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text || "{}";
    const reportData = JSON.parse(resultText);
    
    const reportId = Date.now().toString();
    const newReport = {
      id: reportId,
      ...reportData,
      createdAt: new Date().toISOString(),
    };
    
    reports[reportId] = newReport;
    
    res.json(newReport);
  } catch (error: any) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze data" });
  }
});

app.get("/api/reports", (req, res) => {
  res.json(Object.values(reports).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

app.get("/api/reports/:id", (req, res) => {
  const report = reports[req.params.id];
  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }
  res.json(report);
});

app.patch("/api/reports/:reportId/paths/:pathId/status", (req, res) => {
  const { reportId, pathId } = req.params;
  const { status } = req.body;
  
  const report = reports[reportId];
  if (!report) return res.status(404).json({ error: "Report not found" });
  
  const path = report.paths.find((p: any) => p.id === pathId);
  if (!path) return res.status(404).json({ error: "Path not found" });
  
  if (['pending', 'approved', 'rejected'].includes(status)) {
    path.status = status;
    res.json(path);
  } else {
    res.status(400).json({ error: "Invalid status" });
  }
});

async function startServer() {
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
