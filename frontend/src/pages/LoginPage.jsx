import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Briefcase, Mail, Lock } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Microsoft Logo SVG
const MicrosoftLogo = () => (
    <svg className="w-5 h-5" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
        <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
        <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
        <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
    </svg>
);

export const LoginPage = () => {
    const { loginWithAzure, loginWithCredentials } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [siteSettings, setSiteSettings] = useState({
        site_name: 'SEVORA TEAM',
        site_tagline: 'Unified Operations Platform'
    });

    // Login form state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Fetch site branding
    useEffect(() => {
        const fetchBranding = async () => {
            try {
                const res = await axios.get(`${API}/api/settings/website/public`);
                if (res.data) {
                    setSiteSettings({
                        site_name: res.data.site_name || 'SEVORA TEAM',
                        site_tagline: res.data.site_tagline || 'Unified Operations Platform'
                    });
                }
            } catch (e) {
                // Use defaults
            }
        };
        fetchBranding();
    }, []);

    const handleAzureLogin = async () => {
        try {
            setLoading(true);
            const userData = await loginWithAzure();
            if (userData) {
                toast.success('Welcome to Sevora Team!');
                navigate('/');
            }
        } catch (error) {
            console.error('Azure login error:', error);
            if (error.errorCode === 'user_cancelled') {
                toast.info('Login cancelled');
            } else if (error.errorCode === 'interaction_in_progress') {
                toast.info('Login already in progress');
            } else {
                toast.error('Login failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCredentialsLogin = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            // Clear any stale MSAL state that might interfere
            sessionStorage.removeItem('msalLoginType');
            
            const userData = await loginWithCredentials(loginEmail, loginPassword);
            if (userData) {
                toast.success('Welcome back!');
                // Small delay to ensure state is updated before navigation
                setTimeout(() => navigate('/'), 100);
            }
        } catch (error) {
            console.error('Login error:', error);
            toast.error(error.response?.data?.detail || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F5EDE5] to-[#E8D5C4] flex items-center justify-center p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4BBA6]/30 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#E8D5C4]/50 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#4A3728] mb-4 shadow-lg">
                        <Briefcase className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-[#4A3728] uppercase tracking-wide">
                        {siteSettings.site_name}
                    </h1>
                    <p className="text-[#5D4A3A] text-sm mt-1">{siteSettings.site_tagline}</p>
                </div>

                <Card className="bg-white/95 backdrop-blur-xl border-[#D4BBA6] shadow-xl">
                    <CardHeader className="text-center pb-4">
                        <CardTitle className="text-[#4A3728] text-xl">Welcome</CardTitle>
                        <CardDescription className="text-[#5D4A3A]">
                            Sign in to access your dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Microsoft Login Button */}
                        <Button
                            onClick={handleAzureLogin}
                            disabled={loading}
                            variant="outline"
                            className="w-full h-12 bg-white hover:bg-[#F5EDE5] text-[#4A3728] border-[#D4BBA6] font-medium shadow-sm"
                            data-testid="microsoft-login-btn"
                        >
                            <MicrosoftLogo />
                            <span className="ml-3">Sign in with Microsoft</span>
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-[#D4BBA6]" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-4 bg-white text-[#5D4A3A]">or continue with email</span>
                            </div>
                        </div>

                        {/* Email/Password Login Form */}
                        <form onSubmit={handleCredentialsLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[#4A3728]">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5D4A3A]" />
                                    <Input
                                        type="email"
                                        placeholder="you@company.com"
                                        value={loginEmail}
                                        onChange={(e) => setLoginEmail(e.target.value)}
                                        className="pl-10 bg-white border-[#D4BBA6] text-[#4A3728] placeholder:text-[#5D4A3A]/50 focus:border-[#4A3728] focus:ring-[#4A3728]"
                                        required
                                        data-testid="login-email-input"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[#4A3728]">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5D4A3A]" />
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        className="pl-10 bg-white border-[#D4BBA6] text-[#4A3728] placeholder:text-[#5D4A3A]/50 focus:border-[#4A3728] focus:ring-[#4A3728]"
                                        required
                                        data-testid="login-password-input"
                                    />
                                </div>
                            </div>
                            <Button 
                                type="submit" 
                                disabled={loading}
                                className="w-full bg-[#4A3728] hover:bg-[#3A2A1E] text-white shadow-md"
                                data-testid="login-submit-btn"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </Button>
                        </form>

                        <p className="text-center text-xs text-[#5D4A3A]">
                            Need access? Contact your administrator
                        </p>
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-[#5D4A3A] mt-6">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
