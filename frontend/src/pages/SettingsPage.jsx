import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import {
  User,
  Mail,
  Phone,
  Shield,
  Bell,
  Database,
  Key
} from 'lucide-react';

const SettingsPage = () => {
  const { user } = useAuth();

  return (
    <div className="p-8 space-y-8 animate-slide-in max-w-4xl" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1 font-body text-sm">Manage your account and system preferences</p>
      </div>

      {/* Profile Settings */}
      <Card className="card-sharp">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-heading">Profile Settings</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider">Full Name</Label>
            <Input
              className="rounded-none"
              defaultValue={user?.name}
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider">Email</Label>
            <Input
              className="rounded-none"
              defaultValue={user?.email}
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider">Phone</Label>
            <Input
              className="rounded-none"
              defaultValue={user?.phone || ''}
              placeholder="Add phone number"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider">Role</Label>
            <div className="h-10 flex items-center">
              <Badge className="bg-primary rounded-full capitalize">
                {user?.role?.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <Button className="rounded-sm uppercase tracking-wider text-xs">
            Update Profile
          </Button>
        </div>
      </Card>

      {/* Security Settings */}
      <Card className="card-sharp">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-heading">Security</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
            </div>
            <Button variant="outline" className="rounded-sm text-xs uppercase tracking-wider">
              Change Password
            </Button>
          </div>
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
            </div>
            <Button variant="outline" className="rounded-sm text-xs uppercase tracking-wider">
              Enable 2FA
            </Button>
          </div>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="card-sharp">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-heading">Notifications</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-muted-foreground">Receive email when new leads are assigned</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 rounded-full">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div>
              <p className="font-medium">WhatsApp Notifications</p>
              <p className="text-sm text-muted-foreground">Send automatic WhatsApp to new leads</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 rounded-full">Enabled</Badge>
          </div>
        </div>
      </Card>

      {/* Integration Settings */}
      <Card className="card-sharp">
        <div className="flex items-center gap-3 mb-6">
          <Key className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-heading">Integrations</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 flex items-center justify-center rounded">
                <span className="text-green-600 font-bold text-sm">WA</span>
              </div>
              <div>
                <p className="font-medium">WhatsApp Business</p>
                <p className="text-sm text-muted-foreground">Twilio WhatsApp API</p>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 rounded-full">Connected</Badge>
          </div>
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 flex items-center justify-center rounded">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Email Service</p>
                <p className="text-sm text-muted-foreground">SendGrid API</p>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 rounded-full">Connected</Badge>
          </div>
        </div>
      </Card>

      {/* Data Management */}
      <Card className="card-sharp">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-heading">Data Management</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div>
              <p className="font-medium">Export Data</p>
              <p className="text-sm text-muted-foreground">Download all leads and customers as CSV</p>
            </div>
            <Button variant="outline" className="rounded-sm text-xs uppercase tracking-wider">
              Export
            </Button>
          </div>
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">Import Data</p>
              <p className="text-sm text-muted-foreground">Bulk import leads from CSV file</p>
            </div>
            <Button variant="outline" className="rounded-sm text-xs uppercase tracking-wider">
              Import
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
