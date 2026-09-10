import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { AnalysisReport } from '../types';

interface UploadReconProps {
  onAnalysisComplete: (report: AnalysisReport) => void;
}

export default function UploadRecon({ onAnalysisComplete }: UploadReconProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'file' | 'text'>('text');

  const handleAnalyze = async () => {
    if (!file && !rawData) {
      setError("Please provide recon data to analyze.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      if (mode === 'file' && file) {
        formData.append('reconFile', file);
      } else {
        formData.append('rawData', rawData);
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Analysis failed');
      }

      const report: AnalysisReport = await response.json();
      onAnalysisComplete(report);
    } catch (err: any) {
      setError(err.message || "An error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sampleData = `Nmap scan report for example.internal (10.0.0.45)
Host is up (0.012s latency).
Not shown: 996 closed tcp ports
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http
443/tcp  open  https
3306/tcp open  mysql

Host script results:
|_http-title: Internal Employee Portal v1.2
| mysql-info: 
|   Protocol: 10
|   Version: 5.5.62-log
|   Thread ID: 11
|_  Capabilities flags: 63487

Vulnerability Scan Results:
- Port 80 (http): Apache HTTP Server 2.4.49 - Path Traversal (CVE-2021-41773). Critical.
- Port 3306 (mysql): MySQL 5.5.62 is End of Life and contains multiple known vulnerabilities.
`;

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
          <Upload className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Ingest Recon Data</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Upload Nmap scans or asset inventory files for AI-driven threat analysis.
        </p>
      </div>

      <div className="flex items-center justify-center p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-6 w-fit mx-auto">
        <button
          onClick={() => setMode('text')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'text' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          Paste Raw Output
        </button>
        <button
          onClick={() => setMode('file')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'file' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          Upload File
        </button>
      </div>

      {mode === 'file' ? (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-10 text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer relative">
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <FileText className="w-8 h-8 mx-auto text-gray-400 mb-3" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {file ? file.name : "Click or drag file to this area to upload"}
          </p>
          <p className="text-xs text-gray-500 mt-1">Supports Nmap XML/grepable, JSON, TXT</p>
        </div>
      ) : (
        <div className="relative">
          <textarea
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            placeholder="Paste your recon data here..."
            className="w-full h-48 p-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y"
          />
          <button 
            onClick={() => setRawData(sampleData)}
            className="absolute top-2 right-2 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-2 py-1 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Load Sample
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={isAnalyzing || (!file && !rawData)}
        className="mt-6 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Analyzing Attack Surface...
          </>
        ) : (
          'Generate Attack Plan'
        )}
      </button>
    </div>
  );
}
