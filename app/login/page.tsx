"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";

import api from "@/lib/axios";
import { clearCache } from "@/lib/offline-cache";
import borrowerApi from "@/lib/borrower-axios";
import { useAuth } from "@/lib/auth-context";
import { useBorrowerAuth } from "@/lib/borrower-auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useI18n } from "@/lib/i18n";
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

/**
 * One login for both staff and borrowers — there used to be two separate
 * pages (an obscure staff-only URL plus /portal/login), but that meant an
 * admin needed to know a second, hidden link just to sign in. This tries
 * the borrower login first (the far more common account type day to day),
 * and only falls through to the staff login on a genuine "wrong
 * credentials" response — 401 or 422, since BorrowerAuthController::login()
 * rejects bad credentials with a validation exception (422) while
 * AuthController::login() uses a plain 401; both mean the same thing here.
 * Any other error (rate limiting, network, a malformed request) is shown
 * as-is rather than masked by a second attempt. See docs/rbac.md for why
 * this is safe: the actual admin/borrower permission boundary was
 * always enforced server-side per request, never by which URL was used to
 * log in.
 */
export default function LoginPage() {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user, loading: staffLoading, refresh: refreshStaff } = useAuth();
  const { borrower, loading: borrowerLoading, refresh: refreshBorrower } = useBorrowerAuth();

  // Already signed in as either — go straight to the right dashboard
  // instead of showing the form again.
  useEffect(() => {
    if (staffLoading || borrowerLoading) return;
    if (user) {
      router.replace("/admin/dashboard");
    } else if (borrower) {
      router.replace("/portal");
    }
  }, [staffLoading, borrowerLoading, user, borrower, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await borrowerApi.post("/borrower/login", { username, password, remember });
      clearCache(); // never carry a previous account's saved data into this one
      localStorage.setItem("borrower_token", response.data.token);
      await refreshBorrower();
      router.push("/portal");
      return;
    } catch (err: unknown) {
      const status = isAxiosError(err) ? err.response?.status : undefined;
      // BorrowerAuthController::login() rejects a wrong username/password
      // with a 422 (it throws a ValidationException), not a 401 like the
      // staff login below — both mean "not a matching account here," so
      // both fall through to try staff next. Anything else (rate limited,
      // network, a genuinely malformed request) is shown as-is instead of
      // being masked behind a second attempt.
      if (status !== 401 && status !== 422) {
        setError((isAxiosError(err) && err.response?.data?.message) || t("login.error"));
        setIsLoading(false);
        return;
      }
    }

    try {
      const response = await api.post("/login", { username, password, remember });
      localStorage.setItem("token", response.data.token);
      await refreshStaff();
      router.push("/admin/dashboard");
    } catch (err: unknown) {
      const status = isAxiosError(err) ? err.response?.status : undefined;
      setError(
        status && status !== 401
          ? (isAxiosError(err) && err.response?.data?.message) || t("login.error")
          : t("login.error")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/20 px-4 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))]">
      <Card className="relative w-full max-w-sm shadow-xl">
        <LanguageToggle compact className="absolute top-3 left-3 w-24" />
        <ThemeToggle iconOnly className="absolute top-3 right-3" />
        <CardHeader className="space-y-3 pt-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[color-mix(in_oklch,var(--primary),var(--chart-5)_30%)] font-heading text-lg font-bold text-primary-foreground shadow-md">
            M
          </div>
          <CardTitle as="h1" className="text-3xl font-bold tracking-tight">{t("login.title")}</CardTitle>
          <CardDescription>{t("login.subtitle")}</CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">{t("login.username")}</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("login.password")}</Label>
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
                  aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
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
              {t("login.remember")}
            </label>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("login.submitting")}
                </>
              ) : (
                t("login.submit")
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">{t("login.noAccount")}</p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
