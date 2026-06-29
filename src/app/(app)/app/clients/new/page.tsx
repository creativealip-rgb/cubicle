import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-1">
        <Link href="/app/clients">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Klien
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Klien Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form action="/api/clients/create" method="post" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama *</Label>
              <Input id="name" name="name" required placeholder="Nama kontak klien" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Perusahaan</Label>
              <Input id="companyName" name="companyName" placeholder="Perusahaan name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="client@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telepon</Label>
                <Input id="phone" name="phone" placeholder="+62..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <Input id="address" name="address" placeholder="Alamat lengkap" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tag (pisahkan dengan koma)</Label>
              <Input id="tags" name="tags" placeholder="branding, web, social" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="internalNotes">Catatan Internal</Label>
              <Input id="internalNotes" name="internalNotes" placeholder="Catatan privat..." />
            </div>
            <div className="grid grid-cols-[1fr_auto] items-end gap-3 rounded-lg border p-3">
              <div className="space-y-2">
                <Label htmlFor="portalSlug">Client portal slug</Label>
                <Input id="portalSlug" name="portalSlug" pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="alip" />
                <p className="text-xs text-muted-foreground">Short link: /client-portal/slug</p>
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input type="checkbox" name="portalSlugEnabled" defaultChecked />
                Aktif
              </label>
            </div>
            <Button type="submit" className="w-full">Buat Klien</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
