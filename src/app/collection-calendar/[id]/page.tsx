import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CollectionCalendarPage({ params }: Props) {
  const { id } = await params;
  redirect(`/collection/${id}/calendar`);
}
