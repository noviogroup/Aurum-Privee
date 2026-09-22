import assert from "node:assert/strict";
import test from "node:test";
import { updateJsonAtomically, type AtomicJsonCondition } from "@/lib/blob-atomic";

test("atomic JSON updates create a missing value conditionally", async () => {
  let stored: { count: number } | null = null;
  const result = await updateJsonAtomically({
    read: async () => null,
    write: async (value: { count: number }, condition: AtomicJsonCondition) => {
      assert.deepEqual(condition, { onlyIfNew: true });
      stored = value;
      return { modified: true };
    },
    update: () => ({ count: 1 }),
  });

  assert.deepEqual(stored, { count: 1 });
  assert.equal(result.modified, true);
});

test("atomic JSON updates retry after a competing writer wins", async () => {
  let reads = 0;
  const writes: Array<{ value: { count: number }; condition: AtomicJsonCondition }> = [];
  const result = await updateJsonAtomically({
    read: async () => {
      reads += 1;
      return reads === 1 ? { data: { count: 2 }, etag: "v1" } : { data: { count: 3 }, etag: "v2" };
    },
    write: async (value: { count: number }, condition: AtomicJsonCondition) => {
      writes.push({ value, condition });
      return { modified: writes.length > 1 };
    },
    update: (current) => ({ count: (current?.count || 0) + 1 }),
  });

  assert.deepEqual(writes, [
    { value: { count: 3 }, condition: { onlyIfMatch: "v1" } },
    { value: { count: 4 }, condition: { onlyIfMatch: "v2" } },
  ]);
  assert.deepEqual(result, { value: { count: 4 }, modified: true });
});

test("atomic JSON updates can leave an existing value unchanged", async () => {
  let wrote = false;
  const result = await updateJsonAtomically({
    read: async () => ({ data: { status: "processed" }, etag: "v1" }),
    write: async () => { wrote = true; return { modified: true }; },
    update: () => undefined,
  });

  assert.equal(wrote, false);
  assert.deepEqual(result, { value: { status: "processed" }, modified: false });
});

test("atomic JSON updates fail safely when an existing value has no ETag", async () => {
  await assert.rejects(() => updateJsonAtomically({
    read: async () => ({ data: { count: 1 } }),
    write: async () => ({ modified: true }),
    update: (current) => ({ count: (current?.count || 0) + 1 }),
  }), /requires an ETag/);
});
