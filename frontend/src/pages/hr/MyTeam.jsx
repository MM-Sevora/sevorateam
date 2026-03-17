import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Input } from '../../components/ui/input';
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
    DialogFooter,
} from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../components/ui/table';
import {
    Loader2,
    RefreshCw,
    Users,
    UserPlus,
    ChevronRight,
    ChevronDown,
    Mail,
    Phone,
    Building2,
    Briefcase,
    Search,
    GitBranch,
    Network,
    User,
    UserCog,
} from 'lucide-react';

export default function MyTeam() {
    const { api, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [teamData, setTeamData] = useState(null);
    const [treeData, setTreeData] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('list');
    
    // Manager change dialog
    const [showManagerDialog, setShowManagerDialog] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [availableManagers, setAvailableManagers] = useState([]);
    const [newManagerId, setNewManagerId] = useState('');
    const [updatingManager, setUpdatingManager] = useState(false);
    
    // Expanded nodes in tree view
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    
    const isAdmin = ['super_admin', 'admin'].includes(user?.role);

    const fetchTeamData = useCallback(async () => {
        setLoading(true);
        try {
            const [teamRes, treeRes] = await Promise.all([
                api.get('/hr/my-team'),
                api.get('/hr/my-team/tree?depth=5'),
            ]);
            setTeamData(teamRes.data);
            setTreeData(treeRes.data);
            
            // Auto-expand first level
            if (treeRes.data?.tree) {
                const firstLevelIds = treeRes.data.tree.map(n => n.id);
                setExpandedNodes(new Set(firstLevelIds));
            }
        } catch (error) {
            console.error('Failed to fetch team data:', error);
            if (error.response?.status === 403) {
                toast.error('You do not have access to this page');
            } else {
                toast.error('Failed to load team data');
            }
        } finally {
            setLoading(false);
        }
    }, [api]);

    const fetchManagers = async () => {
        try {
            const response = await api.get('/hr/managers');
            setAvailableManagers(response.data.managers || []);
        } catch (error) {
            console.error('Failed to fetch managers:', error);
        }
    };

    useEffect(() => {
        fetchTeamData();
    }, [fetchTeamData]);

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const toggleNode = (nodeId) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    };

    const openManagerDialog = async (employee) => {
        setSelectedEmployee(employee);
        setNewManagerId(employee.reports_to || '');
        await fetchManagers();
        setShowManagerDialog(true);
    };

    const handleUpdateManager = async () => {
        if (!selectedEmployee) return;
        
        setUpdatingManager(true);
        try {
            await api.put(`/hr/employees/${selectedEmployee.id}/manager`, {
                manager_id: newManagerId || null
            });
            toast.success('Manager updated successfully');
            setShowManagerDialog(false);
            fetchTeamData();
        } catch (error) {
            const msg = error.response?.data?.detail || 'Failed to update manager';
            toast.error(msg);
        } finally {
            setUpdatingManager(false);
        }
    };

    // Filter direct reports by search
    const filteredReports = teamData?.direct_reports?.filter(emp => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            emp.name?.toLowerCase().includes(q) ||
            emp.email?.toLowerCase().includes(q) ||
            emp.designation?.toLowerCase().includes(q) ||
            emp.department_name?.toLowerCase().includes(q)
        );
    }) || [];

    // Render tree node - moved outside to avoid re-definition on each render
    const renderTreeNode = (node, level = 0) => {
        const isExpanded = expandedNodes.has(node.id);
        const hasChildren = node.children && node.children.length > 0;
        
        return (
            <div key={node.id} className="select-none">
                <div 
                    className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-[#F5EBE0] transition-colors cursor-pointer ${level > 0 ? 'ml-6' : ''}`}
                    style={{ marginLeft: level * 24 }}
                    onClick={() => hasChildren && toggleNode(node.id)}
                >
                    {hasChildren ? (
                        isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[#8B7355] flex-shrink-0" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-[#8B7355] flex-shrink-0" />
                        )
                    ) : (
                        <div className="w-4" />
                    )}
                    
                    <Avatar className="w-8 h-8 flex-shrink-0">
                        {node.avatar_url ? (
                            <AvatarImage src={node.avatar_url} />
                        ) : null}
                        <AvatarFallback className="bg-[#E8D5C4] text-[#4A3728] text-xs">
                            {getInitials(node.name)}
                        </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#4A3728] truncate">{node.name}</p>
                        <p className="text-xs text-[#8B7355] truncate">
                            {node.designation || node.title || 'Employee'}
                            {node.department_name && ` • ${node.department_name}`}
                        </p>
                    </div>
                    
                    {hasChildren && (
                        <Badge variant="outline" className="text-xs border-[#D4BBA6] text-[#6B5D52]">
                            {node.children.length} reports
                        </Badge>
                    )}
                </div>
                
                {isExpanded && hasChildren && (
                    <div className="border-l-2 border-[#E8D5C4]" style={{ marginLeft: level * 24 + 20 }}>
                        {node.children.map(child => renderTreeNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    if (!teamData || teamData.direct_reports_count === 0) {
        return (
            <div className="p-6 max-w-5xl mx-auto">
                <Card className="border-[#E8D5C4]">
                    <CardContent className="py-12 text-center">
                        <Users className="w-12 h-12 mx-auto mb-4 text-[#8B7355]" />
                        <h3 className="text-lg font-medium text-[#4A3728]">No Direct Reports</h3>
                        <p className="text-[#8B7355] mt-1">You don't have any team members reporting to you.</p>
                        {isAdmin && (
                            <Button asChild className="mt-4 bg-teal-600 hover:bg-teal-700">
                                <Link to="/admin/users">
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Manage Users
                                </Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto" data-testid="my-team-page">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#4A3728]">My Team</h1>
                    <p className="text-[#8B7355] text-sm mt-1">
                        {treeData?.total_team_size || teamData?.direct_reports_count || 0} team members
                        {treeData?.total_team_size !== teamData?.direct_reports_count && 
                            ` (${teamData?.direct_reports_count} direct reports)`}
                    </p>
                </div>
                
                <Button variant="outline" size="icon" onClick={fetchTeamData} className="border-[#D4BBA6]">
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="border-[#E8D5C4]">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[#8B7355]">Direct Reports</p>
                                <p className="text-3xl font-bold text-[#4A3728]">
                                    {teamData?.direct_reports_count || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-[#F5EBE0] flex items-center justify-center">
                                <Users className="w-6 h-6 text-[#6B5D52]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-[#E8D5C4]">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[#8B7355]">Total Team Size</p>
                                <p className="text-3xl font-bold text-teal-600">
                                    {treeData?.total_team_size || teamData?.direct_reports_count || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                                <Network className="w-6 h-6 text-teal-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-[#E8D5C4]">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[#8B7355]">With Sub-teams</p>
                                <p className="text-3xl font-bold text-amber-600">
                                    {teamData?.direct_reports?.filter(r => r.direct_reports_count > 0).length || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                                <GitBranch className="w-6 h-6 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <div className="flex items-center justify-between">
                    <TabsList className="bg-[#F5EBE0]">
                        <TabsTrigger value="list" className="data-[state=active]:bg-white">
                            <Users className="w-4 h-4 mr-2" />
                            List View
                        </TabsTrigger>
                        <TabsTrigger value="tree" className="data-[state=active]:bg-white">
                            <Network className="w-4 h-4 mr-2" />
                            Org Tree
                        </TabsTrigger>
                    </TabsList>
                    
                    {activeTab === 'list' && (
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
                            <Input
                                placeholder="Search team..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 border-[#E8D5C4]"
                            />
                        </div>
                    )}
                </div>

                {/* List View */}
                <TabsContent value="list">
                    <Card className="border-[#E8D5C4]">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-[#F5EBE0]">
                                        <TableHead className="text-[#4A3728]">Employee</TableHead>
                                        <TableHead className="text-[#4A3728]">Department</TableHead>
                                        <TableHead className="text-[#4A3728]">Designation</TableHead>
                                        <TableHead className="text-[#4A3728] text-center">Direct Reports</TableHead>
                                        {isAdmin && <TableHead className="text-[#4A3728] text-right">Actions</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredReports.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-[#8B7355]">
                                                {searchQuery ? 'No matching team members found' : 'No direct reports'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredReports.map((emp) => (
                                            <TableRow key={emp.id} className="hover:bg-[#F5EBE0]/50">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="w-10 h-10">
                                                            {emp.avatar_url ? (
                                                                <AvatarImage src={emp.avatar_url} />
                                                            ) : null}
                                                            <AvatarFallback className="bg-[#E8D5C4] text-[#4A3728]">
                                                                {getInitials(emp.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium text-[#4A3728]">{emp.name}</p>
                                                            <p className="text-xs text-[#8B7355]">{emp.email}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="border-[#D4BBA6] text-[#6B5D52]">
                                                        {emp.department_name || emp.department || 'Unassigned'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-[#4A3728]">
                                                    {emp.designation || emp.title || '-'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {emp.direct_reports_count > 0 ? (
                                                        <Badge className="bg-teal-100 text-teal-700">
                                                            {emp.direct_reports_count}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-[#8B7355]">0</span>
                                                    )}
                                                </TableCell>
                                                {isAdmin && (
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openManagerDialog(emp)}
                                                            className="text-[#6B5D52] hover:text-[#4A3728]"
                                                        >
                                                            <UserCog className="w-4 h-4 mr-1" />
                                                            Change Manager
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tree View */}
                <TabsContent value="tree">
                    <Card className="border-[#E8D5C4]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2 text-[#4A3728]">
                                <Network className="w-5 h-5 text-teal-600" />
                                Organization Tree
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {treeData?.tree?.length > 0 ? (
                                <div className="space-y-1">
                                    {/* Current user as root */}
                                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-teal-50 border border-teal-100 mb-2">
                                        <Avatar className="w-10 h-10">
                                            <AvatarFallback className="bg-teal-200 text-teal-700">
                                                {getInitials(user?.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-medium text-teal-700">{user?.name} (You)</p>
                                            <p className="text-xs text-teal-600">{user?.designation || user?.title || 'Manager'}</p>
                                        </div>
                                        <Badge className="bg-teal-100 text-teal-700">
                                            {treeData?.direct_reports_count} direct reports
                                        </Badge>
                                    </div>
                                    
                                    {/* Tree nodes */}
                                    <div className="border-l-2 border-teal-200 ml-5 pl-2">
                                        {treeData.tree.map(node => renderTreeNode(node, 0))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-center py-8 text-[#8B7355]">No team members to display</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Change Manager Dialog */}
            <Dialog open={showManagerDialog} onOpenChange={setShowManagerDialog}>
                <DialogContent className="bg-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-[#4A3728]">
                            <UserCog className="w-5 h-5" />
                            Change Reporting Manager
                        </DialogTitle>
                    </DialogHeader>
                    
                    {selectedEmployee && (
                        <div className="space-y-4 py-4">
                            {/* Selected Employee */}
                            <div className="flex items-center gap-3 p-3 bg-[#F5EBE0] rounded-lg">
                                <Avatar className="w-10 h-10">
                                    <AvatarFallback className="bg-[#E8D5C4] text-[#4A3728]">
                                        {getInitials(selectedEmployee.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-[#4A3728]">{selectedEmployee.name}</p>
                                    <p className="text-xs text-[#8B7355]">{selectedEmployee.email}</p>
                                </div>
                            </div>
                            
                            {/* Manager Selection */}
                            <div>
                                <label className="text-sm font-medium text-[#4A3728] mb-2 block">
                                    New Reporting Manager
                                </label>
                                <Select value={newManagerId || "none"} onValueChange={(v) => setNewManagerId(v === "none" ? "" : v)}>
                                    <SelectTrigger className="border-[#E8D5C4]">
                                        <SelectValue placeholder="Select manager" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Manager (Top Level)</SelectItem>
                                        {availableManagers
                                            .filter(m => m.id !== selectedEmployee.id)
                                            .map(mgr => (
                                                <SelectItem key={mgr.id} value={mgr.id}>
                                                    {mgr.name} {mgr.department_name && `(${mgr.department_name})`}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowManagerDialog(false)} className="border-[#D4BBA6]">
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleUpdateManager}
                            disabled={updatingManager}
                            className="bg-teal-600 hover:bg-teal-700"
                        >
                            {updatingManager ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Update Manager
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
