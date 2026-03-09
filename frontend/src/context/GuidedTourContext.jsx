import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import introJs from 'intro.js';
import 'intro.js/introjs.css';

const GuidedTourContext = createContext(null);

// Tour definitions for different modules
const TOUR_DEFINITIONS = {
  dashboard: {
    name: 'Dashboard Overview',
    steps: [
      {
        element: '[data-tour="sidebar"]',
        intro: 'Welcome to Sevora! This is your navigation sidebar. You can access all modules from here.',
        position: 'right'
      },
      {
        element: '[data-tour="notifications"]',
        intro: 'Click here to view your notifications and alerts.',
        position: 'bottom'
      },
      {
        element: '[data-tour="user-menu"]',
        intro: 'Access your profile settings and logout from here.',
        position: 'left'
      }
    ]
  },
  
  marketing: {
    name: 'Marketing Ops Tour',
    steps: [
      {
        element: '[data-tour="influencers-tab"]',
        intro: 'Manage your influencer database here. Add, edit, and track influencer partnerships.',
        position: 'bottom'
      },
      {
        element: '[data-tour="campaigns-tab"]',
        intro: 'Create and manage marketing campaigns. Track performance and ROI.',
        position: 'bottom'
      },
      {
        element: '[data-tour="pipeline-tab"]',
        intro: 'View your marketing pipeline and track deal progress.',
        position: 'bottom'
      },
      {
        element: '[data-tour="add-influencer"]',
        intro: 'Click here to add a new influencer to your database.',
        position: 'left'
      }
    ]
  },
  
  projects: {
    name: 'Project Management Tour',
    steps: [
      {
        element: '[data-tour="project-modules"]',
        intro: 'Projects are organized into modules. Each module can contain multiple projects.',
        position: 'right'
      },
      {
        element: '[data-tour="task-board"]',
        intro: 'Manage your tasks here. Drag and drop to change status.',
        position: 'top'
      },
      {
        element: '[data-tour="create-task"]',
        intro: 'Click to create a new task. Assign it to team members and set due dates.',
        position: 'left'
      },
      {
        element: '[data-tour="my-tasks"]',
        intro: 'Quick access to all tasks assigned to you.',
        position: 'bottom'
      }
    ]
  },
  
  admin: {
    name: 'Admin Panel Tour',
    steps: [
      {
        element: '[data-tour="user-management"]',
        intro: 'Manage user accounts, invitations, and authentication settings.',
        position: 'right'
      },
      {
        element: '[data-tour="employee-database"]',
        intro: 'Access the HR employee database and onboarding workflow.',
        position: 'right'
      },
      {
        element: '[data-tour="access-control"]',
        intro: 'Configure roles and permissions for your team.',
        position: 'right'
      },
      {
        element: '[data-tour="organization"]',
        intro: 'Manage your organization structure - departments, teams, and positions.',
        position: 'right'
      }
    ]
  },
  
  employeeOnboarding: {
    name: 'Employee Onboarding Tour',
    steps: [
      {
        element: '[data-tour="overview-tab"]',
        intro: 'View employee statistics and department breakdown.',
        position: 'bottom'
      },
      {
        element: '[data-tour="employees-tab"]',
        intro: 'Browse and search all employees in the system.',
        position: 'bottom'
      },
      {
        element: '[data-tour="onboarding-tab"]',
        intro: 'Onboard new employees here. Assign departments, roles, and managers.',
        position: 'bottom'
      }
    ]
  },

  social: {
    name: 'Social Media Tour',
    steps: [
      {
        element: '[data-tour="social-dashboard"]',
        intro: 'View your social media performance metrics at a glance.',
        position: 'bottom'
      },
      {
        element: '[data-tour="content-studio"]',
        intro: 'Create and schedule content for multiple platforms.',
        position: 'right'
      },
      {
        element: '[data-tour="media-library"]',
        intro: 'Access your media assets library.',
        position: 'right'
      }
    ]
  }
};

export const GuidedTourProvider = ({ children }) => {
  const [activeTour, setActiveTour] = useState(null);
  const [completedTours, setCompletedTours] = useState(() => {
    try {
      const saved = localStorage.getItem('sevora_completed_tours');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [tourPreferences, setTourPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('sevora_tour_preferences');
      return saved ? JSON.parse(saved) : { autoStart: true, showHints: true };
    } catch {
      return { autoStart: true, showHints: true };
    }
  });
  
  const introInstance = useRef(null);

  // Save completed tours to localStorage
  useEffect(() => {
    localStorage.setItem('sevora_completed_tours', JSON.stringify(completedTours));
  }, [completedTours]);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('sevora_tour_preferences', JSON.stringify(tourPreferences));
  }, [tourPreferences]);

  const startTour = useCallback((tourKey, options = {}) => {
    const tourDef = TOUR_DEFINITIONS[tourKey];
    if (!tourDef) {
      console.warn(`Tour "${tourKey}" not found`);
      return;
    }

    // Filter steps to only include elements that exist in the DOM
    const validSteps = tourDef.steps.filter(step => {
      if (!step.element) return true; // Intro steps without element
      return document.querySelector(step.element);
    });

    if (validSteps.length === 0) {
      console.warn(`No valid steps found for tour "${tourKey}"`);
      return;
    }

    setActiveTour(tourKey);

    // Create intro.js instance
    introInstance.current = introJs();
    
    introInstance.current.setOptions({
      steps: validSteps.map((step, index) => ({
        element: step.element ? document.querySelector(step.element) : undefined,
        intro: step.intro,
        position: step.position || 'auto',
        title: index === 0 ? tourDef.name : undefined
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
      hideNext: false,
      tooltipClass: 'sevora-tour-tooltip',
      highlightClass: 'sevora-tour-highlight',
      overlayOpacity: 0.7,
      scrollToElement: true,
      scrollPadding: 80,
      ...options
    });

    introInstance.current.oncomplete(() => {
      setCompletedTours(prev => [...new Set([...prev, tourKey])]);
      setActiveTour(null);
    });

    introInstance.current.onexit(() => {
      setActiveTour(null);
    });

    introInstance.current.start();
  }, []);

  const stopTour = useCallback(() => {
    if (introInstance.current) {
      introInstance.current.exit();
    }
    setActiveTour(null);
  }, []);

  const resetTour = useCallback((tourKey) => {
    setCompletedTours(prev => prev.filter(t => t !== tourKey));
  }, []);

  const resetAllTours = useCallback(() => {
    setCompletedTours([]);
  }, []);

  const isTourCompleted = useCallback((tourKey) => {
    return completedTours.includes(tourKey);
  }, [completedTours]);

  const updatePreferences = useCallback((prefs) => {
    setTourPreferences(prev => ({ ...prev, ...prefs }));
  }, []);

  const value = {
    activeTour,
    completedTours,
    tourPreferences,
    tourDefinitions: TOUR_DEFINITIONS,
    startTour,
    stopTour,
    resetTour,
    resetAllTours,
    isTourCompleted,
    updatePreferences
  };

  return (
    <GuidedTourContext.Provider value={value}>
      {children}
    </GuidedTourContext.Provider>
  );
};

export const useGuidedTour = () => {
  const context = useContext(GuidedTourContext);
  if (!context) {
    throw new Error('useGuidedTour must be used within a GuidedTourProvider');
  }
  return context;
};

// Hook for auto-starting tours on first visit
export const useAutoTour = (tourKey, dependencies = []) => {
  const { startTour, isTourCompleted, tourPreferences } = useGuidedTour();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (
      tourPreferences.autoStart && 
      !isTourCompleted(tourKey) && 
      !hasStarted.current
    ) {
      // Delay to ensure DOM is ready
      const timer = setTimeout(() => {
        hasStarted.current = true;
        startTour(tourKey);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [tourKey, startTour, isTourCompleted, tourPreferences.autoStart, ...dependencies]);
};

export default GuidedTourContext;
