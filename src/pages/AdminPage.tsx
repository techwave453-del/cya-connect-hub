import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTheme, themes } from "@/contexts/ThemeContext";
import { Shield, Users, Palette, BookOpen, Plus, Trash2, RefreshCw, ArrowLeft } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

interface AdminEmail {
  id: string;
  email: string;
  created_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface BibleVerse {
  id: string;
  reference: string;
  text: string;
  day_of_year: number | null;
}

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const { currentTheme, setTheme } = useTheme();

  // User Management State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adminEmails, setAdminEmails] = useState<AdminEmail[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserUsername, setNewUserUsername] = useState("");
  const [resetPasswordEmail, setResetPasswordEmail] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);

  // Bible Verse State
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [newVerseReference, setNewVerseReference] = useState("");
  const [newVerseText, setNewVerseText] = useState("");

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) {
        navigate("/auth");
        return;
      }
      if (!isAdmin) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
      fetchData();
    }
  }, [authLoading, adminLoading, user, isAdmin, navigate]);

  const fetchData = async () => {
    // Fetch profiles
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (profileData) setProfiles(profileData);

    // Fetch admin emails
    const { data: adminData } = await supabase
      .from('admin_emails')
      .select('*')
      .order('created_at', { ascending: false });
    if (adminData) setAdminEmails(adminData);

    // Fetch bible verses
    const { data: verseData } = await supabase
      .from('bible_verses')
      .select('*')
      .order('day_of_year', { ascending: true });
    if (verseData) setVerses(verseData);
  };

  const handleAddAdminEmail = async () => {
    try {
      emailSchema.parse(newAdminEmail);
    } catch {
      toast({ title: "Invalid email format", variant: "destructive" });
      return;
    }

    setLoadingAction(true);
    const { error } = await supabase
      .from('admin_emails')
      .insert({ email: newAdminEmail.toLowerCase().trim() });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Admin email added successfully" });
      setNewAdminEmail("");
      fetchData();
    }
    setLoadingAction(false);
  };

  const handleRemoveAdminEmail = async (id: string) => {
    setLoadingAction(true);
    const { error } = await supabase
      .from('admin_emails')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Admin email removed" });
      fetchData();
    }
    setLoadingAction(false);
  };

  const handleCreateUser = async () => {
    try {
      emailSchema.parse(newUserEmail);
      passwordSchema.parse(newUserPassword);
      if (!newUserUsername.trim()) throw new Error("Username required");
    } catch (err) {
      toast({ title: "Validation Error", description: err instanceof Error ? err.message : "Invalid input", variant: "destructive" });
      return;
    }

    setLoadingAction(true);
    
    // Note: Creating users requires service role key, so we'll use an edge function
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email: newUserEmail.toLowerCase().trim(),
        password: newUserPassword,
        username: newUserUsername.trim()
      }
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data?.error) {
      toast({ title: "Error", description: data.error, variant: "destructive" });
    } else {
      toast({ title: "User created successfully" });
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserUsername("");
      fetchData();
    }
    setLoadingAction(false);
  };

  const handleResetPassword = async () => {
    try {
      emailSchema.parse(resetPasswordEmail);
    } catch {
      toast({ title: "Invalid email format", variant: "destructive" });
      return;
    }

    setLoadingAction(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      resetPasswordEmail.toLowerCase().trim(),
      { redirectTo: `${window.location.origin}/auth` }
    );

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password reset email sent" });
      setResetPasswordEmail("");
    }
    setLoadingAction(false);
  };

  const handleThemeChange = async (theme: typeof themes[0]) => {
    setLoadingAction(true);
    
    const { error } = await supabase
      .from('app_settings')
      .update({ 
        value: { name: theme.name, primary: theme.primary, secondary: theme.secondary },
        updated_by: user?.id
      })
      .eq('key', 'theme');

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setTheme(theme);
      toast({ title: `Theme changed to ${theme.label}` });
    }
    setLoadingAction(false);
  };

  const handleAddVerse = async () => {
    if (!newVerseReference.trim() || !newVerseText.trim()) {
      toast({ title: "Please fill in both reference and text", variant: "destructive" });
      return;
    }

    setLoadingAction(true);
    const nextDayOfYear = verses.length > 0 ? Math.max(...verses.map(v => v.day_of_year || 0)) + 1 : 1;

    const { error } = await supabase
      .from('bible_verses')
      .insert({
        reference: newVerseReference.trim(),
        text: newVerseText.trim(),
        day_of_year: nextDayOfYear
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Verse added successfully" });
      setNewVerseReference("");
      setNewVerseText("");
      fetchData();
    }
    setLoadingAction(false);
  };

  const handleDeleteVerse = async (id: string) => {
    setLoadingAction(true);
    const { error } = await supabase
      .from('bible_verses')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Verse deleted" });
      fetchData();
    }
    setLoadingAction(false);
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="themes" className="gap-2">
              <Palette className="h-4 w-4" />
              Themes
            </TabsTrigger>
            <TabsTrigger value="verses" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Bible Verses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* Reset Password */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Reset User Password
                </CardTitle>
                <CardDescription>Send a password reset email to any user</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="User email address"
                    value={resetPasswordEmail}
                    onChange={(e) => setResetPasswordEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleResetPassword} disabled={loadingAction}>
                    Send Reset Email
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Create User */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create New User
                </CardTitle>
                <CardDescription>Create a new account manually</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      placeholder="Username"
                      value={newUserUsername}
                      onChange={(e) => setNewUserUsername(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="Email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      placeholder="Password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={handleCreateUser} disabled={loadingAction}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </CardContent>
            </Card>

            {/* Admin Emails */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Admin Email Addresses
                </CardTitle>
                <CardDescription>Users with these emails will automatically become admins when they sign up</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Add admin email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleAddAdminEmail} disabled={loadingAction}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {adminEmails.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <span className="text-foreground">{admin.email}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAdminEmail(admin.id)}
                        disabled={loadingAction}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {adminEmails.length === 0 && (
                    <p className="text-muted-foreground text-sm">No admin emails configured</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* User List */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Registered Users ({profiles.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {profiles.map((profile) => (
                    <div key={profile.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <span className="text-foreground">{profile.username}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="themes" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>App Theme</CardTitle>
                <CardDescription>Choose a color scheme for the entire app. Changes apply to all users.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {themes.map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() => handleThemeChange(theme)}
                      disabled={loadingAction}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        currentTheme.name === theme.name
                          ? 'border-primary ring-2 ring-primary/50'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex gap-2 mb-3">
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: `hsl(${theme.primary})` }}
                        />
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: `hsl(${theme.background})` }}
                        />
                        <div
                          className="w-6 h-6 rounded-full border"
                          style={{ backgroundColor: `hsl(${theme.foreground})` }}
                        />
                      </div>
                      <p className="text-sm font-medium text-foreground">{theme.label}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verses" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add New Verse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Reference (e.g., John 3:16)</Label>
                  <Input
                    placeholder="Book Chapter:Verse"
                    value={newVerseReference}
                    onChange={(e) => setNewVerseReference(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Verse Text</Label>
                  <Textarea
                    placeholder="Enter the verse text..."
                    value={newVerseText}
                    onChange={(e) => setNewVerseText(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button onClick={handleAddVerse} disabled={loadingAction}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Verse
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Memory Verses ({verses.length})</CardTitle>
                <CardDescription>These verses rotate daily on the homepage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {verses.map((verse, index) => (
                    <div key={verse.id} className="p-4 bg-secondary/50 rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground bg-primary/20 px-2 py-1 rounded">
                            Day {index + 1}
                          </span>
                          <span className="font-semibold text-primary">{verse.reference}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteVerse(verse.id)}
                          disabled={loadingAction}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-foreground/80">{verse.text}</p>
                    </div>
                  ))}
                  {verses.length === 0 && (
                    <p className="text-muted-foreground text-sm">No verses added yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPage;
