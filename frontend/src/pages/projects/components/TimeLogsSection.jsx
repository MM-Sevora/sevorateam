/**
 * TimeLogsSection Component
 * Handles time tracking for a task
 */
import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { toast } from 'sonner';
import { API } from './taskConfig';

const TimeLogsSection = ({ taskId, task, token, onUpdate }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ hours: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API}/api/projects/tasks/${taskId}/time-logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setLogs(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [taskId]);

  const addTimeLog = async () => {
    if (!formData.hours) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/projects/time-logs`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          task_id: taskId, 
          hours: parseFloat(formData.hours),
          description: formData.description 
        })
      });
      if (res.ok) {
        setFormData({ hours: '', description: '' });
        setShowForm(false);
        fetchLogs();
        onUpdate?.();
        toast.success('Time logged');
      }
    } catch (e) { toast.error('Failed to log time'); }
    finally { setSubmitting(false); }
  };

  const totalLogged = logs.reduce((sum, log) => sum + (log.hours || 0), 0);
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (loading) return <div className="animate-pulse h-20 bg-[#E8D5C4] rounded"></div>;

  return (
    <div className="space-y-4">
      {/* Time Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-[#FDF8F3] border border-[#E8D5C4] rounded-lg text-center transition-all duration-200 hover:shadow-md hover:border-[#D4BBA6]">
          <p className="text-xs text-[#6B5D52]">Estimated</p>
          <p className="text-lg font-bold text-[#4A3728]">{task?.estimated_hours || '-'}h</p>
        </div>
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center transition-all duration-200 hover:shadow-md hover:border-emerald-300">
          <p className="text-xs text-emerald-700">Logged</p>
          <p className="text-lg font-bold text-emerald-600">{totalLogged.toFixed(1)}h</p>
        </div>
        <div className="p-3 bg-[#FDF8F3] border border-[#E8D5C4] rounded-lg text-center transition-all duration-200 hover:shadow-md hover:border-[#D4BBA6]">
          <p className="text-xs text-[#6B5D52]">Remaining</p>
          <p className={`text-lg font-bold ${(task?.estimated_hours || 0) - totalLogged < 0 ? 'text-red-600' : 'text-blue-600'}`}>
            {task?.estimated_hours ? ((task.estimated_hours - totalLogged).toFixed(1)) : '-'}h
          </p>
        </div>
      </div>

      {/* Log Time Form */}
      {showForm ? (
        <div className="p-3 bg-white rounded-lg border border-[#D4BBA6] space-y-3 tab-content-animate">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#6B5D52] text-xs">Hours *</Label>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                placeholder="1.5"
                className="border-[#D4BBA6] mt-1 transition-all duration-200 focus:shadow-md"
                data-testid="time-hours-input"
              />
            </div>
            <div>
              <Label className="text-[#6B5D52] text-xs">Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What did you work on?"
                className="border-[#D4BBA6] mt-1 transition-all duration-200 focus:shadow-md"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={addTimeLog} disabled={submitting || !formData.hours} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white btn-hover">
              {submitting ? 'Saving...' : 'Log Time'}
            </Button>
            <Button onClick={() => setShowForm(false)} variant="outline" size="sm" className="border-[#D4BBA6] text-[#4A3728] transition-all duration-200 hover:bg-[#F5EBE0]">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setShowForm(true)} variant="outline" size="sm" className="w-full border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0] transition-all duration-200 hover:shadow-md">
          <Timer className="w-4 h-4 mr-2" />
          Log Time
        </Button>
      )}

      {/* Time Logs List */}
      {logs.length > 0 && (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {logs.map((log, index) => (
            <div 
              key={log.id} 
              className={`flex items-center justify-between p-2 bg-[#FDF8F3] border border-[#E8D5C4] rounded text-sm item-hover stagger-${Math.min(index + 1, 5)}`}
              style={{ animationFillMode: 'both' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#E8D5C4] flex items-center justify-center text-xs text-[#4A3728] transition-transform hover:scale-110">
                  {log.user_name?.charAt(0) || '?'}
                </div>
                <div>
                  <span className="text-[#4A3728] font-medium">{log.hours}h</span>
                  {log.description && <span className="text-[#6B5D52] ml-2">- {log.description}</span>}
                </div>
              </div>
              <span className="text-xs text-[#9C8C74]">{formatDate(log.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimeLogsSection;
