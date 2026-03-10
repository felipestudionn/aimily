import { redirect } from 'next/navigation';

interface PlannerPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlannerPage({ params }: PlannerPageProps) {
  const { id } = await params;
  redirect(`/collection/${id}/product`);
}
