import React, { useState, useEffect, createContext, useContext } from 'react';
import Joyride, { STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

// Tour Context
const TourContext = createContext(null);

export const useTour = () => useContext(TourContext);

// Tour definitions for each module
const TOUR_DEFINITIONS = {
    platform_overview: {
        id: 'platform_overview',
        name: 'Platform Overview',
        description: 'Get to know the Sevora platform',
        triggerPath: '/overview',
        steps: [
            {
                target: '[data-tour="sidebar"]',
                content: 'Welcome to Sevora! This is your navigation sidebar. Here you can access all platform modules.',
                placement: 'right',
                disableBeacon: true,
            },
            {
                target: '[data-tour="notifications"]',
                content: 'Click here to see your notifications. You\'ll get alerts for task assignments, comments, and more.',
                placement: 'bottom',
            },
            {
                target: '[data-tour="user-menu"]',
                content: 'Access your profile settings, help center, and logout from here.',
                placement: 'bottom-end',
            },
            {
                target: '[data-testid="help-button"]',
                content: 'Need help? Click this button anytime to get contextual help for the current page.',
                placement: 'left',
            },
        ],
    },
    project_management: {
        id: 'project_management',
        name: 'Project Management Tour',
        description: 'Learn how to manage projects and tasks',
        triggerPath: '/projects',
        steps: [
            {
                target: '[data-tour="projects-header"]',
                content: 'Welcome to Project Management! Here you can create and manage all your projects.',
                placement: 'bottom',
                disableBeacon: true,
            },
            {
                target: '[data-tour="new-project-btn"]',
                content: 'Click here to create a new project. You can set up team members, deadlines, and workflows.',
                placement: 'bottom',
            },
            {
                target: '[data-tour="project-card"]',
                content: 'Each project shows its progress, task count, and priority. Click to view details.',
                placement: 'right',
            },
            {
                target: '[data-tour="project-filters"]',
                content: 'Use these filters to find projects by status, priority, or module.',
                placement: 'bottom',
            },
        ],
    },
    help_center: {
        id: 'help_center',
        name: 'Help Center Tour',
        description: 'Learn how to use the Help Center',
        triggerPath: '/help',
        steps: [
            {
                target: '[data-testid="help-search-input"]',
                content: 'Search for help articles, FAQs, or topics across the entire help center.',
                placement: 'bottom',
                disableBeacon: true,
            },
            {
                target: '[data-testid="browse-tab"]',
                content: 'Browse help by module. Each module has articles and FAQs to help you.',
                placement: 'bottom',
            },
            {
                target: '[data-testid="tickets-tab"]',
                content: 'View your support tickets here. You can track status and add replies.',
                placement: 'bottom',
            },
            {
                target: '[data-testid="submit-ticket-btn"]',
                content: 'Can\'t find what you need? Submit a support ticket and our team will help you.',
                placement: 'top',
            },
        ],
    },
};

// Custom tooltip component
const CustomTooltip = ({
    continuous,
    index,
    step,
    backProps,
    closeProps,
    primaryProps,
    tooltipProps,
    size,
}) => (
    <div
        {...tooltipProps}
        className="bg-white rounded-xl shadow-2xl border border-[#E8D5C4] max-w-md"
    >
        <div className="p-5">
            <p className="text-[#4A3728] text-base leading-relaxed">{step.content}</p>
        </div>
        <div className="flex items-center justify-between px-5 py-3 bg-[#FDF8F3] rounded-b-xl border-t border-[#E8D5C4]">
            <span className="text-sm text-[#9C8C74]">
                Step {index + 1} of {size}
            </span>
            <div className="flex gap-2">
                {index > 0 && (
                    <button
                        {...backProps}
                        className="px-4 py-2 text-sm text-[#6B5D52] hover:text-[#4A3728] transition-colors"
                    >
                        Back
                    </button>
                )}
                {continuous && (
                    <button
                        {...primaryProps}
                        className="px-4 py-2 text-sm bg-[#4A3728] text-white rounded-lg hover:bg-[#3A2A1E] transition-colors"
                    >
                        {index === size - 1 ? 'Finish' : 'Next'}
                    </button>
                )}
                {!continuous && (
                    <button
                        {...closeProps}
                        className="px-4 py-2 text-sm bg-[#4A3728] text-white rounded-lg hover:bg-[#3A2A1E] transition-colors"
                    >
                        Got it
                    </button>
                )}
            </div>
        </div>
    </div>
);

// Tour Provider Component
export const TourProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const location = useLocation();
    const [runTour, setRunTour] = useState(false);
    const [currentTour, setCurrentTour] = useState(null);
    const [completedTours, setCompletedTours] = useState([]);
    const [tourSteps, setTourSteps] = useState([]);

    // Fetch completed tours on mount
    useEffect(() => {
        if (isAuthenticated && user?.id) {
            fetchCompletedTours();
        }
    }, [isAuthenticated, user?.id]);

    // Check if we should auto-start a tour when path changes
    useEffect(() => {
        if (!isAuthenticated || completedTours === null) return;
        
        const currentPath = location.pathname;
        
        // Find a tour that matches this path and hasn't been completed
        for (const [tourId, tour] of Object.entries(TOUR_DEFINITIONS)) {
            if (currentPath.startsWith(tour.triggerPath) && !completedTours.includes(tourId)) {
                // Small delay to let the page render
                const timer = setTimeout(() => {
                    startTour(tourId);
                }, 1500);
                return () => clearTimeout(timer);
            }
        }
    }, [location.pathname, completedTours, isAuthenticated]);

    const fetchCompletedTours = async () => {
        try {
            const res = await api.get('/help/tours/completed');
            setCompletedTours(res.data.completed_tours || []);
        } catch (e) {
            // If endpoint doesn't exist yet, use empty array
            setCompletedTours([]);
        }
    };

    const markTourCompleted = async (tourId) => {
        try {
            await api.post(`/help/tours/${tourId}/complete`);
            setCompletedTours(prev => [...prev, tourId]);
        } catch (e) {
            console.error('Failed to mark tour complete:', e);
        }
    };

    const startTour = (tourId) => {
        const tour = TOUR_DEFINITIONS[tourId];
        if (!tour) return;
        
        setCurrentTour(tourId);
        setTourSteps(tour.steps);
        setRunTour(true);
    };

    const resetTour = async (tourId) => {
        try {
            await api.delete(`/help/tours/${tourId}/reset`);
            setCompletedTours(prev => prev.filter(t => t !== tourId));
        } catch (e) {
            console.error('Failed to reset tour:', e);
        }
    };

    const handleJoyrideCallback = (data) => {
        const { status, action, type } = data;
        
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setRunTour(false);
            if (status === STATUS.FINISHED && currentTour) {
                markTourCompleted(currentTour);
            }
            setCurrentTour(null);
        }
    };

    const value = {
        startTour,
        resetTour,
        completedTours,
        availableTours: TOUR_DEFINITIONS,
        isRunning: runTour,
    };

    return (
        <TourContext.Provider value={value}>
            {children}
            <Joyride
                steps={tourSteps}
                run={runTour}
                continuous
                showProgress
                showSkipButton
                disableScrolling={false}
                spotlightClicks
                callback={handleJoyrideCallback}
                tooltipComponent={CustomTooltip}
                styles={{
                    options: {
                        zIndex: 10000,
                        primaryColor: '#4A3728',
                        overlayColor: 'rgba(0, 0, 0, 0.4)',
                    },
                    spotlight: {
                        borderRadius: '8px',
                    },
                }}
                floaterProps={{
                    disableAnimation: true,
                }}
            />
        </TourContext.Provider>
    );
};

// Tour Button Component - for manual tour trigger
export const TourButton = ({ tourId, className = '' }) => {
    const { startTour, completedTours } = useTour() || {};
    const tour = TOUR_DEFINITIONS[tourId];
    
    if (!tour || !startTour) return null;
    
    const isCompleted = completedTours?.includes(tourId);
    
    return (
        <button
            onClick={() => startTour(tourId)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                isCompleted 
                    ? 'border-[#D4BBA6] text-[#6B5D52] hover:bg-[#FDF8F3]' 
                    : 'border-[#4A3728] text-[#4A3728] bg-[#FDF8F3] hover:bg-[#F5EDE5]'
            } ${className}`}
            data-testid={`tour-button-${tourId}`}
        >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {isCompleted ? 'Replay Tour' : 'Take Tour'}
        </button>
    );
};

export default TourProvider;
