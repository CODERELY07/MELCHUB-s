"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";

import borrowerApi from "@/lib/borrower-axios";
import { useBorrowerAuth } from "@/lib/borrower-auth-context";
import { PREFERRED_LOGIN_KEY } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PortalLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { loan, loading, refresh } = useBorrowerAuth();

  // Already signed in — go straight to the dashboard instead of showing the
  // form again.
  useEffect(() => {
    if (!loading && loan) {
      router.replace("/portal");
    }
  }, [loading, loan, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await borrowerApi.post("/borrower/login", {
        username,
        password,
        remember,
      });
      localStorage.setItem("borrower_token", response.data.token);
      localStorage.setItem(PREFERRED_LOGIN_KEY, "borrower");
      await refresh();
      router.push("/portal");
    } catch (err: unknown) {
      setError(
        (isAxiosError(err) && err.response?.data?.message) ||
          "We couldn't log you in. Check your details and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/20 px-4 py-12">
      <ThemeToggle iconOnly className="absolute top-4 right-4" />
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[color-mix(in_oklch,var(--primary),var(--chart-5)_30%)] font-heading text-lg font-bold text-primary-foreground shadow-md">
            M
          </div>
          <CardTitle as="h1" className="text-3xl font-bold tracking-tight">My Loan</CardTitle>
          <CardDescription>
            Sign in with the username and password your loan officer gave you
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me for 1 year
            </label>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Log in"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
