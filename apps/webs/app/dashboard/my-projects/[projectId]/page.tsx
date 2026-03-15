"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ProjectDetailsSection } from "@/components/dashboard/sections/project-details";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();

  return (
    <ProjectDetailsSection
      projectId={projectId}
      onBack={() => router.push("/dashboard/my-projects")}
    />
  );
}
