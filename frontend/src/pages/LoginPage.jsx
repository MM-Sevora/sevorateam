import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Briefcase, Mail, Lock, User, Building2 } from 'lucide-react';

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
    const { loginWithAzure, loginWithCredentials, register } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('login');

    // Login form state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Register form state
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regDepartment, setRegDepartment] = useState('sales');

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
            // Check for specific error types
            if (error.errorCode === 'user_cancelled') {
                toast.info('Login cancelled');
            } else if (error.errorCode === 'popup_window_error') {
                toast.error('Popup blocked. Please allow popups for this site.');
            } else {
                toast.error(error.message || 'Microsoft login failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCredentialsLogin = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await loginWithCredentials(loginEmail, loginPassword);
            toast.success('Welcome back!');
            navigate('/');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await register(regName, regEmail, regPassword, regDepartment, 'viewer');
            toast.success('Account created successfully!');
            navigate('/');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Registration failed');
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
                        <Briefcase className="w-8 h-8 text-[#4A3728]" />
                    </div>
                    <h1 className="text-3xl font-bold text-[#4A3728]">
                        SEVORA TEAM
                    </h1>
                    <p className="text-[#5D4A3A] text-sm mt-1">Unified Operations Platform</p>
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

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-[#F5EDE5]">
                                <TabsTrigger 
                                    value="login" 
                                    className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-[#4A3728]"
                                >
                                    Login
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="register"
                                    className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-[#4A3728]"
                                >
                                    Register
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="login" className="mt-4">
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
                            </TabsContent>

                            <TabsContent value="register" className="mt-4">
                                <form onSubmit={handleRegister} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[#4A3728]">Full Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5D4A3A]" />
                                            <Input
                                                type="text"
                                                placeholder="John Doe"
                                                value={regName}
                                                onChange={(e) => setRegName(e.target.value)}
                                                className="pl-10 bg-white border-[#D4BBA6] text-[#4A3728] placeholder:text-[#5D4A3A]/50"
                                                required
                                                data-testid="register-name-input"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[#4A3728]">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5D4A3A]" />
                                            <Input
                                                type="email"
                                                placeholder="you@company.com"
                                                value={regEmail}
                                                onChange={(e) => setRegEmail(e.target.value)}
                                                className="pl-10 bg-white border-[#D4BBA6] text-[#4A3728] placeholder:text-[#5D4A3A]/50"
                                                required
                                                data-testid="register-email-input"
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
                                                value={regPassword}
                                                onChange={(e) => setRegPassword(e.target.value)}
                                                className="pl-10 bg-white border-[#D4BBA6] text-[#4A3728] placeholder:text-[#5D4A3A]/50"
                                                required
                                                data-testid="register-password-input"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[#4A3728]">Department</Label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5D4A3A]" />
                                            <select
                                                value={regDepartment}
                                                onChange={(e) => setRegDepartment(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 bg-white border border-[#D4BBA6] rounded-md text-[#4A3728]"
                                                data-testid="register-department-select"
                                            >
                                                <option value="marketing">Marketing Ops</option>
                                                <option value="sales">Sales</option>
                                                <option value="social">Social Media</option>
                                            </select>
                                        </div>
                                    </div>
                                    <Button 
                                        type="submit" 
                                        disabled={loading}
                                        className="w-full bg-[#4A3728] hover:bg-[#3A2A1E] text-white shadow-md"
                                        data-testid="register-submit-btn"
                                    >
                                        {loading ? 'Creating account...' : 'Create Account'}
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                <p className="text-center text-[#5D4A3A] text-xs mt-6">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
