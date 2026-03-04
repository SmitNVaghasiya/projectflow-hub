import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiSendOtp, apiResetPassword } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Loader2, MailCheck, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";

export default function ForgotPassword() {
    const [step, setStep] = useState<"email" | "otp" | "reset">("email");
    const [email, setEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

    const navigate = useNavigate();
    const { toast } = useToast();

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        // Strict email regex: requires user@domain.tld where tld is 2+ chars
        const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

        if (!email) {
            setErrors({ email: "Email is required" });
            return;
        }
        if (!emailRegex.test(email)) {
            setErrors({ email: "Enter a valid email address (e.g. you@example.com)" });
            return;
        }

        setLoading(true);
        const res = await apiSendOtp(email, "reset");
        setLoading(false);

        if (res.error) {
            if (res.error.toLowerCase().includes("account") || res.error.toLowerCase().includes("email")) {
                setErrors({ email: res.error });
            } else {
                setErrors({ general: res.error });
            }
            toast({ title: "Error", description: res.error, variant: "destructive" });
        } else {
            toast({ title: "Code sent", description: "Check your email for the 6-digit code." });
            setStep("otp");
        }
    };

    const handleOtpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (otpCode.length !== 6) return;
        setStep("reset");
    };

    const handleResetSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        if (!newPassword || newPassword.length < 8) {
            setErrors({ password: "Password must be at least 8 characters" });
            return;
        }

        setLoading(true);
        const res = await apiResetPassword(email, otpCode, newPassword);
        setLoading(false);

        if (res.error) {
            toast({ title: "Reset failed", description: res.error, variant: "destructive" });
            setErrors({ general: res.error });
            // Could be an expired OTP, so let's allow them to change the OTP or re-request
            if (res.error.toLowerCase().includes("otp")) {
                setStep("otp");
            }
        } else {
            toast({ title: "Password Reset!", description: "You can now log in with your new password." });
            navigate("/login");
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
                    <p className="text-muted-foreground mt-1">Reset your password</p>
                </div>

                <Card className="border-border bg-card shadow-xl">
                    {step === "email" && (
                        <form onSubmit={handleEmailSubmit}>
                            <CardHeader>
                                <CardTitle className="text-xl">Forgot Password</CardTitle>
                                <CardDescription>Enter your email address and we'll send you a recovery code.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {errors.general && (
                                    <div className="text-sm font-medium text-destructive bg-destructive/10 p-2 rounded text-center">
                                        {errors.general}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="email" className={errors.email ? "text-destructive" : ""}>Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setErrors({ ...errors, email: undefined, general: undefined }); }}
                                        className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                                    />
                                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-4">
                                <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Send Code
                                </Button>
                                <p className="text-sm text-muted-foreground">
                                    Remember your password?{" "}
                                    <Link to="/login" className="text-primary hover:underline font-medium">
                                        Sign In
                                    </Link>
                                </p>
                            </CardFooter>
                        </form>
                    )}

                    {step === "otp" && (
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
                                    Continue
                                </Button>
                                <div className="text-center w-full">
                                    <button type="button" onClick={() => setStep("email")} className="text-sm text-muted-foreground hover:text-foreground">
                                        Change Email
                                    </button>
                                </div>
                            </CardFooter>
                        </form>
                    )}

                    {step === "reset" && (
                        <form onSubmit={handleResetSubmit}>
                            <CardHeader>
                                <CardTitle className="text-xl">Create New Password</CardTitle>
                                <CardDescription>Enter your new password below. Must be at least 8 characters.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {errors.general && (
                                    <div className="text-sm font-medium text-destructive bg-destructive/10 p-2 rounded text-center">
                                        {errors.general}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword" className={errors.password ? "text-destructive" : ""}>New Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="newPassword"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={newPassword}
                                            onChange={(e) => { setNewPassword(e.target.value); setErrors({ ...errors, password: undefined, general: undefined }); }}
                                            className={errors.password ? "border-destructive focus-visible:ring-destructive pr-10" : "pr-10"}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-4">
                                <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Reset Password
                                </Button>
                            </CardFooter>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    );
}
