"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { isAxiosError } from "axios";

import borrowerApi from "@/lib/borrower-axios";
import { useBorrowerAuth } from "@/lib/borrower-auth-context";
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

function extractErrorMessage(err: unknown, fallback: string): string {
  if (!isAxiosError(err)) return fallback;
  const data = err.response?.data;
  const errors = data?.errors as Record<string, string[]> | undefined;
  return errors ? Object.values(errors).flat().join(" ") : data?.message || fallback;
}

export default function PortalProfilePage() {
  const { loan, refresh } = useBorrowerAuth();

  const [profileForm, setProfileForm] = useState({
    name: loan?.name ?? "",
    username: loan?.username ?? "",
    email: loan?.email ?? "",
    phone: loan?.phone ?? "",
    location: loan?.location ?? "",
  });
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  if (!loan) return null;

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setSavingProfile(true);

    try {
      await borrowerApi.put("/borrower/profile", profileForm);
      await refresh();
      setProfileSuccess("Profile updated.");
    } catch (err: unknown) {
      setProfileError(extractErrorMessage(err, "Couldn't update your profile."));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    setSavingPassword(true);

    try {
      await borrowerApi.post("/borrower/change-password", passwordForm);
      setPasswordForm({ current_password: "", password: "", password_confirmation: "" });
      setPasswordSuccess("Password changed.");
    } catch (err: unknown) {
      setPasswordError(extractErrorMessage(err, "Couldn't change your password."));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Update your contact details or change your password.
        </p>
      </div>

      <Card>
        <form onSubmit={handleProfileSubmit}>
          <CardHeader>
            <CardTitle className="text-base">Your details</CardTitle>
            <CardDescription>Loan {loan.loan_number}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileError && (
              <Alert variant="destructive">
                <AlertDescription>{profileError}</AlertDescription>
              </Alert>
            )}
            {profileSuccess && (
              <Alert>
                <AlertDescription>{profileSuccess}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                required
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                required
                value={profileForm.username}
                onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">
                Email <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={profileForm.location}
                onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <form onSubmit={handlePasswordSubmit}>
          <CardHeader>
            <CardTitle className="text-base">Change password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {passwordError && (
              <Alert variant="destructive">
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}
            {passwordSuccess && (
              <Alert>
                <AlertDescription>{passwordSuccess}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="current_password">Current password</Label>
              <Input
                id="current_password"
                type="password"
                required
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, current_password: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={passwordForm.password}
                onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password_confirmation">Confirm new password</Label>
              <Input
                id="password_confirmation"
                type="password"
                required
                minLength={6}
                value={passwordForm.password_confirmation}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })
                }
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? <Loader2 className="size-4 animate-spin" /> : "Change password"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
