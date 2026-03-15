import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  Calendar, ChevronLeft, ChevronRight, Target, Newspaper, PartyPopper, RefreshCw
} from 'lucide-react';

const TYPE_CONFIG = {
  campaign: { label: 'Campaign', color: 'bg-purple-100 text-purple-700 border-purple-300', icon: Target },
  pr: { label: 'PR', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: Newspaper },
  event: { label: 'Event', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: PartyPopper },
  content: { label: 'Content', color: 'bg-green-100 text-green-700 border-green-300', icon: Calendar },
  deadline: { label: 'Deadline', color: 'bg-red-100 text-red-700 border-red-300', icon: Calendar },
  social: { label: 'Social Post', color: 'bg-pink-100 text-pink-700 border-pink-300', icon: Calendar },
};

const MarketingCalendarPage = () => {
  const { api } = useAuth();
  const [calendarItems, setCalendarItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [pressReleases, setPressReleases] = useState([]);
  const [contentProjects, setContentProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterType, setFilterType] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [eventsRes, campaignsRes, prRes, contentRes] = await Promise.all([
        api.get('/marketing/v2/events'),
        api.get('/marketing/campaigns'),
        api.get('/marketing/v2/pr/releases'),
        api.get('/marketing/v3/content-production/projects'),
      ]);
      setEvents(eventsRes.data || []);
      setCampaigns(campaignsRes.data || []);
      setPressReleases(prRes.data || []);
      setContentProjects(contentRes.data || []);
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate calendar items from different sources
  const getAllCalendarItems = useCallback(() => {
    const items = [];
    
    // Add events
    events.forEach(event => {
      items.push({
        id: `event-${event.id}`,
        title: event.name,
        start_date: event.start_date,
        end_date: event.end_date,
        item_type: 'event',
        description: event.venue,
        status: event.status,
      });
    });
    
    // Add campaigns
    campaigns.forEach(campaign => {
      if (campaign.start_date) {
        items.push({
          id: `campaign-${campaign.id}`,
          title: campaign.name,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          item_type: 'campaign',
          description: campaign.objective,
          status: campaign.status,
        });
      }
    });
    
    // Add press releases with embargo dates
    pressReleases.forEach(pr => {
      if (pr.embargo_date) {
        items.push({
          id: `pr-${pr.id}`,
          title: pr.title,
          start_date: pr.embargo_date,
          item_type: 'pr',
          description: 'Embargo date',
          status: pr.status,
        });
      }
    });

    // Add content production projects
    contentProjects.forEach(project => {
      // Add project delivery date
      if (project.delivery_date) {
        items.push({
          id: `content-${project.id}`,
          title: project.name,
          start_date: project.delivery_date,
          item_type: 'content',
          description: project.project_type,
          status: project.status,
        });
      }
      // Add project publish date if different
      if (project.publish_date && project.publish_date !== project.delivery_date) {
        items.push({
          id: `content-publish-${project.id}`,
          title: `📢 ${project.name}`,
          start_date: project.publish_date,
          item_type: 'social',
          description: 'Scheduled to publish',
          status: project.status,
        });
      }
    });
    
    return items;
  }, [events, campaigns, pressReleases, contentProjects]);

  // Get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  // Get items for a specific day
  const getItemsForDay = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    const allItems = getAllCalendarItems();
    
    return allItems.filter(item => {
      if (filterType !== 'all' && item.item_type !== filterType) return false;
      
      const startDate = item.start_date?.split('T')[0];
      const endDate = item.end_date?.split('T')[0];
      
      if (startDate === dateStr) return true;
      if (endDate && startDate && dateStr >= startDate && dateStr <= endDate) return true;
      
      return false;
    });
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Stats
  const allItems = getAllCalendarItems();
  const thisMonthItems = allItems.filter(item => {
    const itemDate = new Date(item.start_date);
    return itemDate.getMonth() === currentDate.getMonth() && itemDate.getFullYear() === currentDate.getFullYear();
  });

  return (
    <div className="p-8 space-y-6" data-testid="marketing-calendar-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Content Calendar</h1>
          <p className="text-[#5D4A3A] mt-1">Unified view of campaigns, content, PR, and events</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px] border-[#E8D5C4]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="campaign">Campaigns</SelectItem>
              <SelectItem value="content">Content</SelectItem>
              <SelectItem value="social">Social Posts</SelectItem>
              <SelectItem value="pr">PR</SelectItem>
              <SelectItem value="event">Events</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="border-[#E8D5C4]">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-[#4A3728]">{thisMonthItems.length}</div>
            <div className="text-sm text-[#5D4A3A]">This Month</div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-700">{campaigns.length}</div>
            <div className="text-sm text-purple-600">Campaigns</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-700">{contentProjects.length}</div>
            <div className="text-sm text-green-600">Content Projects</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-700">{pressReleases.length}</div>
            <div className="text-sm text-blue-600">Press Releases</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-700">{events.length}</div>
            <div className="text-sm text-amber-600">Events</div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="border-[#E8D5C4]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-semibold text-[#4A3728]">{monthName}</h2>
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-[#4A3728]" /></div>
          ) : (
            <>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-[#5D4A3A] py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="h-24 bg-gray-50 rounded" />;
                  }
                  
                  const dateStr = date.toISOString().split('T')[0];
                  const isToday = dateStr === todayStr;
                  const dayItems = getItemsForDay(date);
                  
                  return (
                    <div 
                      key={dateStr}
                      className={`h-24 border rounded p-1 ${isToday ? 'border-amber-500 bg-amber-50' : 'border-[#E8D5C4]'}`}
                    >
                      <div className={`text-sm font-medium mb-1 ${isToday ? 'text-amber-700' : 'text-[#4A3728]'}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        {dayItems.slice(0, 3).map(item => {
                          const config = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.content;
                          return (
                            <div 
                              key={item.id}
                              className={`text-xs px-1 py-0.5 rounded truncate border ${config.color}`}
                              title={item.title}
                            >
                              {item.title}
                            </div>
                          );
                        })}
                        {dayItems.length > 3 && (
                          <div className="text-xs text-[#5D4A3A] text-center">
                            +{dayItems.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4">
        {Object.entries(TYPE_CONFIG).slice(0, 4).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${config.color}`} />
            <span className="text-sm text-[#5D4A3A]">{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketingCalendarPage;
