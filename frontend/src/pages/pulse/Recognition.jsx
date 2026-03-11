import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../../components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
    Award,
    Users,
    Trophy,
    Loader2,
    RefreshCw,
    Plus,
    Search,
    Heart,
    Lightbulb,
    Star,
    Handshake,
    Puzzle,
    GraduationCap,
} from 'lucide-react';

const BADGE_CONFIG = {
    team_player: { label: 'Team Player', emoji: '🤝', color: 'bg-blue-500', icon: Handshake },
    problem_solver: { label: 'Problem Solver', emoji: '🧩', color: 'bg-emerald-500', icon: Puzzle },
    innovation: { label: 'Innovation', emoji: '💡', color: 'bg-amber-500', icon: Lightbulb },
    execution_champion: { label: 'Execution Champion', emoji: '🏆', color: 'bg-purple-500', icon: Trophy },
    mentor: { label: 'Mentor', emoji: '🎓', color: 'bg-pink-500', icon: GraduationCap },
    customer_hero: { label: 'Customer Hero', emoji: '⭐', color: 'bg-red-500', icon: Star },
};

export default function Recognition() {
    const { api, user } = useAuth();
    const [recognitions, setRecognitions] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [badgeStats, setBadgeStats] = useState({});
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showGiveDialog, setShowGiveDialog] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [period, setPeriod] = useState('month');
    const [searchQuery, setSearchQuery] = useState('');
    
    const [newRecognition, setNewRecognition] = useState({
        recipient_id: '',
        badge_type: '',
        reason: '',
        is_public: true,
    });

    useEffect(() => {
        fetchData();
    }, [period]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [recognitionsRes, leaderboardRes, employeesRes] = await Promise.all([
                api.get('/pulse/recognition?limit=50'),
                api.get(`/pulse/recognition/leaderboard?period=${period}`),
                api.get('/admin/users'),
            ]);
            
            setRecognitions(recognitionsRes.data.recognitions || []);
            setLeaderboard(leaderboardRes.data.leaderboard || []);
            setBadgeStats(leaderboardRes.data.by_badge || {});
            setEmployees(employeesRes.data || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to load recognition data');
        } finally {
            setLoading(false);
        }
    };

    const handleGiveRecognition = async () => {
        if (!newRecognition.recipient_id || !newRecognition.badge_type || !newRecognition.reason.trim()) {
            toast.error('Please fill in all fields');
            return;
        }
        
        setSubmitting(true);
        try {
            await api.post('/pulse/recognition', newRecognition);
            toast.success('Badge awarded successfully!');
            setShowGiveDialog(false);
            setNewRecognition({
                recipient_id: '',
                badge_type: '',
                reason: '',
                is_public: true,
            });
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to award badge');
        } finally {
            setSubmitting(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const filteredEmployees = employees.filter(emp => 
        emp.id !== user?.id && 
        (emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         emp.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto" data-testid="recognition-page">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Award className="w-7 h-7 text-pink-500" />
                        Recognition Wall
                    </h1>
                    <p className="text-gray-500 mt-1">Celebrate your teammates' achievements</p>
                </div>
                <Button
                    onClick={() => setShowGiveDialog(true)}
                    className="gap-2 bg-pink-600 hover:bg-pink-700"
                >
                    <Plus className="w-4 h-4" />
                    Give Recognition
                </Button>
            </div>

            {/* Badge Stats */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
                {Object.entries(BADGE_CONFIG).map(([key, config]) => (
                    <Card key={key}>
                        <CardContent className="p-3 text-center">
                            <div className="text-2xl mb-1">{config.emoji}</div>
                            <p className="text-lg font-bold">{badgeStats[key] || 0}</p>
                            <p className="text-xs text-gray-500 truncate">{config.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Tabs defaultValue="feed" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="feed" className="gap-2">
                        <Heart className="w-4 h-4" />
                        Recognition Feed
                    </TabsTrigger>
                    <TabsTrigger value="leaderboard" className="gap-2">
                        <Trophy className="w-4 h-4" />
                        Leaderboard
                    </TabsTrigger>
                </TabsList>

                {/* Recognition Feed */}
                <TabsContent value="feed">
                    <div className="space-y-4">
                        {recognitions.length === 0 ? (
                            <Card className="py-12">
                                <CardContent className="text-center">
                                    <Award className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                    <h3 className="text-lg font-medium text-gray-700">No recognitions yet</h3>
                                    <p className="text-gray-500 mt-1">Be the first to recognize a teammate!</p>
                                </CardContent>
                            </Card>
                        ) : (
                            recognitions.map(rec => {
                                const badge = BADGE_CONFIG[rec.badge_type] || {};
                                return (
                                    <Card key={rec.id}>
                                        <CardContent className="p-5">
                                            <div className="flex items-start gap-4">
                                                <div className={`p-3 rounded-xl ${badge.color || 'bg-gray-500'}`}>
                                                    <span className="text-2xl">{badge.emoji}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge className={`${badge.color} text-white`}>
                                                            {badge.label}
                                                        </Badge>
                                                        <span className="text-sm text-gray-500">
                                                            {formatDate(rec.created_at)}
                                                        </span>
                                                    </div>
                                                    <p className="text-lg font-semibold mb-2">
                                                        {rec.recipient_name} received a badge!
                                                    </p>
                                                    <p className="text-gray-700 italic">"{rec.reason}"</p>
                                                    <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                                                        <Avatar className="w-6 h-6">
                                                            <AvatarFallback className="text-xs bg-gray-100">
                                                                {getInitials(rec.giver_name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span>Recognized by {rec.giver_name}</span>
                                                        <span className="capitalize">• {rec.giver_department}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                </TabsContent>

                {/* Leaderboard */}
                <TabsContent value="leaderboard">
                    <div className="flex items-center gap-4 mb-6">
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="week">This Week</SelectItem>
                                <SelectItem value="month">This Month</SelectItem>
                                <SelectItem value="year">This Year</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={fetchData}>
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Recipients */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-amber-500" />
                                    Most Recognized
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {leaderboard.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4">No data for this period</p>
                                    ) : (
                                        leaderboard.map((person, idx) => (
                                            <div key={person.user_id} className="flex items-center gap-4">
                                                <div className="w-8 text-center">
                                                    {idx === 0 && <span className="text-2xl">🥇</span>}
                                                    {idx === 1 && <span className="text-2xl">🥈</span>}
                                                    {idx === 2 && <span className="text-2xl">🥉</span>}
                                                    {idx > 2 && <span className="text-gray-400 font-medium">{idx + 1}</span>}
                                                </div>
                                                <Avatar className="w-10 h-10">
                                                    <AvatarFallback className="bg-pink-100 text-pink-700">
                                                        {getInitials(person.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <p className="font-medium">{person.name}</p>
                                                    <p className="text-sm text-gray-500 capitalize">{person.department}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {person.badge_types?.slice(0, 3).map(bt => (
                                                        <span key={bt} className="text-lg">{BADGE_CONFIG[bt]?.emoji}</span>
                                                    ))}
                                                    <Badge variant="secondary">{person.badge_count}</Badge>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Badge Distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Award className="w-5 h-5 text-pink-500" />
                                    Badge Distribution
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {Object.entries(BADGE_CONFIG).map(([key, config]) => {
                                        const count = badgeStats[key] || 0;
                                        const maxCount = Math.max(...Object.values(badgeStats), 1);
                                        return (
                                            <div key={key} className="flex items-center gap-3">
                                                <span className="text-xl">{config.emoji}</span>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-medium">{config.label}</span>
                                                        <span className="text-sm text-gray-500">{count}</span>
                                                    </div>
                                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${config.color} rounded-full transition-all`}
                                                            style={{ width: `${(count / maxCount) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Give Recognition Dialog */}
            <Dialog open={showGiveDialog} onOpenChange={setShowGiveDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-pink-500" />
                            Give Recognition
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* Recipient Selection */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">Who would you like to recognize?</label>
                            <div className="relative mb-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search employees..."
                                    className="pl-9"
                                />
                            </div>
                            <div className="max-h-40 overflow-y-auto border rounded-lg">
                                {filteredEmployees.slice(0, 10).map(emp => (
                                    <button
                                        key={emp.id}
                                        onClick={() => setNewRecognition({ ...newRecognition, recipient_id: emp.id })}
                                        className={`w-full flex items-center gap-3 p-2 hover:bg-gray-50 transition-colors ${
                                            newRecognition.recipient_id === emp.id ? 'bg-pink-50' : ''
                                        }`}
                                    >
                                        <Avatar className="w-8 h-8">
                                            <AvatarFallback className="text-xs bg-gray-100">
                                                {getInitials(emp.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="text-left">
                                            <p className="text-sm font-medium">{emp.name}</p>
                                            <p className="text-xs text-gray-500 capitalize">{emp.department}</p>
                                        </div>
                                        {newRecognition.recipient_id === emp.id && (
                                            <span className="ml-auto text-pink-500">✓</span>
                                        )}
                                    </button>
                                ))}
                                {filteredEmployees.length === 0 && (
                                    <p className="text-gray-500 text-center py-4 text-sm">No employees found</p>
                                )}
                            </div>
                        </div>

                        {/* Badge Type */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">Select a badge</label>
                            <div className="grid grid-cols-3 gap-2">
                                {Object.entries(BADGE_CONFIG).map(([key, config]) => (
                                    <button
                                        key={key}
                                        onClick={() => setNewRecognition({ ...newRecognition, badge_type: key })}
                                        className={`p-3 rounded-lg border-2 transition-all text-center ${
                                            newRecognition.badge_type === key
                                                ? 'border-pink-500 bg-pink-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <span className="text-2xl block mb-1">{config.emoji}</span>
                                        <span className="text-xs font-medium">{config.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="text-sm font-medium mb-1 block">Why are you recognizing them?</label>
                            <Textarea
                                value={newRecognition.reason}
                                onChange={(e) => setNewRecognition({ ...newRecognition, reason: e.target.value })}
                                placeholder="Share what they did that deserves recognition..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowGiveDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleGiveRecognition}
                            disabled={submitting}
                            className="bg-pink-600 hover:bg-pink-700"
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Award className="w-4 h-4 mr-2" />
                            )}
                            Award Badge
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
