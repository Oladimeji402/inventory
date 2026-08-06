import { describe, expect, it } from 'vitest';
import { parseProductCsv } from './csv';

describe('parseProductCsv', () => {
  it('parses a standard product CSV', () => {
    const text = `name,price,cost,stock,category
Peak Milk,1800,1500,40,Dairy
Indomie,8500,7200,20,Noodles`;

    const { products, errors } = parseProductCsv(text);
    expect(errors).toEqual([]);
    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({
      name: 'Peak Milk',
      price: 1800,
      cost: 1500,
      stock: 40,
      category: 'Dairy'
    });
  });

  it('accepts sku aliases and currency-formatted prices', () => {
    const text = `sku,product name,sell price,qty
SKU-0099,Sugar,"₦1,600",12`;

    const { products, errors } = parseProductCsv(text);
    expect(errors).toEqual([]);
    expect(products[0]).toMatchObject({
      id: 'SKU-0099',
      name: 'Sugar',
      price: 1600,
      stock: 12,
      category: 'General'
    });
  });

  it('reports missing required headers', () => {
    const { products, errors } = parseProductCsv('foo,bar\n1,2');
    expect(products).toEqual([]);
    expect(errors[0]).toMatch(/Missing required columns/i);
  });
});
