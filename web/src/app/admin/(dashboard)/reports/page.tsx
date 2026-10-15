import { Suspense } from 'react';
import { Reports } from '@/views/Reports';

// Filters are read from the address bar, which needs a Suspense boundary in Next.js.
export default function ReportsPage() {
  return (
    <Suspense>
      <Reports />
    </Suspense>
  );
}
