import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  Building2, Package, Factory, FlaskConical, TrendingUp, 
  ArrowRight, Plus, Activity, ChevronRight
} from 'lucide-react';

const SourcingDashboard = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/sourcing/dashboard');
      setDashboard(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, color, onClick }) => (
    <Card 
      className={`cursor-pointer hover:shadow-lg transition-all duration-200 border-0 ${color}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-5 w-5 text-white/80" />
              <span className="text-sm font-medium text-white/80 uppercase tracking-wider">
                {title}
              </span>
            </div>
            <div className="text-4xl font-bold text-white mb-2">{value}</div>
            {subtitle && (
              <div className="flex items-center gap-4 text-sm text-white/70">
                {subtitle}
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
            View All <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6" data-testid="sourcing-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wider">Overview</p>
          <h1 className="text-3xl font-bold text-gray-900">Buying & Sourcing</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => navigate('/sourcing/brands')}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Brand
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Brands"
          value={dashboard?.brands?.total || 0}
          subtitle={
            <span>
              <span className="text-white font-semibold">{dashboard?.brands?.high_priority || 0}</span> High Priority
            </span>
          }
          icon={Building2}
          color="bg-gradient-to-br from-gray-800 to-gray-900"
          onClick={() => navigate('/sourcing/brands')}
        />
        <StatCard
          title="Total Suppliers"
          value={dashboard?.suppliers?.total || 0}
          subtitle={
            <span>
              <span className="text-green-300 font-semibold">{dashboard?.suppliers?.active || 0}</span> Active • 
              <span className="text-blue-300 font-semibold ml-1">{dashboard?.suppliers?.sampling || 0}</span> Sampling
            </span>
          }
          icon={Package}
          color="bg-gradient-to-br from-blue-600 to-blue-700"
          onClick={() => navigate('/sourcing/suppliers')}
        />
        <StatCard
          title="Total Manufacturers"
          value={dashboard?.manufacturers?.total || 0}
          subtitle={
            <span>
              <span className="text-green-300 font-semibold">{dashboard?.manufacturers?.active || 0}</span> Active • 
              <span className="text-blue-300 font-semibold ml-1">{dashboard?.manufacturers?.sampling || 0}</span> Sampling
            </span>
          }
          icon={Factory}
          color="bg-gradient-to-br from-amber-600 to-amber-700"
          onClick={() => navigate('/sourcing/manufacturers')}
        />
      </div>

      {/* Pipeline & Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brand Pipeline */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Brand Pipeline
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/sourcing/brands/pipeline')}>
              View Pipeline <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {dashboard?.brands?.by_stage && Object.keys(dashboard.brands.by_stage).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(dashboard.brands.by_stage).map(([stage, count]) => (
                  <div key={stage} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        stage === 'Onboarded' ? 'bg-green-500' :
                        stage === 'Negotiation' ? 'bg-purple-500' :
                        stage === 'Interested' ? 'bg-blue-500' :
                        stage === 'Qualified' ? 'bg-cyan-500' :
                        stage === 'Contacted' ? 'bg-amber-500' :
                        stage === 'Discovery' ? 'bg-gray-400' :
                        'bg-red-500'
                      }`}></div>
                      <span className="text-sm font-medium">{stage}</span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No brands in pipeline yet</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => navigate('/sourcing/brands')}
                >
                  Add your first brand
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Brands by City */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Brands by City
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard?.brands?.by_city && dashboard.brands.by_city.length > 0 ? (
              <div className="space-y-3">
                {dashboard.brands.by_city.slice(0, 8).map(({ city, count }, index) => {
                  const maxCount = Math.max(...dashboard.brands.by_city.map(c => c.count));
                  const width = (count / maxCount) * 100;
                  return (
                    <div key={city} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{city}</span>
                        <span className="text-gray-500">{count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"
                          style={{ width: `${width}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No city data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Samples Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FlaskConical className="h-5 w-5" /> Samples Overview
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/sourcing/samples')}>
            View Samples <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-900">{dashboard?.samples?.total || 0}</div>
              <div className="text-sm text-gray-500">Total Samples</div>
            </div>
            {dashboard?.samples?.by_status && Object.entries(dashboard.samples.by_status).slice(0, 3).map(([status, count]) => (
              <div key={status} className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-500">{status}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" /> Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard?.recent_activity && dashboard.recent_activity.length > 0 ? (
            <div className="space-y-3">
              {dashboard.recent_activity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
                  <div className="flex-1">
                    <div className="text-sm">
                      <span className="font-medium">{activity.user_name}</span>
                      <span className="text-gray-500"> {activity.action} </span>
                      <span className="font-medium">{activity.entity_name}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(activity.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SourcingDashboard;
