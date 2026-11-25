import { describe, expect, it } from 'vitest';
import type { Attribute } from './types';
import { emptyOptionsForm, optionsFromState, parseOptionsForm, splitValues, stateFromShoe, stockRowsFor, STARTER_ATTRIBUTES } from './option-form';
import { validateAttribute, validateProductAttributes, variantKey } from './attributes';

const attrs: Attribute[] = [
  { id: 'p', name: 'Pointure', kind: 'text', values: ['38', '39', '40'].map((label) => ({ label })) },
  { id: 'c', name: 'Couleur', kind: 'color', values: [{ label: 'Noir', hex: '#1C1B1A' }, { label: 'Turquoise', hex: '#40E0D0' }] },
  { id: 'm', name: 'Matière', kind: 'text', values: [{ label: 'Cuir' }, { label: 'Toile' }] },
];
const form = (over: Partial<ReturnType<typeof emptyOptionsForm>> = {}) => ({ ...emptyOptionsForm(), ...over });

describe('optionsFromState', () => {
  it('garde l’ordre du formulaire, l’ordre des valeurs de l’attribut, et les codes couleur', () => {
    const o = optionsFromState(form({ selected: [{ attributeId: 'c', values: ['Turquoise', 'Noir'] }, { attributeId: 'p', values: ['40', '38'] }] }), attrs);
    expect(o).toEqual([
      { attributeId: 'c', name: 'Couleur', kind: 'color', values: ['Noir', 'Turquoise'], hexes: { Noir: '#1C1B1A', Turquoise: '#40E0D0' } },
      { attributeId: 'p', name: 'Pointure', kind: 'text', values: ['38', '40'] },
    ]);
  });
});

describe('stockRowsFor', () => {
  const two = optionsFromState(form({ selected: [{ attributeId: 'p', values: ['38', '39'] }, { attributeId: 'c', values: ['Noir', 'Turquoise'] }] }), attrs);
  it('une ligne par combinaison', () => {
    expect(stockRowsFor(two, 'combination').map((r) => r.label)).toEqual(['Pointure 38 · Couleur Noir', 'Pointure 38 · Couleur Turquoise', 'Pointure 39 · Couleur Noir', 'Pointure 39 · Couleur Turquoise']);
  });
  it('stock partagé: une ligne par valeur du premier attribut', () => {
    expect(stockRowsFor(two, 'attribute1').map((r) => r.label)).toEqual(['Pointure 38', 'Pointure 39']);
  });
  it('un seul attribut: le mode partagé n’a pas de sens, une ligne par valeur', () => {
    expect(stockRowsFor(two.slice(0, 1), 'attribute1').map((r) => r.label)).toEqual(['Pointure 38', 'Pointure 39']);
  });
  it('sans attribut: quantité unique', () => {
    expect(stockRowsFor([], 'combination')).toEqual([{ key: '_', label: 'Quantité en stock' }]);
  });
});

describe('parseOptionsForm', () => {
  it('sac sans attribut: quantité unique', () => {
    expect(parseOptionsForm(form({ qty: { _: '5' } }), attrs)).toEqual({ ok: true, options: [], stockScope: 'combination', variantStock: { _: 5 } });
  });
  it('stock non suivi: ni mode ni quantités', () => {
    expect(parseOptionsForm(form({ tracked: false, selected: [{ attributeId: 'p', values: ['38'] }] }), attrs)).toEqual({ ok: true, options: [{ attributeId: 'p', name: 'Pointure', kind: 'text', values: ['38'] }] });
  });
  it('combinaisons: clés compatibles avec le serveur', () => {
    const r = parseOptionsForm(form({ selected: [{ attributeId: 'p', values: ['38'] }, { attributeId: 'm', values: ['Cuir', 'Toile'] }], qty: { [variantKey(['38', 'Cuir'])]: '3', [variantKey(['38', 'Toile'])]: '0' } }), attrs) as any;
    expect(r.variantStock).toEqual({ '38|cuir': 3, '38|toile': 0 });
    expect(validateProductAttributes({ options: r.options, stockScope: r.stockScope, variantStock: r.variantStock })).toBeNull();
  });
  it('stock partagé par premier attribut', () => {
    const r = parseOptionsForm(form({ scope: 'attribute1', selected: [{ attributeId: 'p', values: ['38', '39'] }, { attributeId: 'c', values: ['Noir', 'Turquoise'] }], qty: { '38': '4', '39': '1' } }), attrs) as any;
    expect(r.stockScope).toBe('attribute1');
    expect(r.variantStock).toEqual({ '38': 4, '39': 1 });
    expect(validateProductAttributes({ options: r.options, stockScope: r.stockScope, variantStock: r.variantStock })).toBeNull();
  });
  it('refuse: valeur non cochée, attribut disparu, plus de 2 attributs', () => {
    expect(parseOptionsForm(form({ selected: [{ attributeId: 'p', values: [] }], qty: {} }), attrs)).toMatchObject({ error: expect.stringMatching(/au moins une valeur.*Pointure/) });
    expect(parseOptionsForm(form({ selected: [{ attributeId: 'zzz', values: ['x'] }] }), attrs)).toMatchObject({ error: expect.stringMatching(/n’existe plus/) });
    expect(parseOptionsForm(form({ selected: [{ attributeId: 'p', values: ['38'] }, { attributeId: 'c', values: ['Noir'] }, { attributeId: 'm', values: ['Cuir'] }] }), attrs)).toMatchObject({ error: expect.stringMatching(/au plus 2/) });
  });
  it('refuse stock vide, négatif, décimal, trop grand, en nommant la ligne', () => {
    for (const q of ['', '-1', '1.5', 'abc', '100001']) {
      const r = parseOptionsForm(form({ selected: [{ attributeId: 'p', values: ['38'] }], qty: { '38': q } }), attrs);
      expect(r).toMatchObject({ error: expect.stringMatching(/Pointure 38/) });
    }
  });
  it('plafond de 100 combinaisons, sauf stock partagé', () => {
    const many: Attribute[] = [
      { id: 'a', name: 'A', kind: 'text', values: Array.from({ length: 11 }, (_, i) => ({ label: `a${i}` })) },
      { id: 'b', name: 'B', kind: 'text', values: Array.from({ length: 10 }, (_, i) => ({ label: `b${i}` })) },
    ];
    const selected = [{ attributeId: 'a', values: many[0].values.map((v) => v.label) }, { attributeId: 'b', values: many[1].values.map((v) => v.label) }];
    expect(parseOptionsForm(form({ selected }), many)).toMatchObject({ error: expect.stringMatching(/Trop de combinaisons/) });
    const shared = parseOptionsForm(form({ selected, scope: 'attribute1', qty: Object.fromEntries(many[0].values.map((v) => [variantKey([v.label]), '1'])) }), many);
    expect(shared.ok).toBe(true);
  });
});

describe('stateFromShoe', () => {
  it('relit un produit à attributs: sélection, mode et quantités', () => {
    const shoe = { options: [{ attributeId: 'p', name: 'Pointure', kind: 'text' as const, values: ['38', '39'] }], stockScope: 'combination' as const, variantStock: { '38': 2 } };
    const s = stateFromShoe(shoe);
    expect(s).toEqual({ selected: [{ attributeId: 'p', values: ['38', '39'] }], tracked: true, scope: 'combination', qty: { '38': '2', '39': '0' } });
    expect(parseOptionsForm(s, attrs)).toMatchObject({ variantStock: { '38': 2, '39': 0 } });
  });
  it('stock non suivi et produit sans attribut', () => {
    expect(stateFromShoe({ options: [] }).tracked).toBe(false);
    expect(stateFromShoe({ options: [], variantStock: { _: 3 } }).qty).toEqual({ _: '3' });
  });
});

describe('aides de saisie', () => {
  it('splitValues: virgules, points-virgules, doublons et casse', () => {
    expect(splitValues('S, M ;L\nxl,  m ')).toEqual(['S', 'M', 'L', 'xl']);
    expect(splitValues('s, Xl', ['S', 'M'])).toEqual(['Xl']);
    expect(splitValues(' , ; ')).toEqual([]);
  });
  it('attributs de départ valides pour le serveur', () => {
    for (const a of STARTER_ATTRIBUTES) expect(validateAttribute(a as any)).toBeNull();
  });
});
