import assert from "node:assert/strict";
import test from "node:test";

import type { AnalysisResult, ClarificationDraft } from "../../components/inbox/types.ts";
import {
  isClarificationDraft,
  loadClarificationSnapshotForWorkflowId,
  saveClarificationDraft,
} from "./inbox-storage.ts";

type FakeLocalStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

/**
 * Runs fn with `window.localStorage` temporarily replaced by the given fake,
 * so the storage module (which only touches localStorage when `window`
 * exists) can be exercised deterministically under the plain Node test
 * runner. Restores whatever `window` was (or its absence) afterward, since
 * other test files share this same process only when run in isolation —
 * this file always cleans up regardless.
 */
function withFakeWindow<T>(localStorage: FakeLocalStorage, fn: () => T): T {
  const globalWithWindow = globalThis as { window?: unknown };
  const originalWindow = globalWithWindow.window;
  globalWithWindow.window = { localStorage };
  try {
    return fn();
  } finally {
    if (originalWindow === undefined) {
      delete globalWithWindow.window;
    } else {
      globalWithWindow.window = originalWindow;
    }
  }
}

function createRecordingLocalStorage() {
  const store = new Map<string, string>();
  const setItemCalls: { key: string; value: string }[] = [];
  const localStorage: FakeLocalStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
      setItemCalls.push({ key, value });
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
  return { store, setItemCalls, localStorage };
}

const validDraft = {
  customerName: "Familie Berger",
  subject: "Rückfrage zu Ihrer Anfrage: Wohnzimmer streichen",
  message: "Guten Tag Familie Berger,\n\n...",
  missingInformation: ["Bilder", "genaue Raummaße"],
  status: "draft",
} satisfies ClarificationDraft;

test("akzeptiert einen vollständigen Rückfrageentwurf", () => {
  assert.equal(isClarificationDraft(validDraft), true);
});

test("lehnt einen Entwurf mit fehlendem Betreff ab", () => {
  const withoutSubject: Record<string, unknown> = {
    customerName: validDraft.customerName,
    message: validDraft.message,
    missingInformation: validDraft.missingInformation,
    status: validDraft.status,
  };
  assert.equal(isClarificationDraft(withoutSubject), false);
});

test("lehnt einen Entwurf mit falschem Status ab", () => {
  assert.equal(
    isClarificationDraft({ ...validDraft, status: "sent" }),
    false,
  );
});

test("lehnt einen Entwurf mit nicht-textuellen fehlenden Informationen ab", () => {
  assert.equal(
    isClarificationDraft({ ...validDraft, missingInformation: ["Bilder", 5] }),
    false,
  );
});

test("lehnt Nicht-Objekte ab", () => {
  assert.equal(isClarificationDraft(null), false);
  assert.equal(isClarificationDraft("draft"), false);
  assert.equal(isClarificationDraft(undefined), false);
});

const snapshotTestAnalysis: AnalysisResult = {
  workflowId: "workflow-snapshot-coherence",
  customer: { name: "Familie Berger" },
  project: { trade: "Maler", service: "Streichen", estimatedArea: null },
  workflow: { priority: "normal", confidence: 0.5, nextAction: "Rückfrage senden" },
  nextSteps: [],
  missingInformation: [],
  recommendedTask: { type: "offer", title: "Angebot" },
};

const draftRevisionA: ClarificationDraft = {
  customerName: "Familie Berger",
  subject: "Rückfrage zu Ihrer Anfrage (Fassung A)",
  message: "Text der Fassung A",
  missingInformation: [],
  status: "draft",
};

const draftRevisionB: ClarificationDraft = {
  customerName: "Familie Berger",
  subject: "Rückfrage zu Ihrer Anfrage (Fassung B)",
  message: "Text der Fassung B",
  missingInformation: [],
  status: "draft",
};

test("loadClarificationSnapshotForWorkflowId liest den Entwurf genau einmal und liefert Draft und Identity ausschließlich aus demselben Datensatz", () => {
  // Discover the exact storage record a real save writes to, without
  // hardcoding any internal key name: persist revision A through the real
  // save path in an isolated fake store, then read back which key(s)
  // setItem actually wrote to.
  const recorder = createRecordingLocalStorage();
  const identityA = withFakeWindow(recorder.localStorage, () => {
    const { didSave, identity } = saveClarificationDraft(
      draftRevisionA,
      snapshotTestAnalysis,
    );
    assert.equal(didSave, true);
    return identity;
  });
  assert.ok(identityA && identityA.kind === "canonical");
  assert.ok(recorder.setItemCalls.length >= 1);

  const draftKey = recorder.setItemCalls[0]!.key;
  const draftValueA = recorder.store.get(draftKey)!;

  // Persist revision B into a second, separate in-memory store (never the
  // real one above), purely to obtain the exact serialized record a second,
  // concurrent tab would have written for the same workflow.
  const secondStore = new Map(recorder.store);
  const identityB = withFakeWindow(
    {
      getItem: (key) => secondStore.get(key) ?? null,
      setItem: (key, value) => secondStore.set(key, value),
      removeItem: (key) => secondStore.delete(key),
    },
    () => saveClarificationDraft(draftRevisionB, snapshotTestAnalysis).identity,
  );
  assert.ok(identityB && identityB.kind === "canonical");
  const draftValueB = secondStore.get(draftKey)!;
  assert.notEqual(draftValueA, draftValueB);

  // A "torn read" store: the first read of the draft key returns revision
  // A's record; any further read of that exact same key within the same
  // resolution returns revision B's record instead — simulating another tab
  // saving a new revision in the gap between two separate reads. If the
  // resolver under test reads the draft key more than once and combines the
  // results, it could report content from one revision alongside the
  // identity of the other.
  const draftKeyReadCounts = new Map<string, number>();
  const tornStorage: FakeLocalStorage = {
    getItem: (key) => {
      draftKeyReadCounts.set(key, (draftKeyReadCounts.get(key) ?? 0) + 1);
      if (key === draftKey) {
        return draftKeyReadCounts.get(key) === 1 ? draftValueA : draftValueB;
      }
      return secondStore.get(key) ?? null;
    },
    setItem: (key, value) => secondStore.set(key, value),
    removeItem: (key) => secondStore.delete(key),
  };

  const snapshot = withFakeWindow(tornStorage, () =>
    loadClarificationSnapshotForWorkflowId(snapshotTestAnalysis.workflowId),
  );

  assert.equal(draftKeyReadCounts.get(draftKey), 1);
  assert.ok(snapshot);
  assert.ok(snapshot.identity.kind === "canonical");

  if (snapshot.identity.revision === identityA!.revision) {
    assert.deepEqual(snapshot.draft, draftRevisionA);
  } else {
    assert.equal(snapshot.identity.revision, identityB!.revision);
    assert.deepEqual(snapshot.draft, draftRevisionB);
  }
});
