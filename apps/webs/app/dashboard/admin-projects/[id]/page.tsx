import { AdminProjectDetailSection } from "@/components/dashboard/sections/admin-project-detail";

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AdminProjectDetailSection projectId={id} />;
}
