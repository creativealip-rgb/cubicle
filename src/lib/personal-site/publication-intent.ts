/**
 * Publication semantics for the personal-site autosave path.
 *
 * `save`/omitted/unknown intent === plain autosave === PRESERVE the stored row's
 * published flag. Only the two explicit toggles change publication. This closes
 * the old fall-through-to-false conflation where any unrecognised intent (or an
 * omitted one) silently unpublished a live site.
 */
export type PublicationIntent = "save" | "publish" | "unpublish";

export function resolvePublicationState(
  intent: string | null | undefined,
  currentPublished: boolean,
): boolean {
  if (intent === "publish") return true;
  if (intent === "unpublish") return false;
  // Omitted, "save", or any unrecognised/legacy value: never touch publication.
  return currentPublished;
}

/**
 * Explicit toggles travel with the site object as a non-enumerable marker, so
 * they never enter the stored document (JSON.stringify and object spread both
 * skip non-enumerables) and plain autosave stays intent-free.
 */
export function withPublicationIntent<T extends object>(site: T, intent: PublicationIntent): T {
  Object.defineProperty(site, "publicationIntent", { value: intent, enumerable: false, configurable: true });
  return site;
}

export function readPublicationIntent(site: object): PublicationIntent | null {
  const intent = (site as { publicationIntent?: PublicationIntent }).publicationIntent;
  return intent ?? null;
}
