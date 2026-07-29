import { redirect } from "next/navigation";

export default function LegacyCatalogHiddenPage() {
  redirect("/app/time");
}
