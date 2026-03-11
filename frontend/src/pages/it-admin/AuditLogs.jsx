import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  FileText, Search, Filter, Download, User, Package, Clock, Eye, Key, Shield
} from 'lucide-react';
import { Input } from '../../components/ui/input';

const ACTION_TYPES = [
  { value: 'all', label: 'All Actions' },
  { value: 'tool_created', label: 'Tool Created' },
  { value: 'tool_updated', label: 'Tool Updated' },
  { value: 'tool_deleted', label: 'Tool Deleted' },
  { value: 'access_granted', label: 'Access Granted' },
  { value: 'access_revoked', label: 'Access Revoked' },
  { value: 'credential_created', label: 'Credential Created' },
  { value: 'credential_viewed', label: 'Credential Viewed' },
  { value: 'credential_updated', label: 'Credential Updated' },
  { value: 'request_submitted', label: 'Request Submitted' },
  { value: 'request_approved', label: 'Request Approved' },
  { value: 'request_rejected', label: 'Request Rejected' },
  { value: 'user_onboarded', label: 'User Onboarded' },
  { value: 'user_offboarded', label: 'User Offboarded' }
];

const getActionIcon = (action) => {
  if (action.includes('tool')) return Package;
  if (action.includes('access')) return Key;
  if (action.includes('credential')) return Shield;
  if (action.includes('request')) return Clock;
  if (action.includes('user')) return User;
  return FileText;
};

const getActionColor = (action) => {
  if (action.includes('created') || action.includes('granted') || action.includes('approved') || action.includes('onboard')) {
    return 'bg-green-100 text-green-800';
  }
  if (action.includes('deleted') || action.includes('revoked') || action.includes('rejected') || action.includes('offboard')) {
    return 'bg-red-100 text-red-800';
  }
  if (action.includes('viewed')) {
    return 'bg-blue-100 text-blue-800';
  }
  return 'bg-gray-100 text-gray-800';
};

const AuditLogs = () => {
  const { api } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const limit = 50;

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `/acms/audit-logs?skip=${page * limit}&limit=${limit}`;
      if (actionFilter) url += `&action=${actionFilter}`;
      
      const response = await api.get(url);
      setLogs(response.data.logs || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log =>
    log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entity_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatAction = (action) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  return (
    <div className="space-y-6" data-testid="audit-logs">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 mt-1">Track all access and credential management activities</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={actionFilter || "all"} onValueChange={(v) => { setActionFilter(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map(action => (
                  <SelectItem key={action.value || "all"} value={action.value || "all"}>{action.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredLogs.map((log, index) => {
                      const ActionIcon = getActionIcon(log.action);
                      const { date, time } = formatTimestamp(log.timestamp);
                      
                      return (
                        <tr key={log.id || index} className="hover:bg-gray-50" data-testid={`log-row-${index}`}>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">{date}</div>
                            <div className="text-xs text-gray-500">{time}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-500" />
                              </div>
                              <span className="text-sm font-medium">{log.user_name || 'System'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={getActionColor(log.action)}>
                              <ActionIcon className="w-3 h-3 mr-1" />
                              {formatAction(log.action)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-700">{log.entity_name}</span>
                            <span className="text-xs text-gray-400 block">{log.entity_type}</span>
                          </td>
                          <td className="px-4 py-3">
                            {log.details && Object.keys(log.details).length > 0 ? (
                              <div className="text-xs text-gray-500">
                                {Object.entries(log.details).slice(0, 2).map(([key, value]) => (
                                  <div key={key}>
                                    <span className="font-medium">{key}:</span> {String(value).substring(0, 30)}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                          No audit logs found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <div className="text-sm text-gray-500">
                  Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of {total} logs
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page + 1) * limit >= total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
