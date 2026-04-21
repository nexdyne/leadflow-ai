import React, { useState, useMemo, useEffect } from 'react';
import { runFullQAReview } from '../engine/qaEngine.js';

// ============================================================================
// QA REVIEW PANEL — Quality Assurance Dashboard for LeadFlow AI
// Automatically reviews inspection reports for consistency, completeness,
// and regulatory compliance
//
// Persistence / audit-trail design:
//   Acknowledged (dismissed) QA findings are the inspector's contemporaneous
//   judgment that a flagged issue is not a real defect. Under 40 CFR 745.227(h)
//   the inspector must retain the full inspection record (including any
//   override rationales) for a minimum of 3 years. Storing dismissals in
//   component-local React state loses that record on refresh/remount. This
//   panel therefore mirrors dismissals into Redux via SAVE_QA_DISMISSED and
//   hydrates on mount so the audit trail survives reloads and flows into the
//   exported report and saved .lf state.
// ============================================================================

function QAReviewPanel({ state, dispatch }) {
  const [qaResults, setQaResults] = useState(state.qaResults || null);
  const [qaError, setQaError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    consistency: false,
    completeness: false,
    language: false
  });
  // Initialize from redux so dismissed findings survive reload
  const [dismissedFindings, setDismissedFindings] = useState(state.qaDismissedFindings || {});

  // Hydrate if redux state is updated externally (load saved report, etc.)
  useEffect(() => {
    if (state.qaDismissedFindings) {
      setDismissedFindings(state.qaDismissedFindings);
    }
    if (state.qaResults && !qaResults) {
      setQaResults(state.qaResults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.qaDismissedFindings, state.qaResults]);

  // Persist dismissals to redux (40 CFR 745.227(h) audit trail)
  function persistDismissed(nextDismissed, changedId, action) {
    dispatch({
      type: 'SAVE_QA_DISMISSED',
      payload: {
        dismissed: nextDismissed,
        lastChange: {
          findingId: changedId,
          action,
          user: (state.currentUser && state.currentUser.name) || state.projectInfo?.inspectorName || 'unknown',
          timestamp: new Date().toISOString()
        }
      }
    });
  }

  // Acknowledge/dismiss a QA finding with reason
  function handleDismissFinding(findingId, reason) {
    const record = {
      dismissed: true,
      reason: reason || 'Acknowledged by inspector',
      dismissedBy: (state.currentUser && state.currentUser.name) || state.projectInfo?.inspectorName || 'unknown',
      timestamp: new Date().toISOString()
    };
    setDismissedFindings(prev => {
      const next = { ...prev, [findingId]: record };
      persistDismissed(next, findingId, 'dismiss');
      return next;
    });
  }

  // Restore a dismissed finding
  function handleRestoreFinding(findingId) {
    setDismissedFindings(prev => {
      const next = { ...prev };
      delete next[findingId];
      persistDismissed(next, findingId, 'restore');
      return next;
    });
  }

  // Run QA review — guarded so a bad checker rule cannot blow up the UI
  function handleRunQAReview() {
    setQaError(null);
    try {
      const results = runFullQAReview(state);
      if (!results || !results.findings || !results.summary) {
        throw new Error('QA engine returned malformed results (missing findings/summary).');
      }
      setQaResults(results);
      dispatch({
        type: 'SAVE_QA_RESULTS',
        payload: results
      });
    } catch (err) {
      // Log for debugging but also surface to the inspector — they need to
      // know the QA pass did not complete before they sign the report.
      // eslint-disable-next-line no-console
      console.error('[QAReviewPanel] runFullQAReview failed:', err);
      setQaError(err && err.message ? err.message : String(err));
    }
  }

  // Toggle section expansion
  function toggleSection(section) {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }

  // Export QA Report
  function handleExportQAReport() {
    if (!qaResults) return;

    const lines = [
      '='.repeat(80),
      'QUALITY ASSURANCE REVIEW REPORT',
      '='.repeat(80),
      '',
      `Generated: ${new Date(qaResults.timestamp).toLocaleString()}`,
      '',
      'OVERALL SCORE: ' + qaResults.summary.overallScore + '/100',
      'GRADE: ' + qaResults.summary.grade,
      '',
      'SUMMARY:',
      `  Errors:   ${qaResults.summary.errors}`,
      `  Warnings: ${qaResults.summary.warnings}`,
      `  Info:     ${qaResults.summary.info}`,
      '',
      '='.repeat(80),
      ''
    ];

    // Group findings by category
    const byCategory = {
      consistency: [],
      completeness: [],
      language: []
    };

    qaResults.findings.forEach(f => {
      if (byCategory[f.category]) {
        byCategory[f.category].push(f);
      }
    });

    // Add consistency findings
    if (byCategory.consistency.length > 0) {
      lines.push('CONSISTENCY CHECKS (' + byCategory.consistency.length + ' finding(s))');
      lines.push('-'.repeat(80));
      byCategory.consistency.forEach(f => {
        lines.push('');
        lines.push(`[${f.severity.toUpperCase()}] ${f.title}`);
        lines.push(`Description: ${f.description}`);
        lines.push(`Affected Tab: ${f.affectedTab}`);
        lines.push(`Suggested Fix: ${f.suggestedFix}`);
      });
      lines.push('');
      lines.push('='.repeat(80));
      lines.push('');
    }

    // Add completeness findings
    if (byCategory.completeness.length > 0) {
      lines.push('COMPLETENESS CHECKS (' + byCategory.completeness.length + ' finding(s))');
      lines.push('-'.repeat(80));
      byCategory.completeness.forEach(f => {
        lines.push('');
        lines.push(`[${f.severity.toUpperCase()}] ${f.title}`);
        lines.push(`Description: ${f.description}`);
        lines.push(`Affected Tab: ${f.affectedTab}`);
        lines.push(`Suggested Fix: ${f.suggestedFix}`);
      });
      lines.push('');
      lines.push('='.repeat(80));
      lines.push('');
    }

    // Add language findings
    if (byCategory.language.length > 0) {
      lines.push('LANGUAGE & COMPLIANCE REVIEW (' + byCategory.language.length + ' finding(s))');
      lines.push('-'.repeat(80));
      byCategory.language.forEach(f => {
        lines.push('');
        lines.push(`[${f.severity.toUpperCase()}] ${f.title}`);
        lines.push(`Description: ${f.description}`);
        lines.push(`Affected Tab: ${f.affectedTab}`);
        lines.push(`Suggested Fix: ${f.suggestedFix}`);
      });
      lines.push('');
      lines.push('='.repeat(80));
    }

    const text = lines.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'QA_Review_' + new Date().toISOString().split('T')[0] + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Group findings by category
  const findingsByCategory = useMemo(() => {
    if (!qaResults) return { consistency: [], completeness: [], language: [] };
    return {
      consistency: qaResults.findings.filter(f => f.category === 'consistency'),
      completeness: qaResults.findings.filter(f => f.category === 'completeness'),
      language: qaResults.findings.filter(f => f.category === 'language')
    };
  }, [qaResults]);

  // Severity icon and color
  function getSeverityStyle(severity) {
    if (severity === 'error') {
      return {
        icon: '✕',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    } else if (severity === 'warning') {
      return {
        icon: '⚠',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      };
    } else {
      return {
        icon: 'ℹ',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    }
  }

  // Score color
  function getScoreColor(score) {
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  }

  function getGradeColor(grade) {
    if (grade === 'A' || grade === 'B') return 'text-green-600';
    if (grade === 'C') return 'text-yellow-600';
    return 'text-red-600';
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-blue-900 mb-4">Quality Assurance Review</h2>
        <p className="text-gray-600 text-sm mb-4">
          Automatically reviews your inspection report for consistency, completeness, and regulatory compliance.
        </p>
      </div>

      {/* Run QA Review Button */}
      <div className="mb-6">
        <button
          onClick={handleRunQAReview}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Run Full QA Review
        </button>
      </div>

      {/* QA engine error banner — fail-soft so the inspector is not silently
          locked out, and still knows the QA pass did not run to completion. */}
      {qaError && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-red-700 text-xl font-bold">✕</span>
            <div className="flex-grow">
              <h4 className="font-semibold text-red-900 mb-1">QA review did not complete</h4>
              <p className="text-sm text-red-700 mb-2">
                The QA engine raised an error. Do not sign this report until the
                QA review runs successfully (40 CFR 745.227(h) requires a complete
                inspection record).
              </p>
              <p className="text-xs font-mono text-red-600 bg-red-100 p-2 rounded">
                {qaError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {qaResults && (
        <div>
          {/* Score Dashboard */}
          <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Overall Score</h3>
                <div className="flex items-baseline gap-4">
                  <div className="text-center">
                    <div className={`text-5xl font-bold ${getScoreColor(qaResults.summary.overallScore)}`}>
                      {qaResults.summary.overallScore}
                    </div>
                    <div className="text-sm text-gray-600">/ 100</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-6xl font-bold ${getGradeColor(qaResults.summary.grade)}`}>
                      {qaResults.summary.grade}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Bar */}
              <div className="flex gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{qaResults.summary.errors}</div>
                  <div className="text-sm text-gray-600">Errors</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{qaResults.summary.warnings}</div>
                  <div className="text-sm text-gray-600">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{qaResults.summary.info}</div>
                  <div className="text-sm text-gray-600">Info</div>
                </div>
              </div>
            </div>

            {/* Last Review Timestamp */}
            <div className="text-xs text-gray-500">
              Last reviewed: {new Date(qaResults.timestamp).toLocaleString()}
            </div>
          </div>

          {/* Consistency Checks Section */}
          <div className="mb-4">
            <button
              onClick={() => toggleSection('consistency')}
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center justify-between"
            >
              <div className="text-left">
                <h3 className="font-semibold text-blue-900">
                  Consistency Checks ({findingsByCategory.consistency.length})
                </h3>
              </div>
              <div className="text-gray-600">{expandedSections.consistency ? '−' : '+'}</div>
            </button>
            {expandedSections.consistency && (
              <div className="mt-2 space-y-3">
                {findingsByCategory.consistency.length === 0 ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    All consistency checks passed!
                  </div>
                ) : (
                  findingsByCategory.consistency.map(finding => (
                    <FindingCard key={finding.id} finding={finding} getSeverityStyle={getSeverityStyle} dismissed={dismissedFindings[finding.id]} onDismiss={handleDismissFinding} onRestore={handleRestoreFinding} />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Completeness Checks Section */}
          <div className="mb-4">
            <button
              onClick={() => toggleSection('completeness')}
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center justify-between"
            >
              <div className="text-left">
                <h3 className="font-semibold text-blue-900">
                  Completeness Checks ({findingsByCategory.completeness.length})
                </h3>
              </div>
              <div className="text-gray-600">{expandedSections.completeness ? '−' : '+'}</div>
            </button>
            {expandedSections.completeness && (
              <div className="mt-2 space-y-3">
                {findingsByCategory.completeness.length === 0 ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    All completeness checks passed!
                  </div>
                ) : (
                  findingsByCategory.completeness.map(finding => (
                    <FindingCard key={finding.id} finding={finding} getSeverityStyle={getSeverityStyle} dismissed={dismissedFindings[finding.id]} onDismiss={handleDismissFinding} onRestore={handleRestoreFinding} />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Language Review Section */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('language')}
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center justify-between"
            >
              <div className="text-left">
                <h3 className="font-semibold text-blue-900">
                  Language & Compliance Review ({findingsByCategory.language.length})
                </h3>
              </div>
              <div className="text-gray-600">{expandedSections.language ? '−' : '+'}</div>
            </button>
            {expandedSections.language && (
              <div className="mt-2 space-y-3">
                {findingsByCategory.language.length === 0 ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    All language checks passed!
                  </div>
                ) : (
                  findingsByCategory.language.map(finding => (
                    <FindingCard key={finding.id} finding={finding} getSeverityStyle={getSeverityStyle} dismissed={dismissedFindings[finding.id]} onDismiss={handleDismissFinding} onRestore={handleRestoreFinding} />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Export Button */}
          <div className="flex gap-3">
            <button
              onClick={handleExportQAReport}
              className="px-6 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 font-medium"
            >
              Export QA Report
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!qaResults && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-4">Click "Run Full QA Review" to analyze your inspection report</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FINDING CARD COMPONENT
// ============================================================================
function FindingCard({ finding, getSeverityStyle, dismissed, onDismiss, onRestore }) {
  const [showDismissForm, setShowDismissForm] = React.useState(false);
  const [dismissReason, setDismissReason] = React.useState('');
  const style = getSeverityStyle(finding.severity);

  if (dismissed) {
    return (
      <div className="p-3 border rounded-lg bg-gray-100 border-gray-200 opacity-70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 line-through text-sm">{finding.title}</span>
            <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs font-medium">Acknowledged</span>
          </div>
          <button
            onClick={() => onRestore(finding.id)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
          >
            Restore
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">Reason: {dismissed.reason}</p>
      </div>
    );
  }

  return (
    <div className={`p-4 border rounded-lg ${style.bgColor} ${style.borderColor}`}>
      <div className="flex gap-3">
        <div className={`text-xl font-bold ${style.color} flex-shrink-0 mt-0.5`}>
          {style.icon}
        </div>
        <div className="flex-grow">
          <h4 className="font-semibold text-gray-900 mb-1">{finding.title}</h4>
          <p className="text-sm text-gray-700 mb-2">{finding.description}</p>
          <div className="text-xs text-gray-600 mb-2">
            <span className="font-medium">Affected Tab:</span> {finding.affectedTab}
          </div>
          <p className="text-sm italic text-gray-600 mb-3">
            <span className="font-medium">Suggested Fix:</span> {finding.suggestedFix}
          </p>
          {/* Override/Acknowledge controls */}
          {!showDismissForm ? (
            <button
              onClick={() => setShowDismissForm(true)}
              className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium"
            >
              Acknowledge & Proceed
            </button>
          ) : (
            <div className="flex gap-2 items-center mt-1">
              <input
                type="text"
                placeholder="Reason (e.g., N/A for this inspection type)"
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                className="flex-grow text-xs px-2 py-1 border border-gray-300 rounded"
              />
              <button
                onClick={() => { onDismiss(finding.id, dismissReason || 'Acknowledged by inspector'); setShowDismissForm(false); setDismissReason(''); }}
                className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
              >
                Confirm
              </button>
              <button
                onClick={() => { setShowDismissForm(false); setDismissReason(''); }}
                className="text-xs px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QAReviewPanel;
