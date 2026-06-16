import { Badge } from "@/components/ui/badge";
import { Folder } from "lucide-react";

interface PortalProjectCardProps {
  project: {
    id: string;
    name: string;
    status: string;
    description: string | null;
  };
}

export function PortalProjectCard({ project }: PortalProjectCardProps) {
  const statusVariant = (s: string) => {
    if (s === "active") return "default" as const;
    if (s === "completed") return "secondary" as const;
    return "outline" as const;
  };

  return (
    <div className="flex items-center gap-3">
      <Folder className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{project.name}</span>
          <Badge variant={statusVariant(project.status)} className="text-[10px]">
            {project.status}
          </Badge>
        </div>
      </div>
    </div>
  );
}
