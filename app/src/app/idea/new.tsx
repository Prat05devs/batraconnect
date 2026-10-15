import React from 'react';
import { useAuth } from '../../auth';
import { OversightOnly } from '../../connected-ui';
import { IdeaEditor } from '../../PlanningScreens';
export default function NewIdea() {
  const { session } = useAuth();
  return session?.user.role === 'executive' ? <OversightOnly /> : <IdeaEditor />;
}
