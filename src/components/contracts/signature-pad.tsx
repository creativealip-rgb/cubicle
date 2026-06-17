"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { signContract, declineContract } from "@/lib/actions/contracts";
import { Loader2, CheckCircle2, Trash2, X, Send } from "lucide-react";

export function SignaturePad({
  token,
  defaultName,
  defaultEmail,
}: {
  token: string;
  defaultName: string;
  defaultEmail: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<"signed" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setDrawing(true);
    const p = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = getPoint(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasSignature(true);
  }

  function endDraw() {
    setDrawing(false);
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  function getDataUrl(): string | null {
    if (!hasSignature) return null;
    return canvasRef.current?.toDataURL("image/png") || null;
  }

  function handleSign() {
    setError(null);
    if (!name.trim()) {
      setError("Please enter your full name");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email");
      return;
    }
    const dataUrl = getDataUrl();
    if (!dataUrl) {
      setError("Please draw your signature in the box above");
      return;
    }
    startTransition(async () => {
      try {
        await signContract({ token, signedName: name, signedEmail: email, signatureDataUrl: dataUrl });
        setDone("signed");
      } catch (err: any) {
        setError(err?.message || "Failed to sign");
      }
    });
  }

  function handleDecline() {
    startTransition(async () => {
      try {
        await declineContract({ token, reason: declineReason || undefined });
        setDone("declined");
      } catch (err: any) {
        setError(err?.message || "Failed to decline");
      }
    });
  }

  if (done === "signed") {
    return (
      <div className="text-center py-6 space-y-3">
        <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
        <h3 className="text-lg font-semibold">Contract signed</h3>
        <p className="text-sm text-slate-500">
          Thank you. A copy of this signed contract has been sent to {email}.
        </p>
      </div>
    );
  }

  if (done === "declined") {
    return (
      <div className="text-center py-6 space-y-3">
        <X className="h-12 w-12 mx-auto text-slate-400" />
        <h3 className="text-lg font-semibold">Contract declined</h3>
        <p className="text-sm text-slate-500">
          The workspace owner has been notified.
        </p>
      </div>
    );
  }

  if (showDecline) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">Decline this contract</p>
        <p className="text-xs text-slate-500">Optional: let the sender know why.</p>
        <Textarea
          rows={3}
          placeholder="Reason for declining (optional)"
          value={declineReason}
          onChange={(e) => setDeclineReason(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <Button variant="destructive" onClick={handleDecline} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
            Confirm decline
          </Button>
          <Button variant="ghost" onClick={() => setShowDecline(false)} disabled={pending}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium">Sign here</label>
          {hasSignature && (
            <Button type="button" variant="ghost" size="sm" onClick={clearSignature}>
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
        <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white">
          <canvas
            ref={canvasRef}
            className="w-full h-32 touch-none cursor-crosshair"
            onPointerDown={startDraw}
            onPointerMove={draw}
            onPointerUp={endDraw}
            onPointerLeave={endDraw}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">Draw with your mouse, trackpad, or finger.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium block mb-1">Full name</label>
          <Input
            placeholder="Your full legal name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Email</label>
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2">
        <Button variant="ghost" onClick={() => setShowDecline(true)} disabled={pending}>
          Decline
        </Button>
        <Button onClick={handleSign} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
          Sign contract
        </Button>
      </div>
    </div>
  );
}
