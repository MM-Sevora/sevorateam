/**
 * ChecklistsSection Component
 * Handles checklist items for a task
 */
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { toast } from 'sonner';
import { API } from './taskConfig';

const ChecklistsSection = ({ taskId, token }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [recentlyToggled, setRecentlyToggled] = useState(null);

  const fetchItems = async () => {
    try {
      const res = await fetch(`${API}/api/projects/tasks/${taskId}/checklists`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setItems(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [taskId]);

  const addItem = async () => {
    if (!newItem.trim()) return;
    try {
      const res = await fetch(`${API}/api/projects/checklists`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, text: newItem })
      });
      if (res.ok) {
        setNewItem('');
        fetchItems();
      }
    } catch (e) { toast.error('Failed to add item'); }
  };

  const toggleItem = async (item) => {
    setRecentlyToggled(item.id);
    setTimeout(() => setRecentlyToggled(null), 300);
    try {
      await fetch(`${API}/api/projects/checklists/${item.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: !item.is_completed })
      });
      fetchItems();
    } catch (e) { toast.error('Failed to update'); }
  };

  const deleteItem = async (id) => {
    try {
      await fetch(`${API}/api/projects/checklists/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchItems();
    } catch (e) { toast.error('Failed to delete'); }
  };

  const completed = items.filter(i => i.is_completed).length;

  if (loading) return <div className="animate-pulse h-20 bg-[#E8D5C4] rounded"></div>;

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-[#6B5D52]">
          <div className="flex-1 h-2 bg-[#E8D5C4] rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 progress-bar-animate" 
              style={{ width: `${(completed / items.length) * 100}%` }}
            />
          </div>
          <span className="font-medium">{completed}/{items.length}</span>
        </div>
      )}
      
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add checklist item..."
          className="border-[#D4BBA6] focus:border-rose-500 flex-1 transition-all duration-200 focus:shadow-md"
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          data-testid="checklist-input"
        />
        <Button onClick={addItem} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white btn-hover">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      {items.length === 0 ? (
        <p className="text-[#9C8C74] text-sm text-center py-4 tab-content-animate">No checklist items</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div 
              key={item.id} 
              className={`flex items-center gap-3 p-3 bg-[#FDF8F3] border border-[#E8D5C4] rounded-lg group item-hover stagger-${Math.min(index + 1, 5)}`}
              style={{ animationFillMode: 'both' }}
            >
              <button onClick={() => toggleItem(item)} className="text-[#6B5D52] hover:text-[#4A3728] transition-colors">
                {item.is_completed ? (
                  <CheckCircle2 className={`w-5 h-5 text-emerald-600 ${recentlyToggled === item.id ? 'check-animate' : ''}`} />
                ) : (
                  <Circle className={`w-5 h-5 ${recentlyToggled === item.id ? 'check-animate' : ''}`} />
                )}
              </button>
              <span className={`flex-1 text-sm transition-all duration-200 ${item.is_completed ? 'line-through text-[#9C8C74]' : 'text-[#4A3728]'}`}>
                {item.text}
              </span>
              <button 
                onClick={() => deleteItem(item.id)} 
                className="text-[#9C8C74] hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChecklistsSection;
