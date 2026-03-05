import React, { useState, useEffect } from 'react';
import api from '../api';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';

const platformIcons = {
  facebook: { icon: FaFacebook, color: '#1877F2' },
  instagram: { icon: FaInstagram, color: '#E4405F' },
  twitter: { icon: FaTwitter, color: '#1DA1F2' },
  linkedin: { icon: FaLinkedin, color: '#0A66C2' },
  youtube: { icon: FaYoutube, color: '#FF0000' },
};

export default function Scheduler() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    api.get('/api/posts').then(res => {
      setPosts(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = monthStart.getDay();

  const getPostsForDay = (date) => {
    return posts.filter(p => {
      const postDate = p.scheduled_at ? new Date(p.scheduled_at) : new Date(p.created_at);
      return isSameDay(postDate, date);
    });
  };

  const dayPosts = selectedDay ? getPostsForDay(selectedDay) : [];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="scheduler-page">
      <div>
        <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Content Calendar</h1>
        <p className="text-zinc-400 mt-1">View and manage your scheduled posts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6" data-testid="calendar-grid">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
              data-testid="prev-month-button"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-heading font-semibold text-white">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
              data-testid="next-month-button"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs text-zinc-500 font-medium py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startPad }).map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square" />
            ))}
            {days.map(day => {
              const dayP = getPostsForDay(day);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const today = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={`aspect-square rounded-lg p-1 text-sm transition-all relative flex flex-col items-center justify-start pt-1.5 ${
                    isSelected ? 'bg-accent-violet/20 border border-accent-violet/50' :
                    today ? 'bg-white/5 border border-white/10' :
                    'hover:bg-white/5 border border-transparent'
                  }`}
                  data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                >
                  <span className={`text-xs ${today ? 'text-accent-violet font-bold' : 'text-zinc-400'}`}>
                    {format(day, 'd')}
                  </span>
                  {dayP.length > 0 && (
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                      {dayP.slice(0, 3).map((p, i) => {
                        const pColor = platformIcons[p.platform]?.color || '#7c3aed';
                        return (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: pColor }}
                          />
                        );
                      })}
                      {dayP.length > 3 && (
                        <span className="text-[8px] text-zinc-500">+{dayP.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6" data-testid="day-detail">
          <h3 className="text-lg font-heading font-semibold text-white mb-4">
            {selectedDay ? format(selectedDay, 'MMMM d, yyyy') : 'Select a day'}
          </h3>
          {selectedDay ? (
            dayPosts.length > 0 ? (
              <div className="space-y-3">
                {dayPosts.map((post) => {
                  const pIcon = platformIcons[post.platform];
                  const PlatformIcon = pIcon?.icon;
                  return (
                    <div key={post.post_id} className="bg-zinc-950/50 rounded-lg p-4 border border-white/5" data-testid={`day-post-${post.post_id}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {PlatformIcon && <PlatformIcon className="w-4 h-4" style={{ color: pIcon?.color }} />}
                        <span className="text-sm font-medium text-white capitalize">{post.platform}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          post.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' :
                          post.status === 'scheduled' ? 'bg-accent-violet/10 text-accent-violet' :
                          'bg-zinc-500/10 text-zinc-400'
                        }`}>
                          {post.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-3">{post.content}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No posts for this day</p>
            )
          ) : (
            <p className="text-sm text-zinc-500">Click on a day to see its posts</p>
          )}
        </div>
      </div>
    </div>
  );
}
