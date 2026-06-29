"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Check,
  Building2,
  Users,
  Rocket,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { finishOnboarding } from "@/lib/actions/onboarding";

const steps = [
  { id: 1, label: "Workspace", icon: Building2 },
  { id: 2, label: "Team", icon: Users },
  { id: 3, label: "Ready", icon: Rocket },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Workspace
  const [workspaceName, setWorkspaceName] = useState("");

  // Step 2: Team invites
  const [inviteEmail, setInviteEmail] = useState("");
  const [invites, setInvites] = useState<string[]>([]);

  function addInvite() {
    const email = inviteEmail.trim();
    if (email && email.includes("@") && !invites.includes(email)) {
      setInvites([...invites, email]);
      setInviteEmail("");
    }
  }

  function removeInvite(email: string) {
    setInvites(invites.filter((i) => i !== email));
  }

  async function handleFinish() {
    if (!workspaceName.trim()) {
      setError("Workspace name is required.");
      setStep(1);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await finishOnboarding({ workspaceName });
      router.push("/app/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to finish onboarding.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] w-full items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-2">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isDone = s.id < step;
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isDone
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Icon className="h-3 w-3" />
                    )}
                    {s.label}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="h-px w-4 bg-border" />
                  )}
                </div>
              );
            })}
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Step 1: Workspace name */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <Building2 className="mx-auto h-12 w-12 text-primary" />
                <h3 className="mt-2 text-lg font-semibold">
                  Create your workspace
                </h3>
                <p className="text-sm text-muted-foreground">
                  This is where you&apos;ll manage clients, projects, and invoices.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspace">Workspace name</Label>
                <Input
                  id="workspace"
                  placeholder="My Agency"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 2: Invite team */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <Users className="mx-auto h-12 w-12 text-primary" />
                <h3 className="mt-2 text-lg font-semibold">
                  Invite your team
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add teammates to collaborate. You can always do this later.
                </p>
              </div>

              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addInvite();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addInvite}
                  disabled={!inviteEmail.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {invites.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {invites.length} invite{invites.length > 1 ? "s" : ""}
                  </p>
                  {invites.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                    >
                      <span className="text-sm">{email}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeInvite(email)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Ready */}
          {step === 3 && (
            <div className="space-y-4 text-center">
              <Rocket className="mx-auto h-16 w-16 text-primary" />
              <h3 className="text-xl font-semibold">You&apos;re all set!</h3>
              <p className="text-sm text-muted-foreground">
                Your workspace <strong>{workspaceName || "My Workspace"}</strong>{" "}
                is ready. Start managing your business.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant="secondary">
                  <Check className="mr-1 h-3 w-3" />
                  Workspace created
                </Badge>
                {invites.length > 0 && (
                  <Badge variant="secondary">
                    <Check className="mr-1 h-3 w-3" />
                    {invites.length} invite{invites.length > 1 ? "s" : ""} prepared
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          {step > 1 ? (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 2 ? false : !workspaceName.trim()}
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Go to Dashboard
            </Button>
          )}
        </CardFooter>

        {/* Skip team step */}
        {step === 2 && (
          <div className="px-6 pb-4 text-center">
            <Button
              variant="link"
              size="sm"
              onClick={() => setStep(3)}
              className="text-muted-foreground"
            >
              Skip for now
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
