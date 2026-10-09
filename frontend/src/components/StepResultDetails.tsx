import React, { useState } from 'react';
import {
  BookOpen,
  ExternalLink,
  FileDown,
  FileText,
  Check,
  Copy,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Users,
  Terminal,
  Hash,
} from 'lucide-react';
import { StepDefinition, ArxivPaper } from '../types';

interface StepResultDetailsProps {
  step: StepDefinition;
}

export const StepResultDetails: React.FC<StepResultDetailsProps> = ({
  step,
}) => {
  const [copiedReport, setCopiedReport] = useState(false);

  // Parse result data if available as object or string
  const result: Record<string, any> | null = (() => {
    if (step.execution_result && typeof step.execution_result === 'object') {
      return step.execution_result;
    }
    if (step.execution_result_json && typeof step.execution_result_json === 'string') {
      try {
        return JSON.parse(step.execution_result_json);
      } catch {
        return null;
      }
    }
    return null;
  })();

  const isFailed = step.status === 'FAILED' || Boolean(step.error_message);

  // 1. Error state
  if (isFailed) {
    return (
      <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/60 text-xs text-rose-200 flex items-start gap-2.5 shadow-md">
        <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-rose-300 font-mono text-[11px] uppercase tracking-wider">
            Execution Intercepted // {step.tool_name}
          </div>
          <p className="mt-1 font-mono text-[11px] text-rose-200/90 leading-relaxed whitespace-pre-wrap">
            {step.error_message || 'Step execution failed without explicit error details.'}
          </p>
        </div>
      </div>
    );
  }

  // If not completed and no result yet
  if (!result && step.status !== 'VERIFIED') {
    return (
      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2 font-mono">
        <Terminal className="w-3.5 h-3.5 text-slate-500" />
        <span>Step status: {step.status} (awaiting output)</span>
      </div>
    );
  }

  // If verified but completely empty result
  if (!result && step.status === 'VERIFIED') {
    return (
      <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-600/40 text-[11px] text-amber-300 flex items-center gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>Verified with empty payload. No output data recorded.</span>
      </div>
    );
  }

  // 2. Specialized View: arXiv Research Tool
  if (step.tool_name === 'web_search_arxiv') {
    const papers: ArxivPaper[] = result?.papers || [];
    const query: string = result?.query || (step.parameters?.query as string) || '';
    const totalFound: number = result?.total_found ?? papers.length;

    if (papers.length === 0) {
      return (
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/60 text-xs text-amber-200 flex items-start gap-2.5 shadow-md">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300 font-mono text-[11px] uppercase tracking-wider block">
              No Literature Returned
            </span>
            <p className="text-[11px] text-amber-200/90 mt-1">
              Search query <span className="font-mono text-cyan-300">"{query}"</span> returned 0 academic papers from the arXiv repository.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-800/80">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-xs text-white">
              Retrieved Academic Papers ({papers.length} of {totalFound})
            </span>
          </div>
          {query && (
            <span className="text-[10px] font-mono text-slate-400 truncate max-w-xs bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
              query: {query}
            </span>
          )}
        </div>

        <div className="space-y-2.5">
          {papers.map((paper, idx) => {
            const arxivUrl = paper.source_url || `https://arxiv.org/abs/${paper.arxiv_id}`;
            const pdfUrl = paper.pdf_url || `https://arxiv.org/pdf/${paper.arxiv_id}.pdf`;
            const authorsStr = Array.isArray(paper.authors)
              ? paper.authors.join(', ')
              : String(paper.authors || 'Unknown');

            return (
              <div
                key={paper.arxiv_id || idx}
                className="p-3 rounded-xl bg-[#081020]/90 border border-cyan-900/40 hover:border-cyan-500/40 transition-colors text-xs space-y-2 shadow-sm"
              >
                {/* Paper Title and Link */}
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={arxivUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-slate-100 hover:text-cyan-300 transition-colors leading-snug flex items-start gap-1 group text-xs sm:text-[13px]"
                  >
                    <span>
                      {idx + 1}. {paper.title}
                    </span>
                    <ExternalLink className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                  </a>
                </div>

                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-mono font-semibold">
                    arXiv:{paper.arxiv_id}
                  </span>

                  {paper.primary_category && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800 font-mono">
                      {paper.primary_category}
                    </span>
                  )}

                  {paper.published && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{paper.published.substring(0, 10)}</span>
                    </span>
                  )}

                  <span className="flex items-center gap-1 text-slate-400 truncate max-w-sm">
                    <Users className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{authorsStr}</span>
                  </span>
                </div>

                {/* Paper Abstract / Summary */}
                {paper.summary && (
                  <div className="p-2.5 rounded-lg bg-[#040812]/80 border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-cyan-400 font-bold block mb-1">
                      Abstract / Summary
                    </span>
                    <p className="line-clamp-4 hover:line-clamp-none transition-all">
                      {paper.summary}
                    </p>
                  </div>
                )}

                {/* Links Toolbar */}
                <div className="flex items-center gap-3 pt-1 text-[11px]">
                  <a
                    href={arxivUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>View on arXiv</span>
                  </a>
                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium hover:underline"
                    >
                      <FileDown className="w-3 h-3" />
                      <span>PDF Document</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. Specialized View: Document Synthesizer Tool
  if (step.tool_name === 'document_synthesizer') {
    const title = result?.title || (step.parameters?.title as string) || 'Synthesized Document';
    const content = result?.content || '';
    const fileName = result?.file_name || '';
    const sizeBytes = result?.size_bytes || 0;
    const sha256 = result?.sha256_checksum || '';

    if (!content) {
      return (
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/60 text-xs text-amber-200 flex items-start gap-2.5 shadow-md">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300 font-mono text-[11px] uppercase tracking-wider block">
              Empty Document Body
            </span>
            <p className="text-[11px] text-amber-200/90 mt-1">
              Document synthesis completed without generating text content.
            </p>
          </div>
        </div>
      );
    }

    const handleCopy = () => {
      navigator.clipboard.writeText(content);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    };

    return (
      <div className="space-y-3">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-xs text-white truncate max-w-sm">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {fileName && (
              <span className="font-mono text-[10px] text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {fileName}
              </span>
            )}
            {sizeBytes > 0 && (
              <span className="text-[10px] font-mono text-slate-400">
                {(sizeBytes / 1024).toFixed(1)} KB
              </span>
            )}
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[10px] flex items-center gap-1 font-semibold transition-colors"
              title="Copy markdown content to clipboard"
            >
              {copiedReport ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Report</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div className="p-3.5 rounded-xl bg-[#040812] border border-slate-800 text-[11px] text-slate-200 max-h-72 overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed shadow-inner">
          {content}
        </div>

        {/* Cryptographic SHA-256 seal badge */}
        {sha256 && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 pt-1">
            <Hash className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="text-slate-500">SHA-256:</span>
            <span className="truncate text-slate-400">{sha256}</span>
          </div>
        )}
      </div>
    );
  }

  // 4. Google Drive / Calendar / Generic Tool output
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold font-mono">
        <Terminal className="w-3.5 h-3.5 text-cyan-400" />
        <span>Execution Result ({step.tool_name})</span>
      </div>
      <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300/90 overflow-x-auto max-h-48">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
};
