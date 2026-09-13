import { CopyObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { validateUploadObjectStream, type UploadObjectExpectation } from "./upload-object-validation";

type ObjectClient = { send(command: HeadObjectCommand | GetObjectCommand | CopyObjectCommand): Promise<any> };

type PromotionInput = UploadObjectExpectation & {
  bucket: string;
  intentId: string;
  attemptId: string;
  quarantineKey: string;
  finalKey: string;
};

const cleanEtag = (value?: string) => value?.replaceAll('"', "") ?? "";
const copySource = (bucket: string, key: string) => `${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;

export async function promoteValidatedUploadObject(client: ObjectClient, input: PromotionInput) {
  const head = await client.send(new HeadObjectCommand({ Bucket: input.bucket, Key: input.quarantineKey }));
  if (head.ContentLength !== input.expectedBytes || head.ContentType !== input.expectedMime) throw new Error("SOURCE_OBJECT_METADATA_MISMATCH");

  const source = await client.send(new GetObjectCommand({ Bucket: input.bucket, Key: input.quarantineKey, VersionId: head.VersionId }));
  if (!source.Body) throw new Error("SOURCE_OBJECT_EMPTY");
  if (cleanEtag(source.ETag) !== cleanEtag(head.ETag) || (head.VersionId && source.VersionId !== head.VersionId)) throw new Error("SOURCE_OBJECT_CHANGED");
  const validated = await validateUploadObjectStream(source.Body as AsyncIterable<Uint8Array>, input);

  const copied = await client.send(new CopyObjectCommand({
    Bucket: input.bucket,
    Key: input.finalKey,
    CopySource: copySource(input.bucket, input.quarantineKey),
    CopySourceIfMatch: head.ETag,
    MetadataDirective: "REPLACE",
    ContentType: input.expectedMime,
    Metadata: { intentid: input.intentId, attemptid: input.attemptId, sha256: validated.sha256 },
  }));
  const finalObject = await client.send(new HeadObjectCommand({ Bucket: input.bucket, Key: input.finalKey }));
  if (finalObject.ContentLength !== input.expectedBytes || finalObject.ContentType !== input.expectedMime || finalObject.Metadata?.intentid !== input.intentId || finalObject.Metadata?.attemptid !== input.attemptId || finalObject.Metadata?.sha256 !== validated.sha256 || cleanEtag(finalObject.ETag) !== cleanEtag(copied.CopyObjectResult?.ETag)) throw new Error("FINAL_OBJECT_VERIFICATION_FAILED");

  return { ...validated, sourceEtag: cleanEtag(head.ETag), sourceVersionId: head.VersionId ?? null, finalEtag: cleanEtag(finalObject.ETag) };
}
