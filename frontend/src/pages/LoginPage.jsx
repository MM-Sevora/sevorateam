import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export const LoginPage = () => {
    const { login, register } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        email: '',
        password: '',
        name: '',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isRegister) {
                await register(form.email, form.password, form.name);
                toast.success('Account created successfully');
            } else {
                await login(form.email, form.password);
                toast.success('Welcome back');
            }
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Left Side - Hero Image */}
            <div className="hidden lg:flex lg:w-1/2 relative">
                <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: 'url(https://images.unsplash.com/photo-1646514336754-1c3fe17e28c2?crop=entropy&cs=srgb&fm=jpg&q=85)',
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
                </div>
                <div className="relative z-10 flex flex-col justify-end p-12 text-white">
                    <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold mb-4">
                        Influencer Operations
                    </p>
                    <h1 className="font-serif text-5xl md:text-6xl leading-[1.1] mb-6">
                        SEVORA<br />
                        <span className="text-gold">Style Circle</span>
                    </h1>
                    <p className="text-white/70 text-lg max-w-md">
                        India's first stylist-led fashion platform. Discover, connect, and collaborate with fashion's finest creators.
                    </p>
                </div>
            </div>

            {/* Right Side - Auth Form */}
            <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
                <div className="w-full max-w-md">
                    <div className="mb-12">
                        <h2 className="font-serif text-3xl mb-2">
                            {isRegister ? 'Join the Circle' : 'Welcome Back'}
                        </h2>
                        <p className="text-muted-foreground">
                            {isRegister 
                                ? 'Create your account to start managing influencer campaigns'
                                : 'Sign in to your SEVORA operations dashboard'
                            }
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {isRegister && (
                            <div className="space-y-2">
                                <Label htmlFor="name" className="font-mono text-xs uppercase tracking-wider">
                                    Full Name
                                </Label>
                                <Input
                                    id="name"
                                    data-testid="name-input"
                                    type="text"
                                    placeholder="Enter your name"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="bg-transparent border-0 border-b border-border rounded-none px-0 focus:ring-0 focus-visible:ring-0 focus:border-gold"
                                    required={isRegister}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email" className="font-mono text-xs uppercase tracking-wider">
                                Email Address
                            </Label>
                            <Input
                                id="email"
                                data-testid="email-input"
                                type="email"
                                placeholder="you@company.com"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="bg-transparent border-0 border-b border-border rounded-none px-0 focus:ring-0 focus-visible:ring-0 focus:border-gold"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="font-mono text-xs uppercase tracking-wider">
                                Password
                            </Label>
                            <Input
                                id="password"
                                data-testid="password-input"
                                type="password"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="bg-transparent border-0 border-b border-border rounded-none px-0 focus:ring-0 focus-visible:ring-0 focus:border-gold"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            data-testid="auth-submit-btn"
                            disabled={loading}
                            className="w-full bg-primary text-primary-foreground rounded-none h-12 font-mono text-xs uppercase tracking-widest hover:bg-gold hover:text-white transition-all duration-300"
                        >
                            {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
                        </Button>
                    </form>

                    <div className="mt-8 text-center">
                        <button
                            data-testid="toggle-auth-mode"
                            onClick={() => setIsRegister(!isRegister)}
                            className="text-muted-foreground hover:text-gold transition-colors font-mono text-xs uppercase tracking-wider"
                        >
                            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
