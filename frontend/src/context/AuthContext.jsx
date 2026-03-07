import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from '../authConfig';
import axios from 'axios';

const AuthContext = createContext(null);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
    const { instance, accounts, inProgress } = useMsal();
    const isAzureAuthenticated = useIsAuthenticated();
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('sevora_token'));
    const [loading, setLoading] = useState(true);
    const [authMethod, setAuthMethod] = useState(localStorage.getItem('sevora_auth_method'));
    const azureLoginProcessed = useRef(false);
    const initAttempted = useRef(false);

    // Department and role management
    const ROLE_DEPARTMENTS = {
        super_admin: ['marketing', 'sales', 'social', 'admin'],
        admin: ['marketing', 'sales', 'social', 'admin'],
        marketing_manager: ['marketing'],
        sales_manager: ['sales'],
        social_manager: ['social'],
        viewer: []
    };

    const getUserDepartments = (role) => ROLE_DEPARTMENTS[role] || [];

    // Fetch user profile from backend
    const fetchUserProfile = useCallback(async (authToken) => {
        try {
            const response = await axios.get(`${API}/auth/me`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const userData = response.data;
            userData.departments = getUserDepartments(userData.role);
            setUser(userData);
            return userData;
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
            return null;
        }
    }, []);

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
            const backendResponse = await axios.post(`${API}/auth/azure`, {
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
            
            console.log('Starting Azure popup login...');
            const response = await instance.loginPopup(loginRequest);
            console.log('Popup login successful, account:', response.account.username);
            
            // Process the token after successful popup login
            const userData = await processAzureToken(response.account, true);
            return userData;
        } catch (error) {
            console.error('Azure login failed:', error);
            setLoading(false);
            throw error;
        }
    };

    // Local Login (email/password)
    const loginWithCredentials = async (email, password) => {
        try {
            setLoading(true);
            const response = await axios.post(`${API}/auth/login`, { email, password });
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
            console.error('Login failed:', error);
            setLoading(false);
            throw error;
        }
    };

    // Register new user
    const register = async (name, email, password, department = 'sales', role = 'viewer') => {
        try {
            setLoading(true);
            const response = await axios.post(`${API}/auth/register`, {
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

    // Check if user has access to department
    const hasAccessToDepartment = (department) => {
        if (!user) return false;
        // First check if user has 'admin' in their departments (full access)
        // Then check if the specific department is in their list
        const userDepts = user.departments || getUserDepartments(user.role);
        return userDepts.includes('admin') || userDepts.includes(department);
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
                try {
                    console.log('Found saved token, verifying...');
                    const userData = await fetchUserProfile(savedToken);
                    if (userData) {
                        setAuthMethod(savedAuthMethod || 'local');
                        setLoading(false);
                        console.log('Token valid, user restored:', userData.email);
                        return;
                    }
                } catch (error) {
                    console.error('Saved token invalid, clearing...');
                    localStorage.removeItem('sevora_token');
                    localStorage.removeItem('sevora_auth_method');
                    setToken(null);
                }
            }
            
            // If MSAL has accounts (user already authenticated with Azure)
            if (accounts.length > 0 && !azureLoginProcessed.current) {
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
