import React from 'react';
import { AIAnalysisResult, CATEGORY_LABELS } from '../../shared/types.js';
import { Sparkles, ShieldAlert, Cpu, AlertTriangle, Layers, Building } from 'lucide-react';
import { PriorityBadge } from './PriorityBadge.js';

interface AIAssessmentCardProps {
  analysis: AIAnalysisResult | null | undefined;
}

export const AIAssessmentCard: React.FC<AIAssessmentCardProps> = ({ analysis }) => {
  if (!analysis) {
    return (
      <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center text-slate-500 text-sm">
        <Cpu className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        Automated AI analysis pending for this grievance.
      </div>
    );
  }

  const confidencePct = Math.round(analysis.categoryConfidence * 100);

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-xl border border-indigo-500/30 relative overflow-hidden">
      {/* Glow orb */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-base tracking-tight text-white flex items-center gap-2">
              AI Grievance Intelligence Report
              <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/20 font-mono">
                SmartGov CivicNLP
              </span>
            </h3>
            <p className="text-xs text-indigo-200/70">
              Deterministic semantic categorization, priority routing & duplicate detection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Urgency Score:</span>
          <div className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 font-mono text-xs font-bold text-amber-300">
            {analysis.urgencyScore} / 100
          </div>
        </div>
      </div>

      {/* Grid of Key AI Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 relative z-10">
        {/* Category prediction */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Predicted Category</span>
          <p className="text-sm font-semibold text-indigo-200 mb-1">
            {CATEGORY_LABELS[analysis.categoryPredicted]}
          </p>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${confidencePct}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {confidencePct}% semantic confidence
          </span>
        </div>

        {/* Priority detection */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Assessed Urgency</span>
          <div className="mt-1">
            <PriorityBadge priority={analysis.priorityPredicted} />
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            Confidence: {Math.round(analysis.priorityConfidence * 100)}%
          </span>
        </div>

        {/* Recommended Department */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">
          <span className="text-xs text-slate-400 block mb-1 flex items-center gap-1">
            <Building className="w-3.5 h-3.5 text-indigo-400" />
            Recommended Routing
          </span>
          <p className="text-sm font-semibold text-slate-100 line-clamp-1">
            {analysis.recommendedDepartmentName}
          </p>
          <span className="text-[11px] text-indigo-300 font-mono mt-1 block">
            [{analysis.recommendedDepartmentCode}]
          </span>
        </div>
      </div>

      {/* Reasons & Signals */}
      <div className="space-y-3 text-xs bg-slate-950/60 p-4 rounded-xl border border-white/5 relative z-10">
        <div>
          <span className="font-semibold text-slate-300 block mb-1 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Detection Factors & Evidence:
          </span>
          <p className="text-slate-300 italic mb-2 leading-relaxed">
            "{analysis.categoryExplanation}"
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            {analysis.priorityReasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>

        {/* Duplicate Signals */}
        {analysis.potentialDuplicates && analysis.potentialDuplicates.length > 0 && (
          <div className="pt-3 border-t border-white/10">
            <span className="font-semibold text-amber-300 flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Duplicate Flag: {analysis.potentialDuplicates.length} Similar Grievance(s) Detected
            </span>
            <div className="space-y-1.5">
              {analysis.potentialDuplicates.map((dup) => (
                <div
                  key={dup.id}
                  className="bg-amber-950/40 border border-amber-500/30 rounded p-2 text-[11px] flex items-center justify-between"
                >
                  <span className="text-amber-100">
                    <span className="font-mono font-bold text-amber-400 mr-2">{dup.id}</span>
                    {dup.title}
                  </span>
                  <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                    {dup.similarityScore}% match
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Master issue suggestion */}
        {analysis.masterIssueSuggested && (
          <div className="pt-2 border-t border-white/10 flex items-center gap-2 text-indigo-300">
            <Layers className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>
              Engine recommendation: Likely part of a broader localized civic cluster. Association with a Master Issue is recommended.
            </span>
          </div>
        )}
      </div>

      {/* Honest AI engine footer */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
        <span>Engine: {analysis.engineVersion}</span>
        <span>Processed: {new Date(analysis.processedAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};
