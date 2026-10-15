import React from 'react';
import { useAuth } from '../auth';
import { OversightOnly } from '../connected-ui';
import { ReportScreen } from '../ReportScreen';
export default function Report() {
  const { session } = useAuth();
  return session?.user.role === 'executive' ? <OversightOnly /> : <ReportScreen />;
}
