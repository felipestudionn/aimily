import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GoToMarketPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/collection/${id}/go-to-market`);
}
