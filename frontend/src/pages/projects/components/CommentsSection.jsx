/**
 * CommentsSection Component
 * Handles comments for a task
 */
import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { toast } from 'sonner';
import RichTextEditor from '../../../components/ui/rich-text-editor';
import { API } from './taskConfig';

const CommentsSection = ({ taskId, token, users = [] }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState([]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`${API}/api/projects/tasks/${taskId}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setComments(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchComments(); }, [taskId]);

  const addComment = async () => {
    if (!newComment.trim() || newComment === '<p></p>') return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/projects/comments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          task_id: taskId, 
          content: newComment,
          mentions: mentionedUsers 
        })
      });
      if (res.ok) {
        setNewComment('');
        setMentionedUsers([]);
        fetchComments();
      }
    } catch (e) { toast.error('Failed to add comment'); }
    finally { setSubmitting(false); }
  };

  const deleteComment = async (id) => {
    try {
      await fetch(`${API}/api/projects/comments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchComments();
    } catch (e) { toast.error('Failed to delete'); }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="animate-pulse h-20 bg-[#E8D5C4] rounded"></div>;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <RichTextEditor
          content={newComment}
          onChange={setNewComment}
          onMentionsChange={setMentionedUsers}
          placeholder="Write a comment... Use @ to mention someone"
          users={users}
          minHeight="80px"
        />
        <Button 
          onClick={addComment} 
          disabled={submitting || !newComment.trim() || newComment === '<p></p>'} 
          size="sm" 
          className="bg-rose-600 hover:bg-rose-700 text-white btn-hover"
        >
          {submitting ? 'Posting...' : 'Post Comment'}
        </Button>
      </div>
      
      {comments.length === 0 ? (
        <p className="text-[#9C8C74] text-sm text-center py-4 tab-content-animate">No comments yet</p>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {comments.map((comment, index) => (
            <div 
              key={comment.id} 
              className={`p-3 bg-[#FDF8F3] border border-[#E8D5C4] rounded-lg group item-hover stagger-${Math.min(index + 1, 5)}`}
              style={{ animationFillMode: 'both' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#E8D5C4] flex items-center justify-center text-xs font-medium text-[#4A3728] transition-transform hover:scale-110">
                    {comment.author_name?.charAt(0) || '?'}
                  </div>
                  <span className="text-sm font-medium text-[#4A3728]">{comment.author_name}</span>
                  <span className="text-xs text-[#9C8C74]">{formatDate(comment.created_at)}</span>
                </div>
                <button 
                  onClick={() => deleteComment(comment.id)} 
                  className="text-[#9C8C74] hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="text-sm text-[#6B5D52] rich-content" dangerouslySetInnerHTML={{ __html: comment.content }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentsSection;
