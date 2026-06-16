"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
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
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await authClient.requestPasswordReset({
        email,
      });

      if (result.error) {
        setError(result.error.message ?? "Could not process request");
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a password reset link to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Link
            href="/login"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <span className="text-lg font-bold text-primary-foreground">C</span>
        </div>
        <CardTitle className="text-2xl">Reset password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a reset link
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send reset link
          </Button>
        </CardContent>
      </form>
      <CardFooter className="flex justify-center">
        <Link
          href="/login"
          className="flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
