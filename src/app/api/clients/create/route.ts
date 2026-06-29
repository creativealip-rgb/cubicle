import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/actions/clients";

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  await createClient({
    name: String(formData.get("name") ?? ""),
    companyName: String(formData.get("companyName") ?? "") || undefined,
    email: String(formData.get("email") ?? "") || undefined,
    phone: String(formData.get("phone") ?? "") || undefined,
    website: String(formData.get("website") ?? "") || undefined,
    address: String(formData.get("address") ?? "") || undefined,
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    internalNotes: String(formData.get("internalNotes") ?? "") || undefined,
    portalSlug: String(formData.get("portalSlug") ?? "") || undefined,
    portalSlugEnabled: formData.get("portalSlugEnabled") === "on",
  });

  return NextResponse.redirect(new URL("/app/clients", req.url), 303);
}
