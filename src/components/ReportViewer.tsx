import React from 'react';
import { ShieldAlert, Shield, ShieldCheck, ArrowRight, AlertTriangle, Check, X, Clock } from 'lucide-react';
import { AnalysisReport, AttackPath } from '../types';

interface ReportViewerProps {
  report: AnalysisReport;
  onUpdateStatus: (pathId: string, status: AttackPath['status']) => void;
}

const severityConfig = {
  Critical: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800/50', icon: AlertTriangle },
  High: { color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-200 dark:border-orange-800/50', icon: ShieldAlert },
  Medium: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800/50', icon: Shield },
  Low: { color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800/50', icon: ShieldCheck },
};

export default function ReportViewer({ report, onUpdateStatus }: ReportViewerProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-2">Executive Summary</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{report.summary}</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Proposed Attack Paths
          <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs py-0.5 px-2 rounded-full font-medium">
            {report.paths.length}
          </span>
        </h3>
        
        {report.paths.map((path) => {
          const config = severityConfig[path.severity] || severityConfig.Medium;
          const Icon = config.icon;
          
          return (
            <div key={path.id} className={`bg-white dark:bg-gray-900 rounded-xl border ${config.border} p-5 shadow-sm transition-all`}>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${config.bg} ${config.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {path.severity} (CVSS {path.cvssScore})
                    </span>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{path.title}</h4>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{path.description}</p>
                  
                  <div className="space-y-3 mb-4">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Execution Chain</h5>
                    <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-4">
                      {path.steps.map((step, idx) => (
                        <li key={idx} className="pl-6 relative">
                          <span className="absolute -left-2 top-0.5 w-4 h-4 rounded-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"></span>
                          </span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/50 rounded-lg p-3">
                    <h5 className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> Remediation Priority
                    </h5>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">{path.remediation}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 min-w-[200px] border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 pt-4 md:pt-0 md:pl-5">
                  <div className="w-full">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Human Review</p>
                    
                    {path.status === 'pending' && (
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => onUpdateStatus(path.id, 'approved')}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                        >
                          <Check className="w-4 h-4" /> Approve Action
                        </button>
                        <button 
                          onClick={() => onUpdateStatus(path.id, 'rejected')}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md transition-colors"
                        >
                          <X className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    )}

                    {path.status === 'approved' && (
                      <div className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-md border border-emerald-200 dark:border-emerald-800/50">
                        <Check className="w-4 h-4" /> Approved for Execution
                      </div>
                    )}

                    {path.status === 'rejected' && (
                      <div className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium rounded-md border border-gray-200 dark:border-gray-700">
                        <X className="w-4 h-4" /> Rejected
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
