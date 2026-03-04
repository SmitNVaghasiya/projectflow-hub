import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiSendOtp, apiVerifyOtp } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, FolderKanban, Loader2, MailCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";

export default function Signup() {
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string; general?: string }>({});
  const { signUp, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (location.state?.emailToVerify) {
      setEmail(location.state.emailToVerify);
      setStep("otp");
      apiSendOtp(location.state.emailToVerify).then(res => {
        if (!res.error) toast({ title: "Code sent", description: "A new verification code was sent to your email." });
      });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const isExistingUnverified = !!location.state?.emailToVerify;

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    const res = await apiSendOtp(email);
    if (!res.error) {
      toast({ title: "Code resent", description: "A new verification code was sent to your email." });
    } else {
      toast({ title: "Failed to resend", description: res.error, variant: "destructive" });
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    let hasError = false;
    const newErrors: { email?: string; password?: string; name?: string } = {};

    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

    if (!displayName) { newErrors.name = "Name is required"; hasError = true; }
    if (!email) { newErrors.email = "Email is required"; hasError = true; }
    else if (!emailRegex.test(email)) { newErrors.email = "Enter a valid email address (e.g. you@example.com)"; hasError = true; }
    if (!password) { newErrors.password = "Password is required"; hasError = true; }
    else if (password.length < 8) { newErrors.password = "Password must be at least 8 characters"; hasError = true; }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    const otpRes = await apiSendOtp(email, "signup");
    setLoading(false);

    if (otpRes.error) {
      if (otpRes.error.toLowerCase().includes("email") || otpRes.error.toLowerCase().includes("account")) {
        setErrors({ email: otpRes.error });
      } else {
        setErrors({ general: otpRes.error });
      }
      toast({ title: "Something went wrong", description: otpRes.error, variant: "destructive" });
    } else {
      toast({ title: "Verification sent", description: "Check your email for the 6-digit code." });
      setResendCooldown(60);
      setStep("otp");
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) return;
    setLoading(true);

    let error;
    if (isExistingUnverified) {
      const res = await apiVerifyOtp(email, otpCode);
      error = res.error;
    } else {
      const res = await signUp(email, password, displayName, otpCode);
      error = res.error;
    }

    setLoading(false);

    if (error) {
      toast({ title: "Verification failed", description: error, variant: "destructive" });
    } else {
      toast({ title: "Welcome! 🎉", description: "Your email is verified and account is ready." });
      await refreshUser();
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
          <p className="text-muted-foreground text-sm">
            {step === "form" ? "Create your account to get started" : "Check your inbox"}
          </p>
        </div>

        <Card className="border-border bg-card shadow-xl rounded-2xl overflow-hidden">

          {/* ── STEP 1: Registration Form ── */}
          {step === "form" ? (
            <form onSubmit={handleSignupSubmit}>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Create account</CardTitle>
                <CardDescription>Enter your details to get started</CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                {errors.general && (
                  <div className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg text-center">
                    {errors.general}
                  </div>
                )}

                {/* Display Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="name" className={errors.name ? "text-destructive" : ""}>
                    Display Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={displayName}
                    autoComplete="name"
                    onChange={(e) => { setDisplayName(e.target.value); setErrors({ ...errors, name: undefined, general: undefined }); }}
                    className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

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
                    onChange={(e) => { setEmail(e.target.value); setErrors({ ...errors, email: undefined, general: undefined }); }}
                    className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className={errors.password ? "text-destructive" : ""}>
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={password}
                      autoComplete="new-password"
                      onChange={(e) => { setPassword(e.target.value); setErrors({ ...errors, password: undefined, general: undefined }); }}
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
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4 pt-2">
                <Button
                  type="submit"
                  className="w-full gradient-primary h-10 font-medium"
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create Account
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </CardFooter>
            </form>

          ) : (

            /* ── STEP 2: OTP Verification ── */
            <form onSubmit={handleOtpSubmit}>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto bg-primary/10 p-3 rounded-full mb-3 w-fit">
                  <MailCheck className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Verify your email</CardTitle>
                <CardDescription className="mt-1">
                  We sent a 6-digit code to{" "}
                  <span className="font-semibold text-foreground">{email}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col items-center justify-center space-y-6 pt-4">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={(value) => setOtpCode(value)}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>

                {/* Resend code */}
                <p className="text-sm text-muted-foreground">
                  Didn't receive it?{" "}
                  {resendCooldown > 0 ? (
                    <span className="text-muted-foreground/60">Resend in {resendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="text-primary hover:underline font-medium"
                    >
                      Resend code
                    </button>
                  )}
                </p>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 pt-0">
                <Button
                  type="submit"
                  className="w-full gradient-primary h-10 font-medium"
                  disabled={loading || otpCode.length !== 6}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Verify Email
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep("form"); setOtpCode(""); }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to sign up
                </button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}