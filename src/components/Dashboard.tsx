import React, { useState, useEffect } from 'react';
import { Activity, Shield, FileOutput, Server, Network, Moon, Sun } from 'lucide-react';
import UploadRecon from './UploadRecon';
import AttackGraph from './AttackGraph';
import ReportViewer from './ReportViewer';
import { AnalysisReport } from '../types';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'recon' | 'graph' | 'report'>('recon');
  const [currentReport, setCurrentReport] = useState<AnalysisReport | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  useEffect(() => {
    // Initial check for system preference or just default to dark
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleAnalysisComplete = (report: AnalysisReport) => {
    setCurrentReport(report);
    setActiveTab('graph');
  };

  const handleUpdateStatus = async (pathId: string, status: 'pending' | 'approved' | 'rejected') => {
    if (!currentReport) return;

    try {
      const res = await fetch(`/api/reports/${currentReport.id}/paths/${pathId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (res.ok) {
        const updatedPath = await res.json();
        setCurrentReport(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            paths: prev.paths.map(p => p.id === pathId ? updatedPath : p)
          };
        });
      }
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">GhostMind</span>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium ml-2">
                Security Copilot
              </span>
            </div>
            
            {/* Status indicators and controls */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-gray-600 dark:text-gray-400 font-medium">System Online</span>
              </div>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-800"></div>
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-colors"
                aria-label="Toggle theme"
                title="Toggle theme"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-800">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('recon')}
                className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'recon'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Activity className="w-4 h-4" />
                Data Ingestion
              </button>
              <button
                onClick={() => setActiveTab('graph')}
                disabled={!currentReport}
                className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  !currentReport ? 'opacity-50 cursor-not-allowed text-gray-400' :
                  activeTab === 'graph'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Network className="w-4 h-4" />
                Attack Graph
              </button>
              <button
                onClick={() => setActiveTab('report')}
                disabled={!currentReport}
                className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  !currentReport ? 'opacity-50 cursor-not-allowed text-gray-400' :
                  activeTab === 'report'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <FileOutput className="w-4 h-4" />
                Action Plan & Report
              </button>
            </nav>
          </div>
        </div>

        <div className="mt-6">
          {activeTab === 'recon' && (
            <UploadRecon onAnalysisComplete={handleAnalysisComplete} />
          )}

          {activeTab === 'graph' && currentReport && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Attack Graph Visualization</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Interactive visualization of exposed services, known vulnerabilities, and potential attack paths.
                </p>
              </div>
              <AttackGraph data={currentReport.graph} />
            </div>
          )}

          {activeTab === 'report' && currentReport && (
            <div className="space-y-4">
               <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Human-Reviewed Action Plan</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Review LLM-proposed attack paths and approve or reject actions.
                </p>
              </div>
              <ReportViewer report={currentReport} onUpdateStatus={handleUpdateStatus} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
