/** Mini Firestore en mémoire, juste ce qu'il faut pour tester les Server Actions. */
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

  private snap(collection: string, id: string) {
    const d = this.data.get(collection)?.get(id);
    return { id, exists: d !== undefined, data: () => (d ? { ...d } : undefined) };
  }

  private query(collection: string, filters: Array<[string, any]>) {
    const run = (limit?: number) => {
      let rows = this.all(collection).filter(([, d]) => filters.every(([f, v]) => d[f] === v));
      if (limit !== undefined) rows = rows.slice(0, limit);
      return {
        empty: rows.length === 0,
        docs: rows.map(([id, d]) => ({ id, exists: true, data: () => ({ ...d }) })),
      };
    };
    return {
      limit: (n: number) => ({ get: async () => run(n) }),
      get: async () => run(),
    };
  }

  collection = (name: string) => ({
    doc: (id: string) => ({
      get: async () => this.snap(name, id),
      update: async (patch: Doc) => {
        this.writes.push({ op: 'update', collection: name, id, data: patch });
        this.seed(name, id, { ...(this.data.get(name)?.get(id) ?? {}), ...patch });
      },
      delete: async () => {
        this.writes.push({ op: 'delete', collection: name, id });
        this.data.get(name)?.delete(id);
      },
    }),
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
    orderBy: () => ({ get: async () => this.query(name, []).get() }),
    get: async () => this.query(name, []).get(),
  });
}
