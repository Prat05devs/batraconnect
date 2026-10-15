import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { secureStorage } from './secure-storage';
import {
  createIdea,
  createMeeting,
  emptyIdea,
  emptyMeeting,
  emptyPlanning,
  parsePlanning,
  type IdeaDraft,
  type MeetingDraft,
  type PlanningData,
} from './planning';
import { createTransactions } from './persistence';
import { toggleSavedScheme } from './saved-schemes';
const KEY = 'batra-connect:planning:v1';
type PlanningState = PlanningData & {
  toggleScheme: (id: string) => Promise<void>;
  ready: boolean;
  error: string | null;
  saveIdeaDraft: (draft: IdeaDraft) => Promise<void>;
  saveMeetingDraft: (draft: MeetingDraft) => Promise<void>;
  saveIdea: (draft: IdeaDraft) => Promise<string>;
  saveMeeting: (draft: MeetingDraft) => Promise<string>;
  toggleBookmark: (id: string) => Promise<void>;
  removeIdea: (id: string) => Promise<void>;
  removeMeeting: (id: string) => Promise<void>;
  clear: () => Promise<void>;
};
const Context = createContext<PlanningState | null>(null);
export function PlanningProvider({ children }: React.PropsWithChildren) {
  const [data, setData] = useState(emptyPlanning);
  const ref = useRef(data);
  const transactions = useRef<ReturnType<typeof createTransactions<PlanningData>> | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    secureStorage
      .getItem(KEY)
      .then(raw => {
        const next = parsePlanning(raw);
        if (active) {
          ref.current = next;
          setData(next);
        }
      })
      .catch(() => {
        if (active)
          setError(
            'Your saved ideas and notes could not be loaded. Clear local demo data in Profile to reset them.',
          );
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  function transact(change: (current: PlanningData) => PlanningData) {
    if (!transactions.current)
      transactions.current = createTransactions(
        () => ref.current,
        next => secureStorage.setItem(KEY, JSON.stringify(next)),
        next => {
          ref.current = next;
          setData(next);
        },
      );
    return transactions.current!(change)
      .then(() => setError(null))
      .catch((cause: unknown) => {
        setError('Changes could not be saved on this device. Keep your current screen open and try again.');
        throw cause;
      });
  }
  async function saveIdea(draft: IdeaDraft) {
    const idea = createIdea(draft);
    await transact(p => ({ ...p, ideas: [idea, ...p.ideas], ideaDraft: emptyIdea() }));
    return idea.id;
  }
  async function saveMeeting(draft: MeetingDraft) {
    const note = createMeeting(draft);
    await transact(p => ({ ...p, meetings: [note, ...p.meetings], meetingDraft: emptyMeeting() }));
    return note.id;
  }
  return (
    <Context.Provider
      value={{
        ...data,
        ready,
        error,
        toggleScheme: id => transact(p => ({ ...p, savedSchemes: toggleSavedScheme(p.savedSchemes, id) })),
        saveIdeaDraft: draft => transact(p => ({ ...p, ideaDraft: { ...draft } })),
        saveMeetingDraft: draft => transact(p => ({ ...p, meetingDraft: { ...draft } })),
        saveIdea,
        saveMeeting,
        toggleBookmark: id =>
          transact(p => ({
            ...p,
            bookmarks: p.bookmarks.includes(id) ? p.bookmarks.filter(b => b !== id) : [...p.bookmarks, id],
          })),
        removeIdea: id => transact(p => ({ ...p, ideas: p.ideas.filter(i => i.id !== id) })),
        removeMeeting: id => transact(p => ({ ...p, meetings: p.meetings.filter(m => m.id !== id) })),
        clear: () => transact(() => emptyPlanning()),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePlanning() {
  const value = useContext(Context);
  if (!value) throw new Error('PlanningProvider missing');
  return value;
}
