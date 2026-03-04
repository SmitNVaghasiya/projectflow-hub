import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { apiChangePassword } from "@/lib/api";

export default function Settings() {
  const { user, signOut, updateProfile, deleteAccount } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || user?.display_name || "");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});

  const handleSaveName = async () => {
    setSaving(true);
    const { error } = await updateProfile({ display_name: displayName });
    setSaving(false);
    if (error) {
      toast.error("Failed to update name: " + error);
    } else {
      toast.success("Display name updated!");
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const { error } = await deleteAccount();
    if (error) {
      toast.error("Failed to delete account: " + error);
      setDeleting(false);
    } else {
      await signOut();
      toast.info("Account deleted and signed out.");
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handleChangePassword = async () => {
    const errs: { current?: string; new?: string; confirm?: string } = {};
    if (!currentPassword) errs.current = "Current password is required.";
    if (!newPassword || newPassword.length < 8) errs.new = "New password must be at least 8 characters.";
    else if (newPassword === currentPassword) errs.new = "New password must be different from your current password.";
    if (!confirmPassword) errs.confirm = "Please confirm your new password.";
    else if (newPassword !== confirmPassword) errs.confirm = "Passwords do not match.";

    if (Object.keys(errs).length > 0) {
      setPasswordErrors(errs);
      return;
    }
    setPasswordErrors({});
    setChangingPassword(true);
    const res = await apiChangePassword(currentPassword, newPassword);
    setChangingPassword(false);
    if (res.error) {
      if (res.error.toLowerCase().includes("current") || res.error.toLowerCase().includes("incorrect")) {
        setPasswordErrors({ current: res.error });
      } else {
        toast.error(res.error);
      }
    } else {
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors({});
    }
  };

  return (
    <div className="space-y-6 w-full md:max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences</p>
      </div>

      {/* Profile */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="opacity-60" />
          </div>
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <Button onClick={handleSaveName} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Dark Mode</Label>
              <p className="text-sm text-muted-foreground">Toggle dark and light theme</p>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Update your password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className={passwordErrors.current ? "text-destructive" : ""}>Current Password</Label>
            <div className="relative">
              <Input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setPasswordErrors(p => ({ ...p, current: undefined })); }}
                placeholder="••••••••"
                className={passwordErrors.current ? "pr-10 border-destructive focus-visible:ring-destructive" : "pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordErrors.current && <p className="text-xs text-destructive">{passwordErrors.current}</p>}
          </div>
          <div className="space-y-2">
            <Label className={passwordErrors.new ? "text-destructive" : ""}>New Password</Label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordErrors(p => ({ ...p, new: undefined })); }}
                placeholder="••••••••"
                className={passwordErrors.new ? "pr-10 border-destructive focus-visible:ring-destructive" : "pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordErrors.new
              ? <p className="text-xs text-destructive">{passwordErrors.new}</p>
              : <p className="text-xs text-muted-foreground">Must be at least 8 characters and different from current.</p>
            }
          </div>
          <div className="space-y-2">
            <Label className={passwordErrors.confirm ? "text-destructive" : ""}>Confirm New Password</Label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordErrors(p => ({ ...p, confirm: undefined })); }}
                placeholder="••••••••"
                className={passwordErrors.confirm ? "pr-10 border-destructive focus-visible:ring-destructive" : "pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordErrors.confirm && <p className="text-xs text-destructive">{passwordErrors.confirm}</p>}
          </div>
          <div className="flex items-center justify-between">
            <Button onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update Password
            </Button>
            <Link to="/forgot-password" className="text-sm text-primary hover:underline font-medium">
              Forgot your password?
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-card border-border border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions — proceed with caution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Deleting your account will remove all your projects and data. This cannot be undone.
          </p>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={(val) => { if (!val) setConfirmEmail(""); setDeleteOpen(val); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <p>This will permanently delete all your projects and sign you out. This cannot be undone.</p>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Type your email <strong>{user?.email}</strong> to confirm:
                  </label>
                  <Input
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder={user?.email || "your email"}
                    type="email"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting || confirmEmail !== user?.email}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Yes, Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
