import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiSendOtp, apiVerifyOtp } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Loader2, MailCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";

export default function Signup() {
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (location.state?.emailToVerify) {
      setEmail(location.state.emailToVerify);
      setStep("otp");
      // Optionally trigger OTP send automatically
      apiSendOtp(location.state.emailToVerify).then(res => {
        if (!res.error) toast({ title: "Code sent", description: "A new verification code was sent to your email." });
      });
      // Clear state so it doesn't re-trigger on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const isExistingUnverified = !!location.state?.emailToVerify;

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) return;
    setLoading(true);

    // Only send the OTP. We do NOT hit signUp backend until they enter the code.
    const otpRes = await apiSendOtp(email);
    setLoading(false);

    if (otpRes.error) {
      toast({ title: "Welcome back?", description: otpRes.error, variant: "destructive" });
    } else {
      toast({ title: "Verification sent", description: "Check your email for the 6-digit code." });
      setStep("otp");
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) return;
    setLoading(true);

    let error;
    if (isExistingUnverified) {
      // Existing unverified user completing verification
      const res = await apiVerifyOtp(email, otpCode);
      error = res.error;
    } else {
      // Brand new user confirming OTP and creating account at the same time
      const res = await signUp(email, password, displayName, otpCode);
      error = res.error;
    }

    setLoading(false);

    if (error) {
      toast({ title: "Verification failed", description: error, variant: "destructive" });
    } else {
      toast({ title: "Welcome! 🎉", description: "Your email is verified and account is ready." });
      // Tell AuthContext to load the newly fully-authenticated user
      await refreshUser();
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FolderKanban className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">ProjectHub</h1>
          <p className="text-muted-foreground mt-1">
            {step === "form" ? "Create your account to get started" : "Verify your email address"}
          </p>
        </div>

        <Card className="border-border bg-card shadow-xl">
          {step === "form" ? (
            <form onSubmit={handleSignupSubmit}>
              <CardHeader>
                <CardTitle className="text-xl">Create account</CardTitle>
                <CardDescription>Enter your details below</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create Account
                </Button>
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Sign In
                  </Link>
                </p>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit}>
              <CardHeader className="text-center">
                <div className="mx-auto bg-primary/10 p-3 rounded-full mb-4 w-fit">
                  <MailCheck className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Check your email</CardTitle>
                <CardDescription>
                  We sent a 6-digit code to <strong>{email}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center space-y-6">
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
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full gradient-primary" disabled={loading || otpCode.length !== 6}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Verify Email
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
