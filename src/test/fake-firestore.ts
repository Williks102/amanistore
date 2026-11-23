/**
 * Mini Firestore en mémoire, juste ce qu'il faut pour tester les Server Actions.
 * Limite: les transactions sont exécutées sans isolation (les tests sont séquentiels);
 * l'atomicité réelle est garantie par Firestore en production.
 */
type Doc = Record<string, any>;

export class FakeFirestore {
  data = new Map<string, Map<string, Doc>>();
  private seq = 0;
  /** Journal des écritures, pour vérifier qu'une action refusée n'écrit rien. */
  writes: Array<{ op: string; collection: string; id: string; data?: Doc }> = [];

  seed(collection: string, id: string, doc: Doc) {
    if (!this.data.has(collection)) this.data.set(collection, new Map());
    this.data.get(collection)!.set(id, doc);
  }
  all(collection: string) {
    return Array.from(this.data.get(collection)?.entries() ?? []);
  }
  get(collection: string, id: string): Doc | undefined {
    return this.data.get(collection)?.get(id);
  }

  private snap(collection: string, id: string) {
    const d = this.data.get(collection)?.get(id);
    return { id, exists: d !== undefined, data: () => (d ? { ...d } : undefined), ref: this.docRef(collection, id) };
  }

  private docRef(collection: string, id: string) {
    return {
      id,
      path: `${collection}/${id}`,
      get: async () => this.snap(collection, id),
      set: async (doc: Doc) => {
        this.writes.push({ op: 'set', collection, id, data: doc });
        this.seed(collection, id, { ...doc });
      },
      update: async (patch: Doc) => {
        this.writes.push({ op: 'update', collection, id, data: patch });
        this.seed(collection, id, { ...(this.data.get(collection)?.get(id) ?? {}), ...patch });
      },
      delete: async () => {
        this.writes.push({ op: 'delete', collection, id });
        this.data.get(collection)?.delete(id);
      },
    };
  }

  private query(collection: string, filters: Array<[string, any]>) {
    const run = (limit?: number) => {
      let rows = this.all(collection).filter(([, d]) => filters.every(([f, v]) => d[f] === v));
      if (limit !== undefined) rows = rows.slice(0, limit);
      return {
        empty: rows.length === 0,
        docs: rows.map(([id, d]) => ({ id, exists: true, data: () => ({ ...d }), ref: this.docRef(collection, id) })),
      };
    };
    return {
      limit: (n: number) => ({ get: async () => run(n) }),
      get: async () => run(),
    };
  }

  collection = (name: string) => ({
    doc: (id?: string) => this.docRef(name, id ?? `${name}-auto-${++this.seq}`),
    add: async (doc: Doc) => {
      const id = `${name}-${++this.seq}`;
      this.writes.push({ op: 'add', collection: name, id, data: doc });
      this.seed(name, id, doc);
      return { id };
    },
    where: (field: string, op: string, value: any) => {
      if (op !== '==') throw new Error(`FakeFirestore: opérateur non supporté "${op}"`);
      return this.query(name, [[field, value]]);
    },
    orderBy: (field: string, direction: 'asc' | 'desc' = 'asc') => ({
      get: async () => {
        const res = await this.query(name, []).get();
        const sign = direction === 'desc' ? -1 : 1;
        res.docs.sort((a, b) => (a.data()[field] > b.data()[field] ? sign : a.data()[field] < b.data()[field] ? -sign : 0));
        return res;
      },
    }),
    get: async () => this.query(name, []).get(),
  });

  /** Transaction simplifiée: lectures directes, écritures différées et appliquées à la fin (rien n'est écrit si la fonction échoue). */
  runTransaction = async <T>(fn: (tx: any) => Promise<T>): Promise<T> => {
    const pending: Array<() => Promise<void>> = [];
    let wrote = false;
    const tx = {
      get: async (target: { get: () => Promise<any> }) => {
        if (wrote) throw new Error('FakeFirestore: lecture après écriture dans une transaction (interdit par Firestore)');
        return target.get();
      },
      set: (ref: { set: (d: Doc) => Promise<void> }, doc: Doc) => { wrote = true; pending.push(() => ref.set(doc)); return tx; },
      update: (ref: { update: (d: Doc) => Promise<void> }, patch: Doc) => { wrote = true; pending.push(() => ref.update(patch)); return tx; },
    };
    const result = await fn(tx);
    for (const w of pending) await w();
    return result;
  };
}
