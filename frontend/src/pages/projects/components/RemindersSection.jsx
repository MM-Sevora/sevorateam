/**
 * RemindersSection Component
 * Handles follow-up reminders for a task
 */
import React, { useState, useEffect } from 'react';
import { Plus, Bell, BellRing, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { toast } from 'sonner';
import { API } from './taskConfig';

const RemindersSection = ({ taskId, token }) => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newReminder, setNewReminder] = useState({ remind_at: '', message: '' });
  const [saving, setSaving] = useState(false);

  const fetchReminders = async () => {
    try {
      const response = await fetch(`${API}/api/projects/reminders?task_id=${taskId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setReminders(data);
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [taskId]);

  const handleCreate = async () => {
    if (!newReminder.remind_at) {
      toast.error('Please select a date and time');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API}/api/projects/reminders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task_id: taskId,
          remind_at: new Date(newReminder.remind_at).toISOString(),
          message: newReminder.message || null
        })
      });

      if (!response.ok) throw new Error('Failed to create reminder');
      
      toast.success('Follow-up reminder created');
      setNewReminder({ remind_at: '', message: '' });
      setShowCreate(false);
      fetchReminders();
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast.error('Failed to create reminder');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (reminderId) => {
    try {
      const response = await fetch(`${API}/api/projects/reminders/${reminderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete reminder');
      
      toast.success('Reminder deleted');
      setReminders(reminders.filter(r => r.id !== reminderId));
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast.error('Failed to delete reminder');
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isPast = (dateStr) => new Date(dateStr) < new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-5 h-5 animate-spin text-[#9C8C74]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6B5D52]">
          Set reminders to follow up on this task
        </p>
        <Button
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
          className="bg-rose-600 hover:bg-rose-700 text-white"
          data-testid="add-reminder-btn"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Reminder
        </Button>
      </div>

      {showCreate && (
        <div className="p-4 bg-[#FDF8F3] rounded-lg border border-[#E8D5C4] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#6B5D52] text-xs">Remind me at *</Label>
              <Input
                type="datetime-local"
                value={newReminder.remind_at}
                onChange={(e) => setNewReminder({ ...newReminder, remind_at: e.target.value })}
                className="border-[#D4BBA6] bg-white mt-1"
                min={new Date().toISOString().slice(0, 16)}
                data-testid="reminder-datetime-input"
              />
            </div>
            <div>
              <Label className="text-[#6B5D52] text-xs">Message (optional)</Label>
              <Input
                value={newReminder.message}
                onChange={(e) => setNewReminder({ ...newReminder, message: e.target.value })}
                className="border-[#D4BBA6] bg-white mt-1"
                placeholder="Follow up on progress..."
                data-testid="reminder-message-input"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreate(false)}
              className="border-[#D4BBA6] text-[#5D4A3A]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={saving}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              data-testid="save-reminder-btn"
            >
              {saving ? 'Saving...' : 'Save Reminder'}
            </Button>
          </div>
        </div>
      )}

      {reminders.length === 0 ? (
        <div className="text-center py-8 text-[#9C8C74]">
          <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No follow-up reminders set</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reminders.map(reminder => (
            <div
              key={reminder.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                reminder.is_sent 
                  ? 'bg-stone-50 border-stone-200 opacity-60' 
                  : isPast(reminder.remind_at)
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-[#E8D5C4]'
              }`}
              data-testid={`reminder-${reminder.id}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  reminder.is_sent 
                    ? 'bg-stone-100' 
                    : isPast(reminder.remind_at)
                      ? 'bg-red-100'
                      : 'bg-amber-100'
                }`}>
                  {reminder.is_sent ? (
                    <CheckCircle2 className="w-4 h-4 text-stone-500" />
                  ) : (
                    <BellRing className={`w-4 h-4 ${isPast(reminder.remind_at) ? 'text-red-600' : 'text-amber-600'}`} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#4A3728]">
                    {formatDate(reminder.remind_at)}
                  </p>
                  {reminder.message && (
                    <p className="text-xs text-[#6B5D52]">{reminder.message}</p>
                  )}
                  {reminder.is_sent && (
                    <Badge className="mt-1 bg-stone-100 text-stone-600 text-xs">Sent</Badge>
                  )}
                </div>
              </div>
              {!reminder.is_sent && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(reminder.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  data-testid={`delete-reminder-${reminder.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RemindersSection;
