import { HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

type ObjectClient = { send(command: ListObjectsV2Command | HeadObjectCommand): Promise<any> };
type Reference = { key: string; intentId: string; attemptId: string | null; expectedBytes: number; expectedMime: string };

const isSagaKey = (key: string) => /^quarantine\/[^/]+\/[^/]+$/.test(key) || /^workspaces\/[^/]+\/files\/[^/]+$/.test(key);

export async function scanUploadObjectInventory(client: ObjectClient, input: { bucket: string; now: Date; graceMs: number; references: Reference[] }) {
  for (const reference of input.references) if (!isSagaKey(reference.key)) throw new Error("INVALID_UPLOAD_OBJECT_KEY");
  const listed = new Map<string, Date>();
  let token: string | undefined;
  let pages = 0;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: input.bucket, ContinuationToken: token }));
    pages += 1;
    for (const object of page.Contents ?? []) if (object.Key && isSagaKey(object.Key)) listed.set(object.Key, object.LastModified ?? input.now);
    if (page.IsTruncated && !page.NextContinuationToken) throw new Error("INCOMPLETE_OBJECT_PAGINATION");
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);

  const references = new Map(input.references.map((reference) => [reference.key, reference]));
  const missing = input.references.filter(({ key }) => !listed.has(key)).map(({ key }) => key).sort();
  const orphans = Array.from(listed).filter(([key, modified]) => !references.has(key) && input.now.getTime() - modified.getTime() >= input.graceMs).map(([key]) => key).sort();
  const metadataMismatches: string[] = [];
  for (const reference of input.references) {
    if (!listed.has(reference.key)) continue;
    const head = await client.send(new HeadObjectCommand({ Bucket: input.bucket, Key: reference.key }));
    if (head.ContentLength !== reference.expectedBytes || head.ContentType !== reference.expectedMime || head.Metadata?.intentid !== reference.intentId || (reference.attemptId && head.Metadata?.attemptid !== reference.attemptId)) metadataMismatches.push(reference.key);
  }
  return { pages, scanned: listed.size, missing, orphans, metadataMismatches: metadataMismatches.sort(), deletedObjects: 0 as const };
}

// Read-only by design: deletion needs a separate approved apply path with active-saga proof.
