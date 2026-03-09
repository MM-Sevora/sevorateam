import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Flag, Target, Calendar, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, Users, ChevronRight, ArrowUpRight, Loader2, BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

const API = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  planning: 'bg-stone-100 text-stone-700',
  active: 'bg-emerald-100 text-emerald-700',
  at_risk: 'bg-amber-100 text-amber-700',
  delayed: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-stone-100 text-stone-500'
};

const priorityColors = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-stone-100 text-stone-600 border-stone-200'
};

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'indigo', trend }) => (
  <Card className="border-[#E8D5C4] hover:shadow-md transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#6B5D52] mb-1">{title}</p>
          <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
          {subtitle && <p className="text-xs text-[#9C8C74] mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <ArrowUpRight className="w-3 h-3 text-emerald-600" />
          <span className="text-emerald-600 font-medium">{trend}</span>
        </div>
      )}
    </CardContent>
  </Card>
);

const QuarterCard = ({ quarter, onClick }) => (
  <Card 
    className="border-[#E8D5C4] hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer"
    onClick={onClick}
  >
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-[#4A3728]">{quarter.quarter}</h4>
        <Badge variant="outline" className="text-xs">
          {quarter.completed}/{quarter.objectives} done
        </Badge>
      </div>
      <Progress value={quarter.progress} className="h-2 mb-2" />
      <p className="text-xs text-[#6B5D52]">{quarter.progress.toFixed(0)}% complete</p>
    </CardContent>
  </Card>
);

const DepartmentRow = ({ dept }) => (
  <div className="flex items-center justify-between py-3 border-b border-[#E8D5C4] last:border-0">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
        <Users className="w-4 h-4 text-indigo-600" />
      </div>
      <span className="font-medium text-[#4A3728]">{dept.department}</span>
    </div>
    <div className="flex items-center gap-4">
      <span className="text-sm text-[#6B5D52]">{dept.objectives} objectives</span>
      <Badge variant="outline" className={dept.completed > 0 ? 'bg-emerald-50 text-emerald-700' : ''}>
        {dept.completed} done
      </Badge>
    </div>
  </div>
);

const DelayedObjectiveRow = ({ objective, onClick }) => (
  <div 
    className="flex items-center justify-between py-3 border-b border-[#E8D5C4] last:border-0 hover:bg-[#FDF8F3] px-2 rounded cursor-pointer"
    onClick={onClick}
  >
    <div className="flex items-center gap-3">
      <AlertTriangle className="w-4 h-4 text-red-500" />
      <div>
        <p className="font-medium text-[#4A3728] text-sm">{objective.title}</p>
        <p className="text-xs text-[#6B5D52]">{objective.owner || 'Unassigned'}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
        {objective.delay_days}d overdue
      </Badge>
      <ChevronRight className="w-4 h-4 text-[#9C8C74]" />
    </div>
  </div>
);

export default function GoalsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [selectedFY, setSelectedFY] = useState('');

  const fetchFiscalYears = useCallback(async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/goals/fiscal-years`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFiscalYears(data);
        // Set active FY as default
        const activeFY = data.find(fy => fy.status === 'active');
        if (activeFY) {
          setSelectedFY(activeFY.id);
        } else if (data.length > 0) {
          setSelectedFY(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch fiscal years:', error);
    }
  }, []);

  const fetchDashboard = useCallback(async (fyId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const url = fyId 
        ? `${API}/api/goals/dashboard?fiscal_year_id=${fyId}`
        : `${API}/api/goals/dashboard`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiscalYears();
  }, [fetchFiscalYears]);

  useEffect(() => {
    if (selectedFY || fiscalYears.length === 0) {
      fetchDashboard(selectedFY);
    }
  }, [selectedFY, fiscalYears.length, fetchDashboard]);

  if (loading && !dashboard) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const totalProgress = dashboard?.total_objectives > 0
    ? (dashboard.objectives_completed / dashboard.total_objectives * 100).toFixed(0)
    : 0;

  return (
    <div className="p-6 space-y-6" data-testid="goals-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]" data-testid="goals-dashboard-title">
            Goals & Objectives
          </h1>
          <p className="text-[#6B5D52]">Track company strategy execution</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedFY} onValueChange={setSelectedFY}>
            <SelectTrigger className="w-[180px] border-[#D4BBA6]">
              <SelectValue placeholder="Select Fiscal Year" />
            </SelectTrigger>
            <SelectContent>
              {fiscalYears.map(fy => (
                <SelectItem key={fy.id} value={fy.id}>
                  {fy.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => navigate('/goals/strategic')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Flag className="w-4 h-4 mr-2" />
            View Goals
          </Button>
        </div>
      </div>

      {/* No Fiscal Year State */}
      {fiscalYears.length === 0 && (
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 text-[#D4BBA6] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#4A3728] mb-2">No Fiscal Year Created</h3>
            <p className="text-[#6B5D52] mb-6">Start by creating a fiscal year to define your company's planning cycle.</p>
            <Button 
              onClick={() => navigate('/goals/fiscal-years')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Create Fiscal Year
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      {dashboard && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Strategic Goals" 
              value={dashboard.total_goals}
              subtitle={`${dashboard.goals_by_status?.active || 0} active`}
              icon={Flag}
              color="indigo"
            />
            <StatCard 
              title="Total Objectives" 
              value={dashboard.total_objectives}
              subtitle={`${totalProgress}% overall progress`}
              icon={Target}
              color="purple"
            />
            <StatCard 
              title="Completed" 
              value={dashboard.objectives_completed}
              subtitle="objectives achieved"
              icon={CheckCircle2}
              color="emerald"
            />
            <StatCard 
              title="Delayed/At Risk" 
              value={dashboard.objectives_delayed}
              subtitle="need attention"
              icon={AlertTriangle}
              color="amber"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quarterly Progress */}
            <Card className="lg:col-span-2 border-[#E8D5C4]">
              <CardHeader>
                <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  Quarterly Progress
                </CardTitle>
                <CardDescription>Track execution across quarters</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard.quarterly_progress?.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {dashboard.quarterly_progress.map((quarter, idx) => (
                      <QuarterCard 
                        key={idx} 
                        quarter={quarter}
                        onClick={() => navigate(`/goals/objectives?quarter=${quarter.quarter}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#6B5D52]">
                    <Clock className="w-12 h-12 text-[#D4BBA6] mx-auto mb-3" />
                    <p>No quarters defined yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Objectives by Department */}
            <Card className="border-[#E8D5C4]">
              <CardHeader>
                <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  By Department
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard.objectives_by_department?.length > 0 ? (
                  <div>
                    {dashboard.objectives_by_department.map((dept, idx) => (
                      <DepartmentRow key={idx} dept={dept} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-[#6B5D52]">
                    <Users className="w-10 h-10 text-[#D4BBA6] mx-auto mb-2" />
                    <p className="text-sm">No department data</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Delayed Objectives */}
          {dashboard.delayed_objectives?.length > 0 && (
            <Card className="border-[#E8D5C4] border-l-4 border-l-red-500">
              <CardHeader>
                <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Delayed Objectives
                </CardTitle>
                <CardDescription>Objectives that need immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  {dashboard.delayed_objectives.map((obj, idx) => (
                    <DelayedObjectiveRow 
                      key={idx} 
                      objective={obj}
                      onClick={() => navigate(`/goals/objectives?id=${obj.id}`)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Updates */}
          {dashboard.recent_updates?.length > 0 && (
            <Card className="border-[#E8D5C4]">
              <CardHeader>
                <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Recent Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.recent_updates.slice(0, 5).map((update, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-[#FDF8F3] rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#4A3728] text-sm truncate">
                          {update.objective_title}
                        </p>
                        <p className="text-xs text-[#6B5D52] mt-0.5">{update.note || 'Progress updated'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={update.progress} className="h-1.5 flex-1" />
                          <span className="text-xs font-medium text-indigo-600">{update.progress}%</span>
                        </div>
                      </div>
                      <span className="text-xs text-[#9C8C74] whitespace-nowrap">
                        {update.updated_by}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
