import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  Plus, Trash2, Clock, Calendar, Save, X, Loader2, CheckCircle, AlertTriangle,
  Settings, Play, Pause, ChevronDown
} from 'lucide-react';
import { FaLinkedin, FaFacebook, FaInstagram, FaTwitter } from 'react-icons/fa';

const PLATFORMS = [
  { key: 'linkedin', label: 'LinkedIn', icon: FaLinkedin, color: '#0A66C2' },
  { key: 'twitter', label: 'Twitter/X', icon: FaTwitter, color: '#1DA1F2' },
  { key: 'instagram', label: 'Instagram', icon: FaInstagram, color: '#E4405F' },
  { key: 'facebook', label: 'Facebook', icon: FaFacebook, color: '#1877F2' },
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
];

export default function PostingQueues() {
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingQueue, setEditingQueue] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedQueue, setExpandedQueue] = useState(null);

  useEffect(() => {
    fetchQueues();
  }, []);

  const fetchQueues = async () => {
    setLoading(true);
    try {
      const res = await api.get('/social/workflows/queues');
      setQueues(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load queues');
    } finally {
      setLoading(false);
    }
  };

  const createNewQueue = (platform = 'linkedin') => {
    setEditingQueue({
      name: `${PLATFORMS.find(p => p.key === platform)?.label || 'New'} Queue`,
      platform,
      description: '',
      is_active: true,
      timezone: 'UTC',
      time_slots: []
    });
  };

  const addTimeSlot = () => {
    if (!editingQueue) return;
    const newSlot = {
      slot_id: `slot-${Date.now()}`,
      day_of_week: 1, // Monday
      time: '09:00',
      label: 'Morning'
    };
    setEditingQueue({
      ...editingQueue,
      time_slots: [...editingQueue.time_slots, newSlot]
    });
  };

  const addBulkSlots = (times) => {
    if (!editingQueue) return;
    const newSlots = [];
    for (let day = 0; day < 7; day++) {
      times.forEach((time, idx) => {
        newSlots.push({
          slot_id: `slot-${Date.now()}-${day}-${idx}`,
          day_of_week: day,
          time: time,
          label: idx === 0 ? 'Morning' : idx === 1 ? 'Afternoon' : 'Evening'
        });
      });
    }
    setEditingQueue({
      ...editingQueue,
      time_slots: [...editingQueue.time_slots, ...newSlots]
    });
  };

  const removeTimeSlot = (slotId) => {
    if (!editingQueue) return;
    setEditingQueue({
      ...editingQueue,
      time_slots: editingQueue.time_slots.filter(s => s.slot_id !== slotId)
    });
  };

  const updateTimeSlot = (slotId, field, value) => {
    if (!editingQueue) return;
    setEditingQueue({
      ...editingQueue,
      time_slots: editingQueue.time_slots.map(s =>
        s.slot_id === slotId ? { ...s, [field]: value } : s
      )
    });
  };

  const saveQueue = async () => {
    if (!editingQueue) return;
    if (!editingQueue.name.trim()) {
      setError('Queue name is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editingQueue.queue_id) {
        await api.put(`/social/workflows/queues/${editingQueue.queue_id}`, editingQueue);
      } else {
        await api.post('/social/workflows/queues', editingQueue);
      }
      setSuccess('Queue saved successfully');
      setEditingQueue(null);
      fetchQueues();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save queue');
    } finally {
      setSaving(false);
    }
  };

  const deleteQueue = async (queueId) => {
    if (!window.confirm('Delete this queue?')) return;
    try {
      await api.delete(`/social/workflows/queues/${queueId}`);
      fetchQueues();
    } catch (err) {
      setError('Failed to delete queue');
    }
  };

  const toggleQueueActive = async (queue) => {
    try {
      await api.put(`/social/workflows/queues/${queue.queue_id}`, {
        is_active: !queue.is_active
      });
      fetchQueues();
    } catch (err) {
      setError('Failed to toggle queue');
    }
  };

  const seedDefaults = async () => {
    try {
      await api.post('/social/workflows/seed-defaults');
      fetchQueues();
      setSuccess('Default queues created for all platforms');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to create defaults');
    }
  };

  // Group time slots by day
  const groupSlotsByDay = (slots) => {
    const grouped = {};
    DAYS_OF_WEEK.forEach((_, idx) => { grouped[idx] = []; });
    slots.forEach(slot => {
      if (grouped[slot.day_of_week]) {
        grouped[slot.day_of_week].push(slot);
      }
    });
    // Sort each day's slots by time
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => a.time.localeCompare(b.time));
    });
    return grouped;
  };

  return (
    <div className="space-y-5 p-8 animate-fade-in" data-testid="posting-queues-page">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#5D4A3A] mb-1">SOCIAL MEDIA</p>
          <h1 className="text-2xl font-bold text-[#4A3728] tracking-tight">Posting Queues</h1>
          <p className="text-sm text-[#5D4A3A] mt-1">Schedule posts at optimal times with predefined time slots</p>
        </div>
        <div className="flex items-center gap-2">
          {queues.length === 0 && (
            <button
              onClick={seedDefaults}
              className="px-4 py-2 border border-[#E8D5C4] rounded-lg text-sm text-[#5D4A3A] hover:bg-[#F5EDE5] transition-colors"
            >
              Create Default Queues
            </button>
          )}
          <button
            onClick={() => createNewQueue()}
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium px-5 py-2.5 flex items-center gap-2"
            data-testid="new-queue-btn"
          >
            <Plus className="w-4 h-4" /> New Queue
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
        </div>
      ) : editingQueue ? (
        /* Editor Panel */
        <div className="bg-white border border-[#E8D5C4] rounded-xl p-6" data-testid="queue-editor">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#4A3728]">
              {editingQueue.queue_id ? 'Edit Queue' : 'New Queue'}
            </h2>
            <button onClick={() => setEditingQueue(null)} className="p-2 hover:bg-[#F5EDE5] rounded-lg text-[#5D4A3A]">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-xs text-[#5D4A3A] font-medium mb-1.5 block">Queue Name *</label>
              <input
                type="text"
                value={editingQueue.name}
                onChange={(e) => setEditingQueue({ ...editingQueue, name: e.target.value })}
                className="w-full bg-white border border-[#D4BBA6] rounded-lg px-3 py-2 text-sm text-[#4A3728]"
              />
            </div>
            <div>
              <label className="text-xs text-[#5D4A3A] font-medium mb-1.5 block">Platform *</label>
              <select
                value={editingQueue.platform}
                onChange={(e) => setEditingQueue({ ...editingQueue, platform: e.target.value })}
                className="w-full bg-white border border-[#D4BBA6] rounded-lg px-3 py-2 text-sm text-[#4A3728]"
              >
                {PLATFORMS.map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#5D4A3A] font-medium mb-1.5 block">Timezone</label>
              <select
                value={editingQueue.timezone}
                onChange={(e) => setEditingQueue({ ...editingQueue, timezone: e.target.value })}
                className="w-full bg-white border border-[#D4BBA6] rounded-lg px-3 py-2 text-sm text-[#4A3728]"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Add */}
          <div className="mb-4 p-3 bg-[#F5EDE5] rounded-lg">
            <p className="text-xs text-[#5D4A3A] font-medium mb-2">Quick Add (all 7 days)</p>
            <div className="flex gap-2">
              <button
                onClick={() => addBulkSlots(['09:00', '12:00', '17:00'])}
                className="px-3 py-1.5 bg-white border border-[#D4BBA6] rounded-lg text-xs text-[#5D4A3A] hover:border-rose-300"
              >
                9am, 12pm, 5pm
              </button>
              <button
                onClick={() => addBulkSlots(['08:00', '13:00', '19:00'])}
                className="px-3 py-1.5 bg-white border border-[#D4BBA6] rounded-lg text-xs text-[#5D4A3A] hover:border-rose-300"
              >
                8am, 1pm, 7pm
              </button>
              <button
                onClick={() => addBulkSlots(['10:00', '15:00'])}
                className="px-3 py-1.5 bg-white border border-[#D4BBA6] rounded-lg text-xs text-[#5D4A3A] hover:border-rose-300"
              >
                10am, 3pm
              </button>
            </div>
          </div>

          {/* Time Slots */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-[#5D4A3A] font-medium">Time Slots</label>
              <button
                onClick={addTimeSlot}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Slot
              </button>
            </div>

            {editingQueue.time_slots.length === 0 ? (
              <div className="text-center py-8 bg-[#F5EDE5] rounded-lg border border-dashed border-[#D4BBA6]">
                <Clock className="w-8 h-8 text-[#9ca3af] mx-auto mb-2" />
                <p className="text-sm text-[#5D4A3A]">No time slots yet</p>
                <p className="text-xs text-[#9ca3af]">Use quick add above or add individual slots</p>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map((day, dayIdx) => {
                  const daySlots = editingQueue.time_slots.filter(s => s.day_of_week === dayIdx);
                  return (
                    <div key={dayIdx} className="bg-[#F5EDE5] rounded-lg p-2">
                      <p className="text-xs font-medium text-[#4A3728] mb-2 text-center">{day}</p>
                      <div className="space-y-1">
                        {daySlots.sort((a, b) => a.time.localeCompare(b.time)).map(slot => (
                          <div key={slot.slot_id} className="flex items-center gap-1 bg-white rounded px-2 py-1">
                            <input
                              type="time"
                              value={slot.time}
                              onChange={(e) => updateTimeSlot(slot.slot_id, 'time', e.target.value)}
                              className="flex-1 text-xs text-[#4A3728] border-none bg-transparent p-0"
                            />
                            <button
                              onClick={() => removeTimeSlot(slot.slot_id)}
                              className="text-[#9ca3af] hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newSlot = {
                              slot_id: `slot-${Date.now()}`,
                              day_of_week: dayIdx,
                              time: '12:00',
                              label: ''
                            };
                            setEditingQueue({
                              ...editingQueue,
                              time_slots: [...editingQueue.time_slots, newSlot]
                            });
                          }}
                          className="w-full text-center text-[10px] text-rose-500 hover:text-rose-600 py-1"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Toggle */}
          <label className="flex items-center gap-2 text-sm text-[#5D4A3A] mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={editingQueue.is_active}
              onChange={(e) => setEditingQueue({ ...editingQueue, is_active: e.target.checked })}
              className="rounded bg-white border-[#D4BBA6] text-rose-500 focus:ring-rose-500/20"
            />
            Queue is active
          </label>

          {/* Save Button */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditingQueue(null)}
              className="px-4 py-2 border border-[#D4BBA6] rounded-lg text-sm text-[#5D4A3A] hover:bg-[#F5EDE5]"
            >
              Cancel
            </button>
            <button
              onClick={saveQueue}
              disabled={saving}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Queue
            </button>
          </div>
        </div>
      ) : (
        /* Queue List */
        <div className="grid grid-cols-2 gap-4">
          {queues.length === 0 ? (
            <div className="col-span-2 text-center py-16 bg-white border border-[#E8D5C4] rounded-xl">
              <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-lg font-semibold text-[#4A3728]">No Posting Queues</h3>
              <p className="text-sm text-[#5D4A3A] mt-2 max-w-md mx-auto">
                Create queues with optimal posting times for each platform
              </p>
              <button
                onClick={seedDefaults}
                className="mt-6 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium px-6 py-2.5 text-sm inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Default Queues
              </button>
            </div>
          ) : (
            queues.map(queue => {
              const platform = PLATFORMS.find(p => p.key === queue.platform);
              const PlatformIcon = platform?.icon || FaLinkedin;
              const isExpanded = expandedQueue === queue.queue_id;
              const groupedSlots = groupSlotsByDay(queue.time_slots || []);

              return (
                <div
                  key={queue.queue_id}
                  className="bg-white border border-[#E8D5C4] rounded-xl overflow-hidden hover:border-[#D4BBA6] transition-colors"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${platform?.color}15` }}
                        >
                          <PlatformIcon className="w-5 h-5" style={{ color: platform?.color }} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#4A3728]">{queue.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-[#5D4A3A]">{queue.timezone}</span>
                            <span className="text-xs text-[#5D4A3A]">•</span>
                            <span className="text-xs text-[#5D4A3A]">{queue.time_slots?.length || 0} slots</span>
                            <span className="text-xs text-[#5D4A3A]">•</span>
                            <span className="text-xs text-[#5D4A3A]">{queue.posts_in_queue || 0} queued</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleQueueActive(queue)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            queue.is_active
                              ? 'bg-green-100 text-green-600 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                          title={queue.is_active ? 'Active' : 'Paused'}
                        >
                          {queue.is_active ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setEditingQueue(queue)}
                          className="p-1.5 hover:bg-[#F5EDE5] rounded-lg text-[#5D4A3A]"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteQueue(queue.queue_id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-[#5D4A3A] hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpandedQueue(isExpanded ? null : queue.queue_id)}
                      className="w-full mt-3 flex items-center justify-center gap-1 text-xs text-[#5D4A3A] hover:text-[#4A3728]"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      {isExpanded ? 'Hide schedule' : 'View schedule'}
                    </button>
                  </div>

                  {/* Expanded Schedule */}
                  {isExpanded && (
                    <div className="border-t border-[#E8D5C4] p-4 bg-[#F5EDE5]/50">
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {DAYS_OF_WEEK.map((day, idx) => (
                          <div key={idx}>
                            <p className="text-[10px] font-medium text-[#5D4A3A] mb-1">{day}</p>
                            <div className="space-y-0.5">
                              {groupedSlots[idx]?.map(slot => (
                                <div
                                  key={slot.slot_id}
                                  className="text-[10px] bg-white rounded px-1 py-0.5 text-[#4A3728]"
                                >
                                  {slot.time}
                                </div>
                              ))}
                              {groupedSlots[idx]?.length === 0 && (
                                <span className="text-[10px] text-[#9ca3af]">—</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
