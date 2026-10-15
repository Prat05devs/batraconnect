'use client';
import { useParams } from 'next/navigation';
import { ContentEditor } from '@/views/Content';

export default function ContentEntryPage() {
  const { id } = useParams<{ id: string }>();
  return <ContentEditor key={id} id={id} />;
}
