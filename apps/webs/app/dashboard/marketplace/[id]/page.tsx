import { MarketplaceProjectDetailSection } from "@/components/dashboard/sections/marketplace-project-detail";

export default async function MarketplaceProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <MarketplaceProjectDetailSection projectId={id} />;
}
