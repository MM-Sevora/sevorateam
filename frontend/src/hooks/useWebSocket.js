import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

export const useWebSocket = () => {
    const { token, isAuthenticated } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [activities, setActivities] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState(0);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const pingIntervalRef = useRef(null);

    const connect = useCallback(() => {
        if (!token || wsRef.current?.readyState === WebSocket.OPEN) return;

        try {
            const ws = new WebSocket(`${WS_URL}/ws/${token}`);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('WebSocket connected');
                setIsConnected(true);
                
                // Start ping interval to keep connection alive
                pingIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'ping' }));
                    }
                }, 30000);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    switch (data.type) {
                        case 'connected':
                            setOnlineUsers(data.online_users || 0);
                            break;
                            
                        case 'notification':
                        case 'department_notification':
                            setNotifications(prev => [data.data, ...prev.slice(0, 49)]);
                            // Play notification sound (optional)
                            playNotificationSound();
                            break;
                            
                        case 'activity':
                            setActivities(prev => [data.data, ...prev.slice(0, 49)]);
                            break;
                            
                        case 'notification_marked_read':
                            setNotifications(prev => 
                                prev.map(n => 
                                    n.id === data.notification_id 
                                        ? { ...n, read: true } 
                                        : n
                                )
                            );
                            break;
                            
                        case 'pong':
                            // Connection is alive
                            break;
                            
                        default:
                            console.log('Unknown message type:', data.type);
                    }
                } catch (e) {
                    console.error('WebSocket message parse error:', e);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            ws.onclose = (event) => {
                console.log('WebSocket closed:', event.code, event.reason);
                setIsConnected(false);
                
                // Clear ping interval
                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                }
                
                // Attempt to reconnect after 5 seconds
                if (token && event.code !== 4001) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log('Attempting to reconnect...');
                        connect();
                    }, 5000);
                }
            };
        } catch (error) {
            console.error('WebSocket connection error:', error);
        }
    }, [token]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const markNotificationRead = useCallback((notificationId) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'mark_read',
                notification_id: notificationId
            }));
        }
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    // Polling fallback when WebSocket fails
    const pollIntervalRef = useRef(null);
    const lastPollTimeRef = useRef(null);
    
    const startPollingFallback = useCallback(() => {
        if (pollIntervalRef.current) return; // Already polling
        
        console.log('Starting polling fallback for notifications...');
        lastPollTimeRef.current = new Date().toISOString();
        
        pollIntervalRef.current = setInterval(async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/api/notifications?limit=10&is_read=false`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    // Only add notifications newer than last poll
                    const newNotifs = data.filter(n => 
                        new Date(n.created_at) > new Date(lastPollTimeRef.current)
                    );
                    
                    if (newNotifs.length > 0) {
                        setNotifications(prev => [...newNotifs, ...prev.slice(0, 49)]);
                        playNotificationSound();
                    }
                    lastPollTimeRef.current = new Date().toISOString();
                }
            } catch (e) {
                console.error('Polling fallback error:', e);
            }
        }, 15000); // Poll every 15 seconds
    }, [token]);
    
    const stopPollingFallback = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    }, []);

    // Connect when authenticated
    useEffect(() => {
        if (isAuthenticated && token) {
            connect();
            
            // Start polling fallback after 10 seconds if WS not connected
            const fallbackTimeout = setTimeout(() => {
                if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                    startPollingFallback();
                }
            }, 10000);
            
            return () => {
                clearTimeout(fallbackTimeout);
                disconnect();
                stopPollingFallback();
            };
        } else {
            disconnect();
            stopPollingFallback();
        }
    }, [isAuthenticated, token, connect, disconnect, startPollingFallback, stopPollingFallback]);
    
    // Stop polling when WebSocket connects, start when it disconnects
    useEffect(() => {
        if (isConnected) {
            stopPollingFallback();
        } else if (isAuthenticated && token) {
            // Give WS a chance to reconnect before falling back to polling
            const fallbackDelay = setTimeout(() => {
                if (!isConnected) {
                    startPollingFallback();
                }
            }, 8000);
            return () => clearTimeout(fallbackDelay);
        }
    }, [isConnected, isAuthenticated, token, startPollingFallback, stopPollingFallback]);

    return {
        isConnected,
        notifications,
        activities,
        onlineUsers,
        markNotificationRead,
        clearNotifications,
        unreadCount: notifications.filter(n => !n.read && !n.is_read).length,
        isPolling: !!pollIntervalRef.current
    };
};

// Play notification sound
const playNotificationSound = () => {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleAs0eLPIto9cI1OVwdyuXxQhXo/D5ql3GhhrmcTlpHwUFmyexOafeBEWcJzC5Jp1DxZwnMPmmnUPFnCcw+aadQ8WcJzD5pp1DxZwnMPmmnUPFnCcw+aadQ8WcJzD5pp1DxZwnMPmmnUPFnCcw+aadQ8=');
        audio.volume = 0.3;
        audio.play().catch(() => {});
    } catch (e) {
        // Ignore audio errors
    }
};

export default useWebSocket;
