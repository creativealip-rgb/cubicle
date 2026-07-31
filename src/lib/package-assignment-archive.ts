export function buildPackageAssignmentArchivePredicate(
  workspaceId: string,
  projectId: string,
  sourcePackageAssignmentId: string | null,
) {
  if (!sourcePackageAssignmentId) return null;
  return { workspaceId, projectId, sourcePackageAssignmentId };
}
