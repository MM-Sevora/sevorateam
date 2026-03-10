import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  History, RotateCcw, Eye, Clock, User, ChevronLeft, ChevronRight,
  Loader2, CheckCircle, AlertTriangle, X, ArrowLeftRight
} from 'lucide-react';
import { format } from 'date-fns';

export default function PostVersionHistory({ postId, onClose, onRestore }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersions, setCompareVersions] = useState([null, null]);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (postId) {
      fetchVersions();
    }
  }, [postId]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/social/workflows/posts/${postId}/versions`);
      setVersions(res.data);
      if (res.data.length > 0) {
        setSelectedVersion(res.data[0]);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const restoreVersion = async (versionId) => {
    if (!window.confirm('Restore this version? Current content will be saved as a new version.')) return;
    
    setRestoring(true);
    try {
      await api.post(`/social/workflows/posts/${postId}/versions/${versionId}/restore`);
      setSuccess('Version restored successfully');
      if (onRestore) onRestore();
      setTimeout(() => {
        setSuccess('');
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      setError('Failed to restore version');
    } finally {
      setRestoring(false);
    }
  };

  const toggleCompareVersion = (version) => {
    if (compareVersions[0]?.version_id === version.version_id) {
      setCompareVersions([null, compareVersions[1]]);
    } else if (compareVersions[1]?.version_id === version.version_id) {
      setCompareVersions([compareVersions[0], null]);
    } else if (!compareVersions[0]) {
      setCompareVersions([version, compareVersions[1]]);
    } else if (!compareVersions[1]) {
      setCompareVersions([compareVersions[0], version]);
    } else {
      // Replace the second one
      setCompareVersions([compareVersions[0], version]);
    }
  };

  if (!postId) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className="bg-white rounded-2xl w-[900px] max-h-[85vh] overflow-hidden flex flex-col shadow-2xl" data-testid="version-history-modal">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8D5C4] bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-[#4A3728]">Version History</h2>
            <span className="text-xs text-[#5D4A3A] bg-white px-2 py-1 rounded-lg border border-[#E8D5C4]">
              {versions.length} versions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setCompareMode(!compareMode); setCompareVersions([null, null]); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                compareMode
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-[#5D4A3A] border border-[#D4BBA6] hover:border-amber-300'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Compare
            </button>
            <button onClick={onClose} className="p-2 hover:bg-amber-100 rounded-lg text-[#5D4A3A]">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Version List */}
          <div className="w-72 border-r border-[#E8D5C4] overflow-y-auto bg-[#F5EDE5]/30">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-12 px-4">
                <History className="w-8 h-8 text-[#9ca3af] mx-auto mb-2" />
                <p className="text-sm text-[#5D4A3A]">No versions yet</p>
                <p className="text-xs text-[#9ca3af] mt-1">Edit this post to create a version</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {versions.map((version, idx) => {
                  const isSelected = selectedVersion?.version_id === version.version_id;
                  const isCompareA = compareVersions[0]?.version_id === version.version_id;
                  const isCompareB = compareVersions[1]?.version_id === version.version_id;

                  return (
                    <div
                      key={version.version_id}
                      onClick={() => compareMode ? toggleCompareVersion(version) : setSelectedVersion(version)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        compareMode
                          ? (isCompareA || isCompareB)
                            ? 'bg-amber-100 border-2 border-amber-400'
                            : 'bg-white border border-[#E8D5C4] hover:border-amber-300'
                          : isSelected
                            ? 'bg-amber-100 border-2 border-amber-400'
                            : 'bg-white border border-[#E8D5C4] hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-[#4A3728]">
                          Version {version.version_number}
                        </span>
                        {compareMode && (isCompareA || isCompareB) && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            isCompareA ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
                          }`}>
                            {isCompareA ? 'A' : 'B'}
                          </span>
                        )}
                        {idx === 0 && !compareMode && (
                          <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-medium">
                            Latest
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#5D4A3A] line-clamp-2 mb-2">
                        {version.content?.slice(0, 80) || 'No content'}...
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-[#9ca3af]">
                        <Clock className="w-3 h-3" />
                        {version.created_at ? format(new Date(version.created_at), 'MMM d, h:mm a') : 'Unknown'}
                      </div>
                      {version.change_note && (
                        <p className="text-[10px] text-amber-600 mt-1 italic">{version.change_note}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
                <AlertTriangle className="w-4 h-4" /> {error}
              </div>
            )}
            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle className="w-4 h-4" /> {success}
              </div>
            )}

            {compareMode ? (
              /* Compare View */
              <div>
                <h3 className="text-sm font-semibold text-[#4A3728] mb-4">Compare Versions</h3>
                {!compareVersions[0] || !compareVersions[1] ? (
                  <div className="text-center py-12 bg-[#F5EDE5] rounded-lg border border-dashed border-[#D4BBA6]">
                    <ArrowLeftRight className="w-8 h-8 text-[#9ca3af] mx-auto mb-2" />
                    <p className="text-sm text-[#5D4A3A]">Select two versions to compare</p>
                    <p className="text-xs text-[#9ca3af] mt-1">Click on versions in the list</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {[compareVersions[0], compareVersions[1]].map((v, idx) => (
                      <div key={idx} className="bg-[#F5EDE5] rounded-lg p-4 border border-[#E8D5C4]">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-xs px-2 py-1 rounded font-medium ${
                            idx === 0 ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
                          }`}>
                            Version {v.version_number}
                          </span>
                          <span className="text-[10px] text-[#5D4A3A]">
                            {v.created_at ? format(new Date(v.created_at), 'MMM d, h:mm a') : ''}
                          </span>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-sm text-[#4A3728] min-h-[200px] whitespace-pre-wrap">
                          {v.content || 'No content'}
                        </div>
                        {v.image_url && (
                          <img src={v.image_url} alt="" className="mt-3 rounded-lg max-h-40 object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : selectedVersion ? (
              /* Single Version View */
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#4A3728]">
                      Version {selectedVersion.version_number}
                    </h3>
                    <p className="text-xs text-[#5D4A3A] flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3" />
                      {selectedVersion.created_at ? format(new Date(selectedVersion.created_at), 'MMMM d, yyyy h:mm a') : 'Unknown'}
                    </p>
                  </div>
                  <button
                    onClick={() => restoreVersion(selectedVersion.version_id)}
                    disabled={restoring}
                    className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    Restore This Version
                  </button>
                </div>

                {selectedVersion.change_note && (
                  <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                    {selectedVersion.change_note}
                  </div>
                )}

                {/* Content Preview */}
                <div className="bg-[#F5EDE5] rounded-lg p-4 border border-[#E8D5C4]">
                  <p className="text-xs text-[#5D4A3A] font-medium mb-2">Content</p>
                  <div className="bg-white rounded-lg p-4 text-sm text-[#4A3728] min-h-[150px] whitespace-pre-wrap">
                    {selectedVersion.content || 'No content'}
                  </div>
                </div>

                {selectedVersion.image_url && (
                  <div className="mt-4">
                    <p className="text-xs text-[#5D4A3A] font-medium mb-2">Image</p>
                    <img
                      src={selectedVersion.image_url}
                      alt=""
                      className="rounded-lg max-h-64 object-cover border border-[#E8D5C4]"
                    />
                  </div>
                )}

                {selectedVersion.platform && (
                  <div className="mt-4 text-xs text-[#5D4A3A]">
                    Platform: <span className="capitalize font-medium">{selectedVersion.platform}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Eye className="w-8 h-8 text-[#9ca3af] mx-auto mb-2" />
                <p className="text-sm text-[#5D4A3A]">Select a version to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Export a simpler component for inline use
export function VersionHistoryButton({ postId, className = '' }) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowHistory(true)}
        className={`flex items-center gap-1.5 text-xs text-[#5D4A3A] hover:text-amber-600 ${className}`}
        title="View version history"
      >
        <History className="w-3.5 h-3.5" />
        History
      </button>
      {showHistory && (
        <PostVersionHistory
          postId={postId}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
}
