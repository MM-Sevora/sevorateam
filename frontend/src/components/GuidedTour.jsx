import React, { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import introJs from 'intro.js';
import 'intro.js/introjs.css';
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
                element: '[data-tour="sidebar"]',
                intro: 'Welcome to Sevora! This is your navigation sidebar. Here you can access all platform modules.',
                position: 'right',
            },
            {
                element: '[data-tour="notifications"]',
                intro: 'Click here to see your notifications. You\'ll get alerts for task assignments, comments, and more.',
                position: 'bottom',
            },
            {
                element: '[data-tour="user-menu"]',
                intro: 'Access your profile settings, help center, and logout from here.',
                position: 'left',
            },
            {
                element: '[data-testid="help-button"]',
                intro: 'Need help? Click this button anytime to get contextual help for the current page.',
                position: 'left',
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
                element: '[data-tour="projects-header"]',
                intro: 'Welcome to Project Management! Here you can organize work into modules and projects.',
                position: 'bottom',
            },
            {
                element: '[data-tour="project-modules"]',
                intro: 'Projects are organized into modules. Each module can contain multiple related projects.',
                position: 'right',
            },
            {
                element: '[data-tour="create-task"]',
                intro: 'Click here to create new tasks. You can assign them to team members and set due dates.',
                position: 'left',
            },
            {
                element: '[data-tour="task-filters"]',
                intro: 'Use these filters to quickly find tasks by status, priority, or assignee.',
                position: 'bottom',
            },
            {
                element: '[data-tour="my-tasks"]',
                intro: 'Quick access to all tasks assigned to you across all projects.',
                position: 'bottom',
            },
        ],
    },
    marketing_ops: {
        id: 'marketing_ops',
        name: 'Marketing Operations Tour',
        description: 'Learn about influencer and campaign management',
        triggerPath: '/marketing',
        steps: [
            {
                element: '[data-tour="marketing-nav"]',
                intro: 'Welcome to Marketing Ops! Manage influencers, campaigns, and track your marketing performance.',
                position: 'right',
            },
            {
                element: '[data-tour="influencers-tab"]',
                intro: 'Access your influencer database. Add new influencers, view profiles, and track partnerships.',
                position: 'bottom',
            },
            {
                element: '[data-tour="campaigns-tab"]',
                intro: 'Create and manage marketing campaigns. Assign influencers and track campaign performance.',
                position: 'bottom',
            },
            {
                element: '[data-tour="pipeline-tab"]',
                intro: 'View your marketing pipeline. Track deals through stages from discovery to completion.',
                position: 'bottom',
            },
            {
                element: '[data-tour="ai-tools"]',
                intro: 'Use AI-powered tools to discover influencers and optimize your campaigns.',
                position: 'left',
            },
        ],
    },
    admin_panel: {
        id: 'admin_panel',
        name: 'Admin Panel Tour',
        description: 'Learn about user and organization management',
        triggerPath: '/admin',
        steps: [
            {
                element: '[data-tour="admin-nav"]',
                intro: 'Welcome to the Admin Panel! Manage users, employees, and organization settings.',
                position: 'right',
            },
            {
                element: '[data-tour="user-management"]',
                intro: 'Manage user accounts, send invitations, and configure authentication settings.',
                position: 'right',
            },
            {
                element: '[data-tour="employee-database"]',
                intro: 'Access the HR employee database. Onboard new employees and manage their profiles.',
                position: 'right',
            },
            {
                element: '[data-tour="access-control"]',
                intro: 'Configure roles and permissions. Control what each role can access in the platform.',
                position: 'right',
            },
            {
                element: '[data-tour="organization"]',
                intro: 'Manage your organization structure - departments, teams, positions, and grades.',
                position: 'right',
            },
        ],
    },
    employee_onboarding: {
        id: 'employee_onboarding',
        name: 'Employee Onboarding Tour',
        description: 'Learn how to onboard new employees',
        triggerPath: '/admin/employees',
        steps: [
            {
                element: '[data-tour="overview-tab"]',
                intro: 'View employee statistics and see how your team is distributed across departments.',
                position: 'bottom',
            },
            {
                element: '[data-tour="employees-tab"]',
                intro: 'Browse and search all employees. Filter by department, grade, or status.',
                position: 'bottom',
            },
            {
                element: '[data-tour="onboarding-tab"]',
                intro: 'Onboard new employees here. Assign departments, roles, and reporting managers.',
                position: 'bottom',
            },
        ],
    },
    social_media: {
        id: 'social_media',
        name: 'Social Media Tour',
        description: 'Learn about social media management',
        triggerPath: '/social',
        steps: [
            {
                element: '[data-tour="social-dashboard"]',
                intro: 'View your social media performance at a glance. Track engagement and growth.',
                position: 'bottom',
            },
            {
                element: '[data-tour="content-studio"]',
                intro: 'Create and schedule content for multiple platforms. Use AI to generate captions.',
                position: 'right',
            },
            {
                element: '[data-tour="media-library"]',
                intro: 'Access your media assets library. Store and organize images and videos.',
                position: 'right',
            },
        ],
    },
    notifications_center: {
        id: 'notifications_center',
        name: 'Notifications Tour',
        description: 'Learn about the notification system',
        triggerPath: '/notifications',
        steps: [
            {
                element: '[data-tour="notification-list"]',
                intro: 'All your notifications appear here. Click on any notification to view details.',
                position: 'right',
            },
            {
                element: '[data-tour="notification-filters"]',
                intro: 'Filter notifications by type - tasks, comments, mentions, and system alerts.',
                position: 'bottom',
            },
            {
                element: '[data-tour="mark-all-read"]',
                intro: 'Quickly mark all notifications as read with one click.',
                position: 'left',
            },
        ],
    },
};

// Custom intro.js styles
const injectCustomStyles = () => {
    const styleId = 'sevora-introjs-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .introjs-tooltip {
            background: #1a1a1a !important;
            color: #f5f5f5 !important;
            border-radius: 12px !important;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3) !important;
            min-width: 300px !important;
            max-width: 400px !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .introjs-tooltiptext {
            padding: 16px 20px !important;
            font-size: 14px !important;
            line-height: 1.6 !important;
        }
        .introjs-tooltip-title {
            font-size: 16px !important;
            font-weight: 600 !important;
            margin-bottom: 8px !important;
            color: #c5a572 !important;
        }
        .introjs-arrow.top { border-bottom-color: #1a1a1a !important; }
        .introjs-arrow.bottom { border-top-color: #1a1a1a !important; }
        .introjs-arrow.left { border-right-color: #1a1a1a !important; }
        .introjs-arrow.right { border-left-color: #1a1a1a !important; }
        .introjs-tooltipbuttons {
            border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
            padding: 12px 16px !important;
        }
        .introjs-button {
            background: transparent !important;
            color: #f5f5f5 !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            border-radius: 6px !important;
            padding: 8px 16px !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            text-shadow: none !important;
        }
        .introjs-button:hover {
            background: rgba(255, 255, 255, 0.1) !important;
        }
        .introjs-nextbutton, .introjs-donebutton {
            background: #c5a572 !important;
            color: #1a1a1a !important;
            border-color: #c5a572 !important;
        }
        .introjs-nextbutton:hover, .introjs-donebutton:hover {
            background: #b89660 !important;
        }
        .introjs-skipbutton {
            color: #888 !important;
            border: none !important;
        }
        .introjs-progress {
            background: rgba(255, 255, 255, 0.1) !important;
            height: 4px !important;
        }
        .introjs-progressbar {
            background: #c5a572 !important;
        }
        .introjs-helperNumberLayer {
            background: #c5a572 !important;
            color: #1a1a1a !important;
            font-weight: 600 !important;
        }
        .introjs-helperLayer {
            border-radius: 8px !important;
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 0 4px rgba(197, 165, 114, 0.5) !important;
        }
        .introjs-bullets ul li a {
            background: rgba(255, 255, 255, 0.2) !important;
        }
        .introjs-bullets ul li a.active {
            background: #c5a572 !important;
        }
    `;
    document.head.appendChild(style);
};

// Tour Provider Component
export const TourProvider = ({ children }) => {
    const [completedTours, setCompletedTours] = useState([]);
    const [currentTour, setCurrentTour] = useState(null);
    const [runTour, setRunTour] = useState(false);
    const location = useLocation();
    const { user } = useAuth() || {};
    const introInstance = useRef(null);

    // Inject custom styles on mount
    useEffect(() => {
        injectCustomStyles();
    }, []);

    // Fetch completed tours
    useEffect(() => {
        if (user) {
            fetchCompletedTours();
        }
    }, [user]);

    const fetchCompletedTours = async () => {
        try {
            const res = await api.get('/help/tours/completed');
            setCompletedTours(res.data?.completed_tours || []);
        } catch (e) {
            // Use localStorage fallback
            const saved = localStorage.getItem('sevora_completed_tours');
            setCompletedTours(saved ? JSON.parse(saved) : []);
        }
    };

    const markTourCompleted = async (tourId) => {
        try {
            await api.post(`/help/tours/${tourId}/complete`);
            setCompletedTours(prev => [...prev, tourId]);
        } catch (e) {
            // Fallback to localStorage
            const newCompleted = [...completedTours, tourId];
            localStorage.setItem('sevora_completed_tours', JSON.stringify(newCompleted));
            setCompletedTours(newCompleted);
        }
    };

    const startTour = useCallback((tourId) => {
        const tour = TOUR_DEFINITIONS[tourId];
        if (!tour) return;

        // Filter steps to only include elements that exist
        const validSteps = tour.steps.filter(step => {
            if (!step.element) return true;
            return document.querySelector(step.element);
        });

        if (validSteps.length === 0) {
            console.warn(`No valid steps found for tour "${tourId}"`);
            return;
        }

        setCurrentTour(tourId);
        setRunTour(true);

        // Create intro.js instance
        introInstance.current = introJs();
        
        introInstance.current.setOptions({
            steps: validSteps.map((step, index) => ({
                element: step.element ? document.querySelector(step.element) : undefined,
                intro: step.intro,
                position: step.position || 'auto',
                title: index === 0 ? tour.name : undefined
            })),
            showStepNumbers: true,
            showBullets: true,
            showProgress: true,
            exitOnOverlayClick: false,
            exitOnEsc: true,
            nextLabel: 'Next →',
            prevLabel: '← Back',
            skipLabel: 'Skip',
            doneLabel: 'Done!',
            hidePrev: true,
            scrollToElement: true,
            scrollPadding: 80,
        });

        introInstance.current.oncomplete(() => {
            markTourCompleted(tourId);
            setRunTour(false);
            setCurrentTour(null);
        });

        introInstance.current.onexit(() => {
            setRunTour(false);
            setCurrentTour(null);
        });

        introInstance.current.start();
    }, [completedTours]);

    const resetTour = async (tourId) => {
        try {
            await api.delete(`/help/tours/${tourId}/reset`);
            setCompletedTours(prev => prev.filter(t => t !== tourId));
        } catch (e) {
            // Fallback to localStorage
            const newCompleted = completedTours.filter(t => t !== tourId);
            localStorage.setItem('sevora_completed_tours', JSON.stringify(newCompleted));
            setCompletedTours(newCompleted);
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
