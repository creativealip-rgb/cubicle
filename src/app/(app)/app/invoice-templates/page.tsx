import { redirect } from "next/navigation";

export default function InvoiceTemplatesPage() {
  redirect("/app/templates?tab=invoice");
}
