import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Progress } from '../../components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
    Loader2,
    RefreshCw,
    CheckCircle,
    XCircle,
    Users,
    Calendar,
    TrendingUp,
    Bell,
    AlertTriangle,
    Building2,
    Clock,
} from 'lucide-react';

const DEPARTMENTS = ['marketing', 'buying', 'warehouse', 'technology', 'operations', 'finance', 'hr', 'sales', 'leadership'];

export default function TeamCompliance() {
    const { api, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [dailyStats, setDailyStats] = useState(null);
    const [weeklyStats, setWeeklyStats] = useState(null);
    const [filterDepartment, setFilterDepartment] = useState('all');
    const [sendingReminders, setSendingReminders] = useState(false);
    const [activeTab, setActiveTab] = useState('daily');
    
    const isAdmin = ['super_admin', 'admin'].includes(user?.role);
    const isManager = ['super_admin', 'admin', 'department_manager', 'team_lead'].includes(user?.role);

    useEffect(() => {
        if (!isManager) return;
        fetchStats();
    }, [filterDepartment]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const deptParam = filterDepartment !== 'all' ? `?department=${filterDepartment}` : '';
            const [daily, weekly] = await Promise.all([
                api.get(`/pulse/updates/compliance${deptParam}`),
                api.get(`/pulse/updates/compliance/weekly${deptParam}`),
            ]);
            setDailyStats(daily.data);
            setWeeklyStats(weekly.data);
        } catch (error) {
            console.error('Failed to fetch compliance stats:', error);
            toast.error('Failed to load compliance data');
        } finally {
            setLoading(false);
        }
    };

    const handleSendReminders = async () => {
        setSendingReminders(true);
        try {
            const response = await api.post('/pulse/updates/send-reminders');
            if (response.data.success) {
                toast.success(`Reminders sent to ${response.data.reminders_sent} team members`);
            }
        } catch (error) {
            toast.error('Failed to send reminders');
        } finally {
            setSendingReminders(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getComplianceColor = (rate) => {
        if (rate >= 80) return 'text-emerald-600';
        if (rate >= 50) return 'text-amber-600';
        return 'text-red-600';
    };

    const getProgressColor = (rate) => {
        if (rate >= 80) return 'bg-emerald-500';
        if (rate >= 50) return 'bg-amber-500';
        return 'bg-red-500';
    };

    if (!isManager) {
        return (
            <div className="p-6 max-w-5xl mx-auto">
                <Card className="border-[#E8D5C4]">
                    <CardContent className="py-12 text-center">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
                        <h3 className="text-lg font-medium text-[#4A3728]">Access Restricted</h3>
                        <p className="text-[#8B7355] mt-1">Only managers can view team compliance stats.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto" data-testid="team-compliance-page">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#4A3728]">Team Compliance</h1>
                    <p className="text-[#8B7355] text-sm mt-1">Track daily update submissions across your team</p>
                </div>
                
                <div className="flex items-center gap-3">
                    {isAdmin && (
                        <Button 
                            onClick={handleSendReminders}
                            disabled={sendingReminders}
                            className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
                        >
                            {sendingReminders ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                            Send Reminders
                        </Button>
                    )}
                    <Button variant="outline" size="icon" onClick={fetchStats} className="border-[#D4BBA6]">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-6">
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="w-[180px] border-[#E8D5C4] bg-white">
                        <Building2 className="w-4 h-4 mr-2 text-[#8B7355]" />
                        <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {DEPARTMENTS.map(d => (
                            <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Stats Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="border-[#E8D5C4]">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[#8B7355]">Today's Compliance</p>
                                <p className={`text-3xl font-bold ${getComplianceColor(dailyStats?.compliance_rate || 0)}`}>
                                    {dailyStats?.compliance_rate || 0}%
                                </p>
                            </div>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                (dailyStats?.compliance_rate || 0) >= 80 ? 'bg-emerald-100' : 
                                (dailyStats?.compliance_rate || 0) >= 50 ? 'bg-amber-100' : 'bg-red-100'
                            }`}>
                                <TrendingUp className={`w-6 h-6 ${getComplianceColor(dailyStats?.compliance_rate || 0)}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-[#E8D5C4]">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[#8B7355]">Submitted Today</p>
                                <p className="text-3xl font-bold text-emerald-600">
                                    {dailyStats?.submitted_count || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-[#E8D5C4]">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[#8B7355]">Pending Today</p>
                                <p className="text-3xl font-bold text-red-600">
                                    {dailyStats?.not_submitted_count || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                <XCircle className="w-6 h-6 text-red-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-[#E8D5C4]">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[#8B7355]">Total Team</p>
                                <p className="text-3xl font-bold text-[#4A3728]">
                                    {dailyStats?.total_employees || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-[#F5EBE0] flex items-center justify-center">
                                <Users className="w-6 h-6 text-[#6B5D52]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for Daily vs Weekly View */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-[#F5EBE0]">
                    <TabsTrigger value="daily" className="data-[state=active]:bg-white">
                        <Calendar className="w-4 h-4 mr-2" />
                        Today's Status
                    </TabsTrigger>
                    <TabsTrigger value="weekly" className="data-[state=active]:bg-white">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Weekly Overview
                    </TabsTrigger>
                </TabsList>

                {/* Daily Status Tab */}
                <TabsContent value="daily" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Submitted List */}
                        <Card className="border-[#E8D5C4]">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2 text-emerald-700">
                                    <CheckCircle className="w-5 h-5" />
                                    Submitted ({dailyStats?.submitted?.length || 0})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="max-h-96 overflow-y-auto">
                                {dailyStats?.submitted?.length === 0 ? (
                                    <p className="text-[#8B7355] text-center py-4">No submissions yet today</p>
                                ) : (
                                    <div className="space-y-2">
                                        {dailyStats?.submitted?.map((emp) => (
                                            <div key={emp.id} className="flex items-center gap-3 p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                                                <Avatar className="w-8 h-8">
                                                    <AvatarFallback className="bg-emerald-200 text-emerald-700 text-xs">
                                                        {getInitials(emp.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-[#4A3728] truncate">{emp.name}</p>
                                                    <p className="text-xs text-[#8B7355] capitalize">{emp.department}</p>
                                                </div>
                                                {emp.acknowledged && (
                                                    <Badge className="text-xs bg-teal-100 text-teal-700">Acknowledged</Badge>
                                                )}
                                                <span className="text-xs text-emerald-600">
                                                    {emp.submitted_at ? new Date(emp.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Not Submitted List */}
                        <Card className="border-[#E8D5C4]">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                                    <XCircle className="w-5 h-5" />
                                    Pending ({dailyStats?.not_submitted?.length || 0})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="max-h-96 overflow-y-auto">
                                {dailyStats?.not_submitted?.length === 0 ? (
                                    <div className="text-center py-8">
                                        <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
                                        <p className="text-emerald-600 font-medium">100% Compliance!</p>
                                        <p className="text-[#8B7355] text-sm">Everyone has submitted today</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {dailyStats?.not_submitted?.map((emp) => (
                                            <div key={emp.id} className="flex items-center gap-3 p-2 rounded-lg bg-red-50 border border-red-100">
                                                <Avatar className="w-8 h-8">
                                                    <AvatarFallback className="bg-red-200 text-red-700 text-xs">
                                                        {getInitials(emp.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-[#4A3728] truncate">{emp.name}</p>
                                                    <p className="text-xs text-[#8B7355] capitalize">{emp.department}</p>
                                                </div>
                                                <Badge variant="outline" className="text-xs border-red-200 text-red-600">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    Pending
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Weekly Overview Tab */}
                <TabsContent value="weekly" className="space-y-4">
                    {/* Overall Weekly Stats */}
                    <Card className="border-[#E8D5C4]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2 text-[#4A3728]">
                                <TrendingUp className="w-5 h-5 text-teal-600" />
                                Weekly Compliance Overview
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex-1">
                                    <Progress 
                                        value={weeklyStats?.overall_rate || 0} 
                                        className="h-3"
                                    />
                                </div>
                                <span className={`text-2xl font-bold ${getComplianceColor(weeklyStats?.overall_rate || 0)}`}>
                                    {weeklyStats?.overall_rate || 0}%
                                </span>
                            </div>
                            <div className="flex gap-4 text-sm text-[#8B7355]">
                                <span>Week: {weeklyStats?.week_start} to {weeklyStats?.week_end}</span>
                                <span>•</span>
                                <span>{weeklyStats?.total_submitted || 0} / {weeklyStats?.total_expected || 0} submissions</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Department Breakdown */}
                    <Card className="border-[#E8D5C4]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2 text-[#4A3728]">
                                <Building2 className="w-5 h-5 text-[#6B5D52]" />
                                Department Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {weeklyStats?.departments?.map((dept) => (
                                    <div key={dept.department} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-[#4A3728] capitalize">{dept.department}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-[#8B7355]">
                                                    {dept.total_submissions}/{dept.expected_submissions}
                                                </span>
                                                <span className={`text-sm font-bold ${getComplianceColor(dept.compliance_rate)}`}>
                                                    {dept.compliance_rate}%
                                                </span>
                                            </div>
                                        </div>
                                        <Progress 
                                            value={dept.compliance_rate} 
                                            className="h-2"
                                        />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
