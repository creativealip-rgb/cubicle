import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { files, folders, projects } from "@/db/schema";
import { getClientPortalAccess } from "@/lib/actions/portal";
import { buildFileKey, R2_BUCKET, r2 } from "@/lib/r2";
import { validateUploadedFile } from "@/lib/file-validation";
import { writeActivityLog } from "@/lib/actions/activity";

export const runtime = "nodejs";

const MAX_SIZE = 25 * 1024 * 1024;

/**
 * Client-portal file upload (token auth, no workspace session).
 * Multipart: token, file, projectId?, folderId?
 * Always stored as visibility=client, fileType=working_file, uploadedBy=null.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const token = String(form.get("token") ?? "");
    const projectIdRaw = String(form.get("projectId") ?? "").trim() || null;
    const folderIdRaw = String(form.get("folderId") ?? "").trim() || null;
    const upload = form.get("file");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }
    if (!(upload instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }
    if (upload.size <= 0 || upload.size > MAX_SIZE) {
      return NextResponse.json({ error: "File must be under 25MB" }, { status: 400 });
    }

    const client = await getClientPortalAccess(token);

    // Visible projects for this client (only clientVisible projects).
    const visibleProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, client.workspaceId),
          eq(projects.clientId, client.id),
          eq(projects.clientVisible, true),
        ),
      );
    const visibleProjectIds = visibleProjects.map((p) => p.id);

    let projectId: string | null = projectIdRaw;
    const folderId: string | null = folderIdRaw;

    if (projectId) {
      if (!visibleProjectIds.includes(projectId)) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }

    if (folderId) {
      const [folder] = await db
        .select({
          id: folders.id,
          projectId: folders.projectId,
          clientId: folders.clientId,
          workspaceId: folders.workspaceId,
        })
        .from(folders)
        .where(
          and(
            eq(folders.id, folderId),
            eq(folders.workspaceId, client.workspaceId),
            or(
              eq(folders.clientId, client.id),
              visibleProjectIds.length > 0
                ? inArray(folders.projectId, visibleProjectIds)
                : isNull(folders.id), // never match
            ),
          ),
        )
        .limit(1);

      if (!folder) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }

      // Prefer folder's project scope if set.
      if (folder.projectId) {
        if (!visibleProjectIds.includes(folder.projectId)) {
          return NextResponse.json({ error: "Folder project not shared" }, { status: 403 });
        }
        projectId = folder.projectId;
      } else if (projectId && folder.projectId === null) {
        // Client-root folder — keep projectId null unless already null.
        projectId = null;
      }
    }

    const body = Buffer.from(await upload.arrayBuffer());
    const validation = validateUploadedFile(upload.name, body.subarray(0, 16));
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.reason ?? "File tidak valid" },
        { status: 400 },
      );
    }

    const fileId = crypto.randomUUID();
    const safeName = upload.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = buildFileKey(client.workspaceId, fileId, safeName);

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: storageKey,
        Body: body,
        ContentType: upload.type || "application/octet-stream",
        ContentLength: body.length,
      }),
    );

    const [fileRow] = await db
      .insert(files)
      .values({
        workspaceId: client.workspaceId,
        clientId: client.id,
        projectId,
        folderId,
        name: upload.name,
        storageKey,
        mimeType: upload.type || null,
        sizeBytes: upload.size,
        visibility: "client",
        fileType: "working_file",
        uploadedBy: null,
      })
      .returning({
        id: files.id,
        name: files.name,
        mimeType: files.mimeType,
        sizeBytes: files.sizeBytes,
        fileType: files.fileType,
        createdAt: files.createdAt,
        projectId: files.projectId,
        folderId: files.folderId,
      });

    try {
      await writeActivityLog(
        client.workspaceId,
        null,
        "client_uploaded_file",
        "file",
        fileRow.id,
        { clientId: client.id, name: fileRow.name },
      );
    } catch {
      // non-critical
    }

    try {
      const { notifyWorkspaceMembers } = await import("@/lib/in-app-notifications");
      await notifyWorkspaceMembers(client.workspaceId, {
        type: "client_file_uploaded",
        title: `${client.name} uploaded ${fileRow.name}`,
        body: projectId ? "Client portal upload" : "Client portal upload (root)",
        link: `/app/files?focus=${fileRow.id}`,
        entityType: "file",
        entityId: fileRow.id,
        actorId: null,
      });
    } catch {
      // non-critical
    }

    return NextResponse.json({
      ok: true,
      file: {
        ...fileRow,
        createdAt: fileRow.createdAt ? String(fileRow.createdAt) : new Date().toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    const status = /invalid|disabled|revoked|expired/i.test(message) ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
