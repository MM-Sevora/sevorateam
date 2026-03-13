import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { CalendarDays, Globe } from 'lucide-react';
import TeamsCalendar from '../teams/TeamsCalendar';
import UnifiedCalendarPage from './UnifiedCalendarPage';

/**
 * Combined Calendar Page
 * Provides two views in one place:
 * 1. Teams Calendar - Microsoft Outlook/Teams calendar integration
 * 2. Unified Calendar - Aggregated view from all modules
 */
export default function CombinedCalendarPage() {
  const [activeTab, setActiveTab] = useState('teams');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF7F5] to-[#F5EBE0]">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Tab Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-br from-[#FAF7F5] to-[#F5EBE0] border-b border-[#E8DED5] px-6 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-[#4A3728]">Calendar</h1>
              <p className="text-sm text-[#8B7355]">View and manage your events</p>
            </div>
          </div>
          
          <TabsList className="bg-[#F5EBE0] border border-[#E8DED5] p-1">
            <TabsTrigger 
              value="teams" 
              className="data-[state=active]:bg-white data-[state=active]:text-[#4A3728] data-[state=active]:shadow-sm text-[#8B7355] px-4"
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              Teams Calendar
            </TabsTrigger>
            <TabsTrigger 
              value="unified"
              className="data-[state=active]:bg-white data-[state=active]:text-[#4A3728] data-[state=active]:shadow-sm text-[#8B7355] px-4"
            >
              <Globe className="w-4 h-4 mr-2" />
              Unified Calendar
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <TabsContent value="teams" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <TeamsCalendar embedded={true} />
        </TabsContent>
        
        <TabsContent value="unified" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <UnifiedCalendarPage embedded={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
