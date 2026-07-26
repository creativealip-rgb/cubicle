import { notFound } from "next/navigation";
import ClientPortalPage from "../../[token]/page";
import { getClientPortalAccess } from "@/lib/actions/portal";

export default async function ClientPortalSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const tokenParam = query.token;
  const rawToken = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  if (!rawToken) notFound();

  try {
    const client = await getClientPortalAccess(rawToken);
    if (!client.portalSlugEnabled || client.portalSlug !== slug) notFound();
  } catch {
    notFound();
  }

  const { token: _token, ...forwardedSearchParams } = query;
  return ClientPortalPage({
    params: Promise.resolve({ token: rawToken }),
    searchParams: Promise.resolve(forwardedSearchParams),
  });
}
