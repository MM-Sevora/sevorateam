/**
 * AttachmentsSection Component
 * Handles file attachments for a task
 */
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, Trash2, File, FileText, Image } from 'lucide-react';
import { toast } from 'sonner';
import { API } from './taskConfig';

const AttachmentsSection = ({ taskId, token }) => {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`${API}/api/projects/tasks/${taskId}/attachments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setAttachments(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAttachments(); }, [taskId]);

  const uploadFile = async (file) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API}/api/projects/tasks/${taskId}/attachments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        toast.success('File uploaded');
        fetchAttachments();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to upload');
      }
    } catch (e) {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files?.length) {
      Array.from(files).forEach(uploadFile);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer?.files;
    if (files?.length) {
      Array.from(files).forEach(uploadFile);
    }
  };

  const downloadAttachment = async (attachment) => {
    try {
      const res = await fetch(`${API}/api/projects/attachments/${attachment.id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.original_filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      toast.error('Failed to download file');
    }
  };

  const deleteAttachment = async (id) => {
    try {
      const res = await fetch(`${API}/api/projects/attachments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAttachments();
        toast.success('Attachment deleted');
      }
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (contentType) => {
    if (contentType?.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
    if (contentType?.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-[#6B5D52]" />;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) return <div className="animate-pulse h-20 bg-[#E8D5C4] rounded"></div>;

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-all duration-200
          ${dragActive 
            ? 'border-rose-500 bg-rose-50' 
            : 'border-[#D4BBA6] hover:border-[#9C8C74] hover:bg-[#FDF8F3]'
          }
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          data-testid="file-input"
        />
        <Upload className={`w-8 h-8 mx-auto mb-2 ${dragActive ? 'text-rose-500' : 'text-[#9C8C74]'}`} />
        <p className="text-sm text-[#6B5D52]">
          {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
        </p>
        <p className="text-xs text-[#9C8C74] mt-1">Max 10MB per file</p>
      </div>

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <p className="text-[#9C8C74] text-sm text-center py-4 tab-content-animate">No attachments yet</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((att, index) => (
            <div
              key={att.id}
              className={`flex items-center gap-3 p-3 bg-[#FDF8F3] border border-[#E8D5C4] rounded-lg group item-hover stagger-${Math.min(index + 1, 5)}`}
              style={{ animationFillMode: 'both' }}
            >
              {getFileIcon(att.content_type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#4A3728] truncate">{att.original_filename}</p>
                <p className="text-xs text-[#9C8C74]">
                  {formatFileSize(att.size)} • {formatDate(att.created_at)}
                  {att.uploaded_by_name && ` • ${att.uploaded_by_name}`}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => downloadAttachment(att)}
                  className="p-1.5 text-[#6B5D52] hover:text-[#4A3728] hover:bg-[#E8D5C4] rounded transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteAttachment(att.id)}
                  className="p-1.5 text-[#9C8C74] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttachmentsSection;
