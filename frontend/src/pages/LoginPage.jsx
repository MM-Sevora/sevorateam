import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const LoginPage = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'sales',
    phone: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('Welcome back to Sevora');
      } else {
        await register(formData.name, formData.email, formData.password, formData.role, formData.phone);
        toast.success('Account created successfully');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex paper-texture" data-testid="login-page">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12">
        <div>
          <h1 className="text-4xl font-heading text-white tracking-tight">Sevora</h1>
          <p className="text-white/70 mt-2 font-body text-sm tracking-wide uppercase">Stylist-Led Luxury Fashion</p>
        </div>
        <div className="space-y-8">
          <blockquote className="text-white/90 text-2xl font-heading leading-relaxed">
            "Empowering stylists to create unforgettable fashion moments."
          </blockquote>
          <div className="h-px bg-white/20 w-24" />
          <div className="text-white/60 text-sm font-body">
            <p>Lead Capture • Customer Profiles • Wedding Planning</p>
            <p className="mt-1">Pipeline Management • Analytics</p>
          </div>
        </div>
        <div className="text-white/40 text-xs font-body">
          © 2024 Sevora. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-12 text-center">
            <h1 className="text-3xl font-heading text-primary tracking-tight">Sevora</h1>
            <p className="text-muted-foreground text-xs tracking-wide uppercase mt-1">CRM Platform</p>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-heading text-foreground">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-muted-foreground mt-2 font-body text-sm">
                {isLogin ? 'Sign in to access your dashboard' : 'Register to get started with Sevora CRM'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs uppercase tracking-wider font-semibold">Full Name</Label>
                  <Input
                    id="name"
                    data-testid="register-name-input"
                    className="input-underline"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs uppercase tracking-wider font-semibold">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="email-input"
                  className="input-underline"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs uppercase tracking-wider font-semibold">Password</Label>
                <Input
                  id="password"
                  type="password"
                  data-testid="password-input"
                  className="input-underline"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>

              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs uppercase tracking-wider font-semibold">Phone (Optional)</Label>
                    <Input
                      id="phone"
                      data-testid="register-phone-input"
                      className="input-underline"
                      placeholder="+91 9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-semibold">Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                    >
                      <SelectTrigger data-testid="register-role-select" className="rounded-none">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="stylist">Stylist</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="customer_experience">Customer Experience</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <Button
                type="submit"
                data-testid="login-submit-btn"
                className="w-full rounded-sm uppercase tracking-wider text-xs py-6 font-semibold"
                disabled={loading}
              >
                {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                data-testid="toggle-auth-mode"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors font-body"
              >
                {isLogin ? "Don't have an account? Register" : 'Already have an account? Sign In'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
