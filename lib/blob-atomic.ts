export type AtomicJsonSnapshot<T> = {
  data: T;
  etag?: string;
};

export type AtomicJsonCondition = { onlyIfNew: true } | { onlyIfMatch: string };

export async function updateJsonAtomically<T>(input: {
  read: () => Promise<AtomicJsonSnapshot<T> | null>;
  write: (value: T, condition: AtomicJsonCondition) => Promise<{ modified: boolean }>;
  update: (current: T | null) => T | undefined;
  attempts?: number;
}) {
  const attempts = input.attempts ?? 4;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const current = await input.read();
    const value = input.update(current?.data ?? null);
    if (value === undefined) return { value: current?.data ?? null, modified: false };

    let condition: AtomicJsonCondition;
    if (!current) condition = { onlyIfNew: true };
    else {
      if (!current.etag) throw new Error("Atomic blob update requires an ETag");
      condition = { onlyIfMatch: current.etag };
    }
    const result = await input.write(value, condition);
    if (result.modified) return { value, modified: true };
  }

  throw new Error("Atomic blob update could not be completed after repeated contention");
}
