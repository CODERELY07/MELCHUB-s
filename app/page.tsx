"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";

import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface User {
  name: string;
  email: string;
  avatarUrl?: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    api
      .get("/profile")
      .then((res) => {
        if (isMounted) setUser(res.data);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api.post("/logout");
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem("token");
      router.push("/login");
    }
  };

  const initials = user?.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-sm shadow-lg">
        {loading ? (
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-52" />
          </CardContent>
        ) : !user ? (
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <CardTitle className="text-lg">You're not signed in</CardTitle>
            <CardDescription>
              We couldn't verify your session. Please log in again.
            </CardDescription>
            <Button className="mt-4" onClick={() => router.push("/login")}>
              Go to login
            </Button>
          </CardContent>
        ) : (
          <>
            <CardHeader className="flex flex-col items-center gap-3 text-center">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback className="text-lg">
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <CardTitle className="text-xl">
                  Welcome back, {user.name}
                </CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
            </CardHeader>

            <CardFooter>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging out...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </>
                )}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}