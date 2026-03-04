import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, FolderKanban, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [failedAttempts, setFailedAttempts] = useState(0);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Show "Forgot password?" only after 2 failed auth attempts
  const showForgotPassword = failedAttempts >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Client-side empty field validation
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = "Email is required";
    if (!password) newErrors.password = "Password is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      // Mark BOTH fields on auth failure — avoids hinting which one is wrong (security best practice)
      const authError = "Invalid email or password.";
      setErrors({ email: authError, password: authError });
      setFailedAttempts((prev) => prev + 1);
      toast({ title: "Login failed", description: authError, variant: "destructive" });
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">

        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-1">
            <FolderKanban className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">ProjectHub</h1>
          <p className="text-muted-foreground text-sm">Manage your AI/ML projects with ease</p>
        </div>

        {/* Card */}
        <Card className="border-border bg-card shadow-xl rounded-2xl overflow-hidden">
          <form onSubmit={handleSubmit}>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Welcome back</CardTitle>
              <CardDescription>Sign in to your account to continue</CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className={errors.email ? "text-destructive" : ""}>
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  autoComplete="email"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className={errors.password ? "text-destructive" : ""}>
                    Password
                  </Label>

                  {/* Revealed only after 2 failed attempts */}
                  {showForgotPassword && (
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary hover:underline font-medium animate-in fade-in slide-in-from-right-2 duration-300"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>

                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    autoComplete="current-password"
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    className={`pr-10 ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}

                {/* Soft hint after 1st failure, before forgot password appears */}
                {/* {failedAttempts === 1 && (
                  <p className="text-xs text-muted-foreground animate-in fade-in duration-300">
                    Still can't get in? One more attempt will show a password reset option.
                  </p>
                )} */}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button
                type="submit"
                className="w-full gradient-primary h-10 font-medium"
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Sign In
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}