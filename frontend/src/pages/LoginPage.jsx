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
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 mb-4">
                        <Briefcase className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                        SEVORA TEAM
                    </h1>
                    <p className="text-white/40 text-sm mt-1">Unified Operations Platform</p>
                </div>

                <Card className="bg-[#12121a]/80 backdrop-blur-xl border-white/10">
                    <CardHeader className="text-center pb-4">
                        <CardTitle className="text-white text-xl">Welcome</CardTitle>
                        <CardDescription className="text-white/50">
                            Sign in to access your dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Microsoft Login Button */}
                        <Button
                            onClick={handleAzureLogin}
                            disabled={loading}
                            variant="outline"
                            className="w-full h-12 bg-white hover:bg-gray-100 text-gray-800 border-0 font-medium"
                            data-testid="microsoft-login-btn"
                        >
                            <MicrosoftLogo />
                            <span className="ml-3">Sign in with Microsoft</span>
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-4 bg-[#12121a] text-white/40">or continue with email</span>
                            </div>
                        </div>

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-white/5">
                                <TabsTrigger 
                                    value="login" 
                                    className="data-[state=active]:bg-violet-500 data-[state=active]:text-white"
                                >
                                    Login
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="register"
                                    className="data-[state=active]:bg-violet-500 data-[state=active]:text-white"
                                >
                                    Register
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="login" className="mt-4">
                                <form onSubmit={handleCredentialsLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-white/70">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                            <Input
                                                type="email"
                                                placeholder="you@company.com"
                                                value={loginEmail}
                                                onChange={(e) => setLoginEmail(e.target.value)}
                                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                                                required
                                                data-testid="login-email-input"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-white/70">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                            <Input
                                                type="password"
                                                placeholder="••••••••"
                                                value={loginPassword}
                                                onChange={(e) => setLoginPassword(e.target.value)}
                                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                                                required
                                                data-testid="login-password-input"
                                            />
                                        </div>
                                    </div>
                                    <Button 
                                        type="submit" 
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                                        data-testid="login-submit-btn"
                                    >
                                        {loading ? 'Signing in...' : 'Sign In'}
                                    </Button>
                                </form>
                            </TabsContent>

                            <TabsContent value="register" className="mt-4">
                                <form onSubmit={handleRegister} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-white/70">Full Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                            <Input
                                                type="text"
                                                placeholder="John Doe"
                                                value={regName}
                                                onChange={(e) => setRegName(e.target.value)}
                                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                                                required
                                                data-testid="register-name-input"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-white/70">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                            <Input
                                                type="email"
                                                placeholder="you@company.com"
                                                value={regEmail}
                                                onChange={(e) => setRegEmail(e.target.value)}
                                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                                                required
                                                data-testid="register-email-input"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-white/70">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                            <Input
                                                type="password"
                                                placeholder="••••••••"
                                                value={regPassword}
                                                onChange={(e) => setRegPassword(e.target.value)}
                                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                                                required
                                                data-testid="register-password-input"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-white/70">Department</Label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                            <select
                                                value={regDepartment}
                                                onChange={(e) => setRegDepartment(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-md text-white"
                                                data-testid="register-department-select"
                                            >
                                                <option value="marketing" className="bg-[#12121a]">Marketing Ops</option>
                                                <option value="sales" className="bg-[#12121a]">Sales</option>
                                                <option value="social" className="bg-[#12121a]">Social Media</option>
                                            </select>
                                        </div>
                                    </div>
                                    <Button 
                                        type="submit" 
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                                        data-testid="register-submit-btn"
                                    >
                                        {loading ? 'Creating account...' : 'Create Account'}
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                <p className="text-center text-white/30 text-xs mt-6">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
