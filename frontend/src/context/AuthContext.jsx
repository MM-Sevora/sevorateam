import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import axios from 'axios';

const AuthContext = createContext(null);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
    const { instance, accounts } = useMsal();
    const isAzureAuthenticated = useIsAuthenticated();
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('sevora_token'));
    const [loading, setLoading] = useState(true);
    const [authMethod, setAuthMethod] = useState(null); // 'azure' or 'local'

    // Department and role management
    const ROLE_DEPARTMENTS = {
        admin: ['marketing', 'sales', 'social'],
        marketing_manager: ['marketing'],
        sales_manager: ['sales'],
        social_manager: ['social'],
        stylist: ['sales'],
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
            logout();
            return null;
        }
    }, []);

    // Azure AD Login
    const loginWithAzure = async () => {
        try {
            setLoading(true);
            const response = await instance.loginPopup(loginRequest);
            
            // Get access token for Microsoft Graph
            const tokenResponse = await instance.acquireTokenSilent({
                ...loginRequest,
                account: response.account
            });

            // Send Azure token to backend
            const backendResponse = await axios.post(`${API}/auth/azure`, {
                azure_token: tokenResponse.accessToken
            });

            const { access_token, user: userData } = backendResponse.data;
            localStorage.setItem('sevora_token', access_token);
            setToken(access_token);
            userData.departments = getUserDepartments(userData.role);
            setUser(userData);
            setAuthMethod('azure');
            
            return userData;
        } catch (error) {
            console.error('Azure login failed:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Local Login (email/password)
    const loginWithCredentials = async (email, password) => {
        try {
            setLoading(true);
            const response = await axios.post(`${API}/auth/login`, { email, password });
            const { access_token, user: userData } = response.data;
            
            localStorage.setItem('sevora_token', access_token);
            setToken(access_token);
            userData.departments = getUserDepartments(userData.role);
            setUser(userData);
            setAuthMethod('local');
            
            return userData;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        } finally {
            setLoading(false);
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
            setToken(access_token);
            userData.departments = getUserDepartments(userData.role);
            setUser(userData);
            setAuthMethod('local');
            
            return userData;
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Logout
    const logout = useCallback(() => {
        localStorage.removeItem('sevora_token');
        setToken(null);
        setUser(null);
        setAuthMethod(null);
        
        // Also logout from Azure if authenticated via Azure
        if (accounts.length > 0) {
            instance.logoutPopup().catch(console.error);
        }
    }, [instance, accounts]);

    // Check if user has access to department
    const hasAccessToDepartment = (department) => {
        if (!user) return false;
        const userDepts = getUserDepartments(user.role);
        return userDepts.includes('admin') || userDepts.includes(department);
    };

    // Initialize auth state on mount
    useEffect(() => {
        const initAuth = async () => {
            setLoading(true);
            const savedToken = localStorage.getItem('sevora_token');
            
            if (savedToken) {
                try {
                    await fetchUserProfile(savedToken);
                    setAuthMethod('local');
                } catch (error) {
                    localStorage.removeItem('sevora_token');
                    setToken(null);
                }
            }
            setLoading(false);
        };

        initAuth();
    }, [fetchUserProfile]);

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
        ROLE_DEPARTMENTS
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
