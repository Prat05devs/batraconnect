/** Serializes read/modify/write operations; publishes only durable snapshots. */
export function createTransactions<T>(
  read: () => T,
  persist: (next: T) => Promise<void>,
  commit: (next: T) => void,
) {
  let pending = Promise.resolve();
  return (change: (current: T) => T) => {
    const job = pending
      .catch(() => {})
      .then(async () => {
        const next = change(read());
        await persist(next);
        commit(next);
      });
    pending = job;
    return job;
  };
}
