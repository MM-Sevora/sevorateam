import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { 
  FileText, Calendar, Download, Trash2, Eye, Plus, RefreshCw,
  CheckCircle2, Clock, AlertTriangle, FolderKanban, Target,
  Users, TrendingUp, Award, ChevronRight, Loader2, ArrowLeft,
  FileJson, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const REPORT_TYPE_CONFIG = {
  daily: { label: 'Daily', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Calendar },
  weekly: { label: 'Weekly', color: 'bg-green-100 text-green-700 border-green-200', icon: Calendar },
  monthly: { label: 'Monthly', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Calendar },
  quarterly: { label: 'Quarterly', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Calendar }
};

const ReportsPage = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateType, setGenerateType] = useState('weekly');
  const [filterType, setFilterType] = useState('all');

  const fetchReports = async () => {
    try {
      const params = filterType !== 'all' ? `?report_type=${filterType}` : '';
      const res = await api.get(`/analytics/reports${params}`);
      setReports(res.data.reports || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filterType]);

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const res = await api.post(`/analytics/reports/generate?report_type=${generateType}`);
      toast.success('Report generated successfully!');
      setShowGenerateModal(false);
      fetchReports();
      // Open the new report
      setSelectedReport(res.data);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleViewReport = async (reportId) => {
    try {
      const res = await api.get(`/analytics/reports/${reportId}`);
      setSelectedReport(res.data);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Failed to load report');
    }
  };

  const handleExportReport = async (reportId, format) => {
    try {
      if (format === 'json') {
        const res = await api.get(`/analytics/reports/${reportId}/export?format=json`);
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${reportId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        const res = await api.get(`/analytics/reports/${reportId}/export?format=csv`, {
          responseType: 'blob'
        });
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${reportId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    
    try {
      await api.delete(`/analytics/reports/${reportId}`);
      toast.success('Report deleted');
      fetchReports();
      if (selectedReport?.id === reportId) {
        setSelectedReport(null);
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 mx-auto text-[#8B7355] animate-spin mb-4" />
          <p className="text-[#5D4A3A]">Loading reports...</p>
        </div>
      </div>
    );
  }

  // Report Detail View
  if (selectedReport) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedReport(null)}
              className="text-[#4A3728] hover:bg-[#F5EBE0]"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#4A3728]">{selectedReport.title}</h1>
              <p className="text-sm text-[#5D4A3A]">
                {formatDate(selectedReport.period_start)} - {formatDate(selectedReport.period_end)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportReport(selectedReport.id, 'csv')}
              className="border-[#D4BBA6]"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportReport(selectedReport.id, 'json')}
              className="border-[#D4BBA6]"
            >
              <FileJson className="w-4 h-4 mr-2" />
              JSON
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        {selectedReport.summary_stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-[#4A3728] to-[#6B5D52] text-white border-0">
              <CardContent className="p-4">
                <Users className="w-6 h-6 mb-2 opacity-80" />
                <p className="text-2xl font-bold">{selectedReport.summary_stats.total_users}</p>
                <p className="text-sm opacity-70">Team Members</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-[#E8D5C4]">
              <CardContent className="p-4">
                <CheckCircle2 className="w-6 h-6 mb-2 text-emerald-500" />
                <p className="text-2xl font-bold text-[#4A3728]">{selectedReport.summary_stats.tasks_completed}</p>
                <p className="text-sm text-[#5D4A3A]">Tasks Completed</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-[#E8D5C4]">
              <CardContent className="p-4">
                <FolderKanban className="w-6 h-6 mb-2 text-blue-500" />
                <p className="text-2xl font-bold text-[#4A3728]">{selectedReport.summary_stats.projects_active}</p>
                <p className="text-sm text-[#5D4A3A]">Active Projects</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-[#E8D5C4]">
              <CardContent className="p-4">
                <Target className="w-6 h-6 mb-2 text-amber-500" />
                <p className="text-2xl font-bold text-[#4A3728]">{selectedReport.summary_stats.avg_goal_progress}%</p>
                <p className="text-sm text-[#5D4A3A]">Goal Progress</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Report Sections */}
        <div className="space-y-6">
          {selectedReport.sections?.map((section, idx) => (
            <Card key={idx} className="bg-white border-[#E8D5C4]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
                  {section.title === 'Task Metrics' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  {section.title === 'Project Status' && <FolderKanban className="w-5 h-5 text-blue-500" />}
                  {section.title === 'Meeting Summary' && <Calendar className="w-5 h-5 text-purple-500" />}
                  {section.title === 'Goals & OKR Progress' && <Target className="w-5 h-5 text-amber-500" />}
                  {section.title === 'Team Contributions' && <Award className="w-5 h-5 text-yellow-500" />}
                  {section.title === 'Risks & Blockers' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                  {section.title === 'Upcoming Priorities' && <Clock className="w-5 h-5 text-indigo-500" />}
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReportSectionContent section={section} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Meta */}
        <div className="text-sm text-[#8B7355] text-center">
          Generated by {selectedReport.generated_by_name} on {formatDateTime(selectedReport.generated_at)}
        </div>
      </div>
    );
  }

  // Reports List View
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#4A3728]">Reports</h1>
          <p className="text-[#5D4A3A] mt-1">Generate and view team performance reports</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36 bg-white border-[#D4BBA6]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => setShowGenerateModal(true)}
            className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Reports Grid */}
      {reports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => {
            const config = REPORT_TYPE_CONFIG[report.report_type] || REPORT_TYPE_CONFIG.weekly;
            return (
              <Card 
                key={report.id}
                className="bg-white border-[#E8D5C4] hover:border-[#D4BBA6] hover:shadow-md transition-all cursor-pointer"
                onClick={() => handleViewReport(report.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="outline" className={config.color}>
                      {config.label}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[#8B7355] hover:text-[#4A3728]"
                        onClick={(e) => { e.stopPropagation(); handleExportReport(report.id, 'csv'); }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[#8B7355] hover:text-red-600"
                        onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.id); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-[#4A3728] mb-2 line-clamp-1">{report.title}</h3>
                  
                  <div className="text-sm text-[#5D4A3A] space-y-1">
                    <p className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#8B7355]" />
                      {formatDate(report.period_start)} - {formatDate(report.period_end)}
                    </p>
                    <p className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#8B7355]" />
                      {report.generated_by_name}
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-[#E8D5C4] flex items-center justify-between">
                    <span className="text-xs text-[#8B7355]">
                      {formatDateTime(report.generated_at)}
                    </span>
                    <Button variant="ghost" size="sm" className="text-[#4A3728] h-7 px-2">
                      View <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="py-16 text-center">
            <FileText className="w-16 h-16 mx-auto text-[#D4BBA6] mb-4" />
            <h3 className="text-xl font-semibold text-[#4A3728] mb-2">No Reports Yet</h3>
            <p className="text-[#5D4A3A] mb-6">Generate your first report to track team performance</p>
            <Button
              onClick={() => setShowGenerateModal(true)}
              className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Generate Report Modal */}
      <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Generate Report</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#4A3728]">Report Type</label>
              <Select value={generateType} onValueChange={setGenerateType}>
                <SelectTrigger className="border-[#D4BBA6]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      Daily Report (Today)
                    </div>
                  </SelectItem>
                  <SelectItem value="weekly">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      Weekly Report (This Week)
                    </div>
                  </SelectItem>
                  <SelectItem value="monthly">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      Monthly Report (This Month)
                    </div>
                  </SelectItem>
                  <SelectItem value="quarterly">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      Quarterly Report (This Quarter)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-[#FDF8F3] rounded-lg p-4 text-sm text-[#5D4A3A]">
              <p className="font-medium text-[#4A3728] mb-2">Report will include:</p>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Task Metrics & Completion Rates
                </li>
                <li className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-blue-500" />
                  Project Status & Progress
                </li>
                <li className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  Meeting Summary & Action Items
                </li>
                <li className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-500" />
                  Goals & OKR Progress
                </li>
                <li className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  Top Contributors
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Risks & Blockers
                </li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateModal(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateReport}
              disabled={generating}
              className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Section Content Component
const ReportSectionContent = ({ section }) => {
  const { data } = section;
  
  if (section.title === 'Task Metrics') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="text-center p-3 bg-[#FDF8F3] rounded-lg">
          <p className="text-2xl font-bold text-[#4A3728]">{data.tasks_created}</p>
          <p className="text-xs text-[#5D4A3A]">Created</p>
        </div>
        <div className="text-center p-3 bg-emerald-50 rounded-lg">
          <p className="text-2xl font-bold text-emerald-700">{data.tasks_completed}</p>
          <p className="text-xs text-emerald-600">Completed</p>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-700">{data.tasks_in_progress}</p>
          <p className="text-xs text-blue-600">In Progress</p>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <p className="text-2xl font-bold text-red-700">{data.tasks_overdue}</p>
          <p className="text-xs text-red-600">Overdue</p>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <p className="text-2xl font-bold text-purple-700">{data.completion_rate}%</p>
          <p className="text-xs text-purple-600">Completion Rate</p>
        </div>
      </div>
    );
  }
  
  if (section.title === 'Project Status') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <p className="text-2xl font-bold text-emerald-700">{data.active_projects}</p>
            <p className="text-xs text-emerald-600">Active</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-700">{data.completed_in_period}</p>
            <p className="text-xs text-blue-600">Completed</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <p className="text-2xl font-bold text-amber-700">{data.on_hold}</p>
            <p className="text-xs text-amber-600">On Hold</p>
          </div>
        </div>
        {data.top_projects?.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#4A3728]">Top Projects</p>
            {data.top_projects.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-[#FDF8F3] rounded-lg">
                <span className="text-sm text-[#4A3728]">{p.name}</span>
                <div className="flex items-center gap-2">
                  <Progress value={p.progress} className="w-20 h-2" />
                  <span className="text-xs text-[#5D4A3A]">{p.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  if (section.title === 'Meeting Summary') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-[#FDF8F3] rounded-lg">
          <p className="text-2xl font-bold text-[#4A3728]">{data.total_meetings}</p>
          <p className="text-xs text-[#5D4A3A]">Total Meetings</p>
        </div>
        <div className="text-center p-3 bg-emerald-50 rounded-lg">
          <p className="text-2xl font-bold text-emerald-700">{data.completed_meetings}</p>
          <p className="text-xs text-emerald-600">Completed</p>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-700">{data.action_items_created}</p>
          <p className="text-xs text-blue-600">Action Items</p>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <p className="text-2xl font-bold text-purple-700">{data.avg_meetings_per_day}</p>
          <p className="text-xs text-purple-600">Avg/Day</p>
        </div>
      </div>
    );
  }
  
  if (section.title === 'Goals & OKR Progress') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-[#FDF8F3] rounded-lg">
            <p className="text-2xl font-bold text-[#4A3728]">{data.total_objectives}</p>
            <p className="text-xs text-[#5D4A3A]">Objectives</p>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <p className="text-2xl font-bold text-emerald-700">{data.completed_objectives}</p>
            <p className="text-xs text-emerald-600">Completed</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-700">{data.in_progress_objectives}</p>
            <p className="text-xs text-blue-600">In Progress</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <p className="text-2xl font-bold text-amber-700">{data.average_progress}%</p>
            <p className="text-xs text-amber-600">Avg Progress</p>
          </div>
        </div>
        <div className="bg-[#FDF8F3] rounded-lg p-3">
          <p className="text-sm font-medium text-[#4A3728] mb-2">Overall Progress</p>
          <Progress value={data.average_progress} className="h-3" />
        </div>
      </div>
    );
  }
  
  if (section.title === 'Team Contributions') {
    const contributors = data.top_contributors || [];
    return contributors.length > 0 ? (
      <div className="space-y-2">
        {contributors.map((c, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-[#FDF8F3] rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-[#8B7355]'
              }`}>
                {i + 1}
              </div>
              <div>
                <p className="font-medium text-[#4A3728]">{c.name}</p>
                <p className="text-xs text-[#5D4A3A]">{c.department}</p>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700">
              {c.tasks_completed} tasks
            </Badge>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-[#5D4A3A] text-center py-4">No contribution data for this period</p>
    );
  }
  
  if (section.title === 'Risks & Blockers') {
    return (
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
          <AlertTriangle className="w-6 h-6 mx-auto text-red-500 mb-2" />
          <p className="text-2xl font-bold text-red-700">{data.blocked_tasks}</p>
          <p className="text-xs text-red-600">Blocked Tasks</p>
        </div>
        <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
          <Clock className="w-6 h-6 mx-auto text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-amber-700">{data.high_priority_overdue}</p>
          <p className="text-xs text-amber-600">High Priority Overdue</p>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
          <FolderKanban className="w-6 h-6 mx-auto text-orange-500 mb-2" />
          <p className="text-2xl font-bold text-orange-700">{data.at_risk_projects}</p>
          <p className="text-xs text-orange-600">At Risk Projects</p>
        </div>
      </div>
    );
  }
  
  if (section.title === 'Upcoming Priorities') {
    const tasks = data.upcoming_tasks || [];
    return tasks.length > 0 ? (
      <div className="space-y-2">
        {tasks.map((t, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-[#FDF8F3] rounded-lg">
            <div className="flex-1">
              <p className="font-medium text-[#4A3728]">{t.name}</p>
              <p className="text-xs text-[#5D4A3A]">Due: {new Date(t.due_date).toLocaleDateString()}</p>
            </div>
            <Badge variant="outline" className={
              t.priority === 'urgent' ? 'bg-red-50 text-red-700 border-red-200' :
              t.priority === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
              'bg-[#F5EBE0] text-[#5D4A3A]'
            }>
              {t.priority}
            </Badge>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-[#5D4A3A] text-center py-4">No upcoming priorities</p>
    );
  }
  
  // Default: render as key-value pairs
  return (
    <div className="space-y-2">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex justify-between p-2 bg-[#FDF8F3] rounded">
          <span className="text-[#5D4A3A] capitalize">{key.replace(/_/g, ' ')}</span>
          <span className="font-medium text-[#4A3728]">
            {typeof value === 'object' ? JSON.stringify(value) : value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ReportsPage;
