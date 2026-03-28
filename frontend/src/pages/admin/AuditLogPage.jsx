import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileSearch, RefreshCw, Download, Filter, Search, Clock, User, 
  Activity, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight,
  Calendar, Users, Settings, BarChart3, Eye
} from 'lucide-react';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { toast } from 'sonner';

const AuditLogPage = () => {
  // State
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Filter options
  const [modules, setModules] = useState([]);
  const [actions, setActions] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Detail view
  const [selectedLog, setSelectedLog] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch audit logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (moduleFilter) params.append('module', moduleFilter);
      if (actionFilter) params.append('action', actionFilter);
      if (userFilter) params.append('user_id', userFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      params.append('limit', '100');
      
      const res = await api.get(`/audit/logs?${params.toString()}`);
      setLogs(res.data || []);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      if (err.response?.status === 403) {
        toast.error('You don\'t have access to audit logs');
      } else {
        toast.error('Failed to load audit logs');
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, moduleFilter, actionFilter, userFilter, statusFilter, dateFrom, dateTo]);

  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await api.get('/audit/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch audit stats:', err);
    }
  };

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      const [modulesRes, actionsRes, usersRes] = await Promise.all([
        api.get('/audit/modules'),
        api.get('/audit/actions'),
        api.get('/audit/users')
      ]);
      setModules(modulesRes.data || []);
      setActions(actionsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
    fetchFilterOptions();
  }, [fetchLogs]);

  // Export logs
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (moduleFilter) params.append('module', moduleFilter);
      if (actionFilter) params.append('action', actionFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      
      const res = await api.post(`/audit/export?${params.toString()}`);
      
      // Download as JSON
      const blob = new Blob([JSON.stringify(res.data.logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${res.data.count} audit log entries`);
    } catch (err) {
      toast.error('Failed to export audit logs');
    } finally {
      setExporting(false);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setModuleFilter('');
    setActionFilter('');
    setUserFilter('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Get action icon and color
  const getActionDisplay = (action) => {
    const actionConfig = {
      create: { icon: CheckCircle, color: 'bg-green-100 text-green-700' },
      read: { icon: Eye, color: 'bg-blue-100 text-blue-700' },
      update: { icon: Settings, color: 'bg-yellow-100 text-yellow-700' },
      delete: { icon: XCircle, color: 'bg-red-100 text-red-700' },
      login: { icon: User, color: 'bg-indigo-100 text-indigo-700' },
      logout: { icon: User, color: 'bg-gray-100 text-gray-700' },
      export: { icon: Download, color: 'bg-purple-100 text-purple-700' },
      approve: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700' },
      reject: { icon: XCircle, color: 'bg-orange-100 text-orange-700' },
    };
    return actionConfig[action] || { icon: Activity, color: 'bg-gray-100 text-gray-700' };
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-700">Success</Badge>;
      case 'failure':
        return <Badge className="bg-red-100 text-red-700">Failed</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-700">Warning</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="audit-log-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100">
            <FileSearch className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
            <p className="text-sm text-gray-500">Track user activities and system changes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} data-testid="toggle-filters-btn">
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {showFilters ? <ChevronDown className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
          <Button variant="outline" onClick={() => { fetchLogs(); fetchStats(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport} disabled={exporting} data-testid="export-btn">
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_entries || 0}</p>
                  <p className="text-sm text-gray-500">Total Entries</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.entries_today || 0}</p>
                  <p className="text-sm text-gray-500">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.entries_this_week || 0}</p>
                  <p className="text-sm text-gray-500">This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Users className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.top_users?.length || 0}</p>
                  <p className="text-sm text-gray-500">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="search-input"
                  />
                </div>
              </div>
              
              <Select value={moduleFilter || "all"} onValueChange={(v) => setModuleFilter(v === "all" ? "" : v)}>
                <SelectTrigger data-testid="module-filter">
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {modules.map(m => (
                    <SelectItem key={m} value={m}>{m.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={actionFilter || "all"} onValueChange={(v) => setActionFilter(v === "all" ? "" : v)}>
                <SelectTrigger data-testid="action-filter">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions.map(a => (
                    <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                <SelectTrigger data-testid="status-filter">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failure">Failed</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
            
            <div className="grid grid-cols-4 gap-4 mt-4">
              <Select value={userFilter || "all"} onValueChange={(v) => setUserFilter(v === "all" ? "" : v)}>
                <SelectTrigger data-testid="user-filter">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.user_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                placeholder="From Date"
                data-testid="date-from"
              />
              
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                placeholder="To Date"
                data-testid="date-to"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FileSearch className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No audit log entries found</p>
              <p className="text-sm mt-1">Activities will appear here as users interact with the system</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => {
                  const actionDisplay = getActionDisplay(log.action);
                  const ActionIcon = actionDisplay.icon;
                  
                  return (
                    <TableRow 
                      key={log.id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedLog(log)}
                      data-testid={`log-row-${log.id}`}
                    >
                      <TableCell className="text-sm text-gray-500">
                        {formatTime(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{log.user_name}</p>
                          <p className="text-xs text-gray-500">{log.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${actionDisplay.color}`}>
                          <ActionIcon className="w-3 h-3" />
                          {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {log.module?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate text-sm">
                        {log.description}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(log.status)}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              Audit Log Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Timestamp</p>
                  <p className="font-medium">{formatTime(selectedLog.timestamp)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Status</p>
                  {getStatusBadge(selectedLog.status)}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">User</p>
                  <p className="font-medium">{selectedLog.user_name}</p>
                  <p className="text-sm text-gray-500">{selectedLog.user_email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Action</p>
                  <Badge className={getActionDisplay(selectedLog.action).color}>
                    {selectedLog.action.charAt(0).toUpperCase() + selectedLog.action.slice(1)}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Module</p>
                  <p className="font-medium">{selectedLog.module?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Entity Type</p>
                  <p className="font-medium">{selectedLog.entity_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                </div>
                {selectedLog.entity_id && (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Entity ID</p>
                    <p className="font-mono text-sm">{selectedLog.entity_id}</p>
                  </div>
                )}
                {selectedLog.entity_name && (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Entity Name</p>
                    <p className="font-medium">{selectedLog.entity_name}</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Description</p>
                <p className="font-medium">{selectedLog.description}</p>
              </div>
              
              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Additional Details</p>
                  <pre className="p-3 bg-gray-50 rounded-lg text-sm overflow-auto max-h-40">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedLog.ip_address && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">IP Address</p>
                  <p className="font-mono text-sm">{selectedLog.ip_address}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogPage;
