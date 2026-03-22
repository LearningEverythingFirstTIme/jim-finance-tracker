'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-provider';
import { useHaptics } from '@/components/haptics-provider';
import { LogOut, User, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { trigger } = useHaptics();
  const { theme, setTheme } = useTheme();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-base font-medium">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-sm bg-primary/20 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            Account
          </CardTitle>
          <CardDescription className="font-medium">Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="font-bold">Email</p>
              <p className="text-sm text-muted-foreground font-medium">{user?.email}</p>
            </div>
          </div>
          <Button variant="destructive" onClick={() => { void trigger([100, 50, 100]); signOut(); }} className="w-full font-bold">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-sm bg-primary/20 flex items-center justify-center">
              <Sun className="h-4 w-4 text-primary" />
            </div>
            Appearance
          </CardTitle>
          <CardDescription className="font-medium">Customize the app appearance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-bold">Theme</p>
              <p className="text-sm text-muted-foreground font-medium">
                Choose between light and dark mode
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { void trigger("nudge"); setTheme('light'); }}
                className="font-bold"
              >
                <Sun className="h-4 w-4 mr-1" /> Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { void trigger("nudge"); setTheme('dark'); }}
                className="font-bold"
              >
                <Moon className="h-4 w-4 mr-1" /> Dark
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About</CardTitle>
          <CardDescription className="font-medium">App information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-bold text-foreground"><strong>Jim&apos;s Finance Tracker</strong></p>
            <p className="font-medium">Version 1.0.0</p>
            <p className="font-medium">Built with Next.js, Firebase, and shadcn/ui</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
