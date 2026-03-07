import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import {
  Phone,
  Mail,
  GripVertical,
  Calendar,
  User
} from 'lucide-react';

const PIPELINE_STAGES = [
  { id: 'New Lead', color: 'bg-blue-500' },
  { id: 'Contacted', color: 'bg-yellow-500' },
  { id: 'Styling Session Scheduled', color: 'bg-purple-500' },
  { id: 'Styling Completed', color: 'bg-indigo-500' },
  { id: 'Trial / Selection', color: 'bg-orange-500' },
  { id: 'Order Confirmed', color: 'bg-emerald-500' },
];

const PipelinePage = () => {
  const { api } = useAuth();
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leadsRes, usersRes] = await Promise.all([
        api.get('/leads'),
        api.get('/users')
      ]);
      // Filter out closed lost from pipeline view
      setLeads(leadsRes.data.filter(l => l.stage !== 'Closed Lost'));
      setUsers(usersRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, newStage) => {
    e.preventDefault();
    if (!draggedLead || draggedLead.stage === newStage) {
      setDraggedLead(null);
      return;
    }

    try {
      await api.put(`/leads/${draggedLead.id}`, { stage: newStage });
      setLeads(prev =>
        prev.map(l =>
          l.id === draggedLead.id ? { ...l, stage: newStage } : l
        )
      );
      toast.success(`Lead moved to ${newStage}`);
    } catch (error) {
      toast.error('Failed to update lead');
    }
    setDraggedLead(null);
  };

  const handleAssign = async (leadId, userId) => {
    try {
      await api.put(`/leads/${leadId}`, { assigned_to: userId });
      const user = users.find(u => u.id === userId);
      setLeads(prev =>
        prev.map(l =>
          l.id === leadId ? { ...l, assigned_to: userId, assigned_to_name: user?.name } : l
        )
      );
      toast.success('Lead assigned');
    } catch (error) {
      toast.error('Failed to assign lead');
    }
  };

  const getLeadsByStage = (stage) => leads.filter(l => l.stage === stage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading pipeline...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-slide-in" data-testid="pipeline-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading text-foreground">Lead Pipeline</h1>
        <p className="text-muted-foreground mt-1 font-body text-sm">Drag and drop leads across stages</p>
      </div>

      {/* Pipeline Board */}
      <div className="flex gap-4 overflow-x-auto pb-4" data-testid="pipeline-board">
        {PIPELINE_STAGES.map((stage) => {
          const stageLeads = getLeadsByStage(stage.id);
          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-80"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Stage Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                <h3 className="font-heading text-sm">{stage.id}</h3>
                <Badge variant="outline" className="rounded-full text-xs ml-auto">
                  {stageLeads.length}
                </Badge>
              </div>

              {/* Stage Column */}
              <div
                className="pipeline-column"
                data-testid={`pipeline-column-${stage.id.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead)}
                    data-testid={`pipeline-lead-${lead.id}`}
                    className={`pipeline-card ${
                      draggedLead?.id === lead.id ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Lead Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                        <div>
                          <h4 className="font-medium text-sm">{lead.name}</h4>
                          {lead.occasion && (
                            <p className="text-xs text-muted-foreground">{lead.occasion}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="rounded-full text-[10px]">
                        {lead.source}
                      </Badge>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1 mb-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3" />
                        {lead.phone}
                      </div>
                      {lead.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3" />
                          {lead.email}
                        </div>
                      )}
                    </div>

                    {/* Assignment */}
                    <div className="pt-3 border-t border-border">
                      <Select
                        value={lead.assigned_to || ''}
                        onValueChange={(value) => handleAssign(lead.id, value)}
                      >
                        <SelectTrigger className="h-8 rounded-none text-xs">
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3" />
                            <span>{lead.assigned_to_name || 'Unassigned'}</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(lead.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}

                {stageLeads.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No leads in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelinePage;
