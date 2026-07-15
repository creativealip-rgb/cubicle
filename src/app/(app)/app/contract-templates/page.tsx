import { redirect } from "next/navigation";

/** List page redundant with Template Center contract tab. Keep deep editor routes. */
export default function ContractTemplatesPage() {
  redirect("/app/templates?tab=contract");
}
