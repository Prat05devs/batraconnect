import { Suspense } from 'react';
import { ReportPrint } from '@/views/Reports';

// Printable summary: outside the sidebar layout so the page prints cleanly.
export default function PrintPage() {
  return (
    <Suspense>
      <ReportPrint />
    </Suspense>
  );
}
