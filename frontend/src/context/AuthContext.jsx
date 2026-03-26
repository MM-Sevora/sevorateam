import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from '../authConfig';
import axios from 'axios';

const AuthContext = createContext(null);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create axios instance with timeout
const authAxios = axios.create({
    baseURL: API,
    timeout: 30000, // 30 second timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

export const AuthProvider = ({ children }) => {
    const { instance, accounts, inProgress } = useMsal();
    const isAzureAuthenticated = useIsAuthenticated();
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('sevora_token'));
    const [loading, setLoading] = useState(true);
    const [authMethod, setAuthMethod] = useState(localStorage.getItem('sevora_auth_method'));
    const azureLoginProcessed = useRef(false);
    const initAttempted = useRef(false);

    /**
     * DEPRECATED: Use module-based access instead.
     * These department mappings are kept for backward compatibility only.
     * New code should use user.merged_module_access instead.
     */
    const ROLE_DEPARTMENTS = {
        super_admin: ['marketing', 'sales', 'social', 'mail', 'admin'],
        admin: ['marketing', 'sales', 'social', 'mail', 'admin'],
        marketing_manager: ['marketing', 'mail'],
        sales_manager: ['sales', 'mail'],
        social_manager: ['social', 'mail'],
        viewer: []
    };

    /**
     * DEPRECATED: Use hasModuleAccess() instead.
     * This function is kept for backward compatibility.
     */
    const getUserDepartments = (role) => {
        console.warn('DEPRECATED: getUserDepartments() called. Use merged_module_access instead.');
        return ROLE_DEPARTMENTS[role] || [];
    };

    // Fetch user profile from backend
    const fetchUserProfile = useCallback(async (authToken) => {
        try {
            const response = await authAxios.get(`/auth/me`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const userData = response.data;
            // For backward compatibility, still populate departments
            userData.departments = userData.departments || getUserDepartments(userData.role);
            // Permissions are now included from backend
            setUser(userData);
            return userData;
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
            return null;
        }
    }, []);

    // Refresh token to extend session
    const refreshToken = useCallback(async () => {
        const currentToken = localStorage.getItem('sevora_token');
        if (!currentToken) return null;
        
        try {
            const response = await authAxios.post(`/auth/refresh`, {}, {
                headers: { Authorization: `Bearer ${currentToken}` }
            });
            const newToken = response.data.access_token;
            localStorage.setItem('sevora_token', newToken);
            setToken(newToken);
            console.log('Token refreshed successfully');
            return newToken;
        } catch (error) {
            console.error('Token refresh failed:', error);
            // If refresh fails, don't logout immediately - let the user continue until actual auth fails
            return null;
        }
    }, []);

    // Auto-refresh token every 6 hours to prevent session expiry
    useEffect(() => {
        if (!token || !user) return;
        
        // Refresh token every 6 hours (21600000 ms)
        const refreshInterval = setInterval(() => {
            console.log('Auto-refreshing token...');
            refreshToken();
        }, 6 * 60 * 60 * 1000);
        
        // Also refresh on visibility change (when user returns to tab)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && token) {
                refreshToken();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            clearInterval(refreshInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [token, user, refreshToken]);

    // Process Azure token and login to backend
    const processAzureToken = useCallback(async (account, forceProcess = false) => {
        if (azureLoginProcessed.current && !forceProcess) return null;
        azureLoginProcessed.current = true;
        
        try {
            setLoading(true);
            console.log('Processing Azure token for account:', account.username);
            
            // Get access token silently
            const tokenResponse = await instance.acquireTokenSilent({
                ...loginRequest,
                account: account
            });

            console.log('Got Azure access token, calling backend...');

            // Send Azure token to backend
            const backendResponse = await authAxios.post(`/auth/azure`, {
                azure_token: tokenResponse.accessToken
            });

            const { access_token, user: userData } = backendResponse.data;
            
            // Persist auth state
            localStorage.setItem('sevora_token', access_token);
            localStorage.setItem('sevora_auth_method', 'azure');
            
            setToken(access_token);
            userData.departments = getUserDepartments(userData.role);
            setUser(userData);
            setAuthMethod('azure');
            
            console.log('Azure login successful, user:', userData.email);
            
            return userData;
        } catch (error) {
            console.error('Azure token processing failed:', error);
            azureLoginProcessed.current = false;
            throw error;
        } finally {
            setLoading(false);
        }
    }, [instance]);

    // Azure AD Login with popup
    const loginWithAzure = async () => {
        try {
            setLoading(true);
            azureLoginProcessed.current = false;
            
            console.log('Starting Azure redirect login...');
            
            // Clear any stale MSAL state
            sessionStorage.removeItem('msal.interaction.status');
            
            // Check if there's already an interaction in progress
            const accounts = instance.getAllAccounts();
            if (accounts.length > 0) {
                console.log('Found existing account, trying silent login first...');
                try {
                    const silentRequest = {
                        ...loginRequest,
                        account: accounts[0]
                    };
                    const response = await instance.acquireTokenSilent(silentRequest);
                    if (response && response.accessToken) {
                        // Process the token
                        const authResponse = await fetch(`${API}/auth/azure`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ azure_token: response.accessToken })
                        });
                        
                        if (authResponse.ok) {
                            const data = await authResponse.json();
                            localStorage.setItem('sevora_token', data.access_token);
                            localStorage.setItem('sevora_auth_method', 'azure');
                            setToken(data.access_token);
                            data.user.departments = getUserDepartments(data.user.role);
                            setUser(data.user);
                            setAuthMethod('azure');
                            setLoading(false);
                            return data.user;
                        }
                    }
                } catch (silentError) {
                    console.log('Silent login failed, proceeding with redirect...');
                }
            }
            
            // Mark this as app login (not email login)
            sessionStorage.setItem('msalLoginType', 'app');
            // Use redirect instead of popup (popup has issues with some browsers/configs)
            await instance.loginRedirect(loginRequest);
            // This will redirect, so we won't reach here
            return null;
        } catch (error) {
            console.error('Azure login failed:', error);
            setLoading(false);
            throw error;
        }
    };

    // Local Login (email/password) with retry
    const loginWithCredentials = async (email, password, retries = 2) => {
        try {
            setLoading(true);
            
            let lastError;
            for (let i = 0; i <= retries; i++) {
                try {
                    const { access_token, user: userData } = await authAxios.post(`/auth/login`, { email, password }).then(r => r.data);
                    
                    localStorage.setItem('sevora_token', access_token);
                    localStorage.setItem('sevora_auth_method', 'local');
                    
                    setToken(access_token);
                    userData.departments = getUserDepartments(userData.role);
                    setUser(userData);
                    setAuthMethod('local');
                    setLoading(false);
                    
                    return userData;
                } catch (error) {
                    lastError = error;
                    // Only retry on network errors, not auth errors
                    if (error.response?.status === 401 || error.response?.status === 403) {
                        throw error; // Don't retry auth errors
                    }
                    if (i < retries) {
                        console.log(`Login attempt ${i + 1} failed, retrying...`);
                        await new Promise(r => setTimeout(r, 500)); // Wait 500ms before retry
                    }
                }
            }
            throw lastError;
        } catch (error) {
            console.error('Login failed:', error);
            setLoading(false);
            throw error;
        }
    };

    // Register new user
    const register = async (name, email, password, department = 'sales', role = 'viewer') => {
        try {
            setLoading(true);
            const response = await authAxios.post(`/auth/register`, {
                name,
                email,
                password,
                department,
                role
            });
            const { access_token, user: userData } = response.data;
            
            localStorage.setItem('sevora_token', access_token);
            localStorage.setItem('sevora_auth_method', 'local');
            
            setToken(access_token);
            userData.departments = getUserDepartments(userData.role);
            setUser(userData);
            setAuthMethod('local');
            setLoading(false);
            
            return userData;
        } catch (error) {
            console.error('Registration failed:', error);
            setLoading(false);
            throw error;
        }
    };

    // Logout
    const logout = useCallback(() => {
        localStorage.removeItem('sevora_token');
        localStorage.removeItem('sevora_auth_method');
        setToken(null);
        setUser(null);
        setAuthMethod(null);
        azureLoginProcessed.current = false;
        
        // Also logout from Azure if authenticated via Azure
        if (accounts.length > 0) {
            instance.logoutPopup().catch(console.error);
        }
    }, [instance, accounts]);

    // Module-to-Department mapping for backward compatibility
    const MODULE_DEPARTMENT_MAP = {
        "dashboard": ["admin", "marketing", "sales", "social", "mail"],
        "marketing_ops": ["marketing", "admin"],
        "project_management": ["admin", "marketing", "sales"],
        "mail": ["mail", "marketing", "admin"],
        "social": ["social", "marketing", "admin"],
        "admin": ["admin"],
        "hr": ["admin", "hr"],
        "help_support": ["admin", "marketing", "sales", "social", "mail"],
        "automations": ["admin"],
        "meetings": ["admin", "marketing", "sales"],
        "communication_hub": ["marketing", "sales", "admin"]
    };

    // Check if user has access to department (DEPRECATED - use hasModuleAccess)
    // Now also checks module-based access for backward compatibility
    const hasAccessToDepartment = (department) => {
        if (!user) return false;
        
        // Super admin always has access
        if (user.role === 'super_admin') return true;
        
        // First check old department-based system
        const userDepts = user.departments || getUserDepartments(user.role);
        if (userDepts.includes('admin') || userDepts.includes(department)) {
            return true;
        }
        
        // NEW: Also check module-based access for backward compatibility
        const userModules = user.merged_module_access || [];
        for (const module of userModules) {
            const moduleDepts = MODULE_DEPARTMENT_MAP[module] || [];
            if (moduleDepts.includes(department)) {
                return true;
            }
        }
        
        return false;
    };

    // Check if user has access to a specific module (new module-based system)
    const hasModuleAccess = (moduleKey) => {
        if (!user) return false;
        
        // Super admin always has access
        if (user.role === 'super_admin') return true;
        
        // Default access modules - everyone has access
        const DEFAULT_ACCESS_MODULES = ['dashboard', 'sevora_pulse', 'notifications', 'help_support', 'employee_self_service', 'analytics_insights'];
        if (DEFAULT_ACCESS_MODULES.includes(moduleKey)) return true;
        
        // Check merged_module_access from user object
        const userModules = user.merged_module_access || [];
        if (userModules.includes(moduleKey)) return true;
        
        // Fallback: check if module is in custom_role_ids-based access
        // This requires the user object to have the merged access
        return false;
    };

    // Check if user has access to a specific sub-module
    const hasSubModuleAccess = (moduleKey, subModuleCode) => {
        if (!user) return false;
        
        // Super admin always has access
        if (user.role === 'super_admin') return true;
        
        // First check if user has access to the parent module
        if (!hasModuleAccess(moduleKey)) return false;
        
        // If no sub_module_access defined, user has access to all sub-modules of granted modules
        const subModuleAccess = user.sub_module_access || {};
        if (!subModuleAccess[moduleKey] || subModuleAccess[moduleKey].length === 0) {
            // No restrictions = access to all sub-modules
            return true;
        }
        
        // Check if specific sub-module is in the allowed list
        return subModuleAccess[moduleKey].includes(subModuleCode);
    };

    // Check if user has specific permission for a module action
    // Usage: hasPermission('marketing', 'influencers', 'create')
    const hasPermission = (department, module, action) => {
        if (!user) return false;
        
        // Super admin and admin have all permissions
        if (user.role === 'super_admin' || user.role === 'admin') {
            return true;
        }
        
        // Check user's permissions object
        if (user.permissions) {
            const deptPerms = user.permissions[department];
            if (deptPerms && deptPerms[module]) {
                return deptPerms[module].includes(action);
            }
        }
        
        // Fallback to department access for backward compatibility
        return hasAccessToDepartment(department);
    };

    // Initialize auth state on mount and handle Azure redirect
    useEffect(() => {
        const initAuth = async () => {
            if (initAttempted.current) return;
            initAttempted.current = true;
            
            setLoading(true);
            console.log('Initializing auth, inProgress:', inProgress, 'accounts:', accounts.length);
            
            // First check for saved token
            const savedToken = localStorage.getItem('sevora_token');
            const savedAuthMethod = localStorage.getItem('sevora_auth_method');
            
            if (savedToken) {
                console.log('Found saved token, verifying with method:', savedAuthMethod);
                setToken(savedToken); // Set token immediately for optimistic UI
                
                // Try to verify the token with retries
                let verified = false;
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        const userData = await fetchUserProfile(savedToken);
                        if (userData) {
                            setAuthMethod(savedAuthMethod || 'local');
                            setLoading(false);
                            console.log('Token valid, user restored:', userData.email);
                            verified = true;
                            return;
                        }
                    } catch (error) {
                        console.error(`Token verification attempt ${attempt + 1} failed:`, error);
                        
                        // Only clear token if it's definitely expired (401)
                        if (error.response?.status === 401) {
                            console.log('Token expired, clearing...');
                            localStorage.removeItem('sevora_token');
                            localStorage.removeItem('sevora_auth_method');
                            setToken(null);
                            break; // Don't retry on auth errors
                        }
                        
                        // Wait before retry on network errors
                        if (attempt < 2) {
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    }
                }
                
                // If we verified successfully or had a network issue, don't try Azure
                if (verified || savedAuthMethod === 'local') {
                    setLoading(false);
                    return;
                }
            }
            
            // Only try MSAL auto-login if:
            // 1. No saved local token
            // 2. MSAL has accounts
            // 3. Not already processed
            // 4. User explicitly logged in with Azure before (check session)
            const msalLoginType = sessionStorage.getItem('msalLoginType');
            if (accounts.length > 0 && !azureLoginProcessed.current && msalLoginType === 'app') {
                try {
                    console.log('Found MSAL account, processing Azure token...');
                    await processAzureToken(accounts[0]);
                } catch (error) {
                    console.error('Auto Azure login failed:', error);
                }
            }
            
            setLoading(false);
        };

        if (inProgress === InteractionStatus.None) {
            initAuth();
        }
    }, [fetchUserProfile, accounts, inProgress, processAzureToken]);

    // Fetch site settings and update document title
    useEffect(() => {
        const fetchSiteSettings = async () => {
            try {
                // Use public endpoint - no auth required
                const response = await authAxios.get(`/settings/website/public`);
                if (response.data?.site_name) {
                    document.title = response.data.site_name;
                    // Also update meta description if present
                    if (response.data.site_description) {
                        const metaDesc = document.querySelector('meta[name="description"]');
                        if (metaDesc) {
                            metaDesc.setAttribute('content', response.data.site_description);
                        }
                    }
                }
            } catch (error) {
                // Silently fail - keep default title
                console.log('Could not fetch site settings for title');
            }
        };
        
        // Fetch on mount
        fetchSiteSettings();
    }, []);

    // Create authenticated API instance
    const api = useMemo(() => {
        const instance = axios.create({
            baseURL: `${BACKEND_URL}/api`,
            headers: { 'Content-Type': 'application/json' }
        });
        
        instance.interceptors.request.use((config) => {
            const currentToken = localStorage.getItem('sevora_token');
            if (currentToken) {
                config.headers.Authorization = `Bearer ${currentToken}`;
            }
            return config;
        });
        
        return instance;
    }, []);

    const value = {
        user,
        token,
        loading,
        authMethod,
        isAuthenticated: !!token && !!user,
        loginWithAzure,
        loginWithCredentials,
        register,
        logout,
        hasAccessToDepartment,
        hasModuleAccess,
        hasSubModuleAccess,
        hasPermission,
        getUserDepartments,
        ROLE_DEPARTMENTS,
        api
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
