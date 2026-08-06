/** Split a CSV/TSV line, respecting quoted fields. */
export function splitDelimitedLine(line, delimiter = ',') {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function detectDelimiter(headerLine) {
  const commas = (headerLine.match(/,/g) || []).length;
  const tabs = (headerLine.match(/\t/g) || []).length;
  const semis = (headerLine.match(/;/g) || []).length;
  if (tabs > commas && tabs >= semis) return '\t';
  if (semis > commas) return ';';
  return ',';
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

const HEADER_ALIASES = {
  id: ['id', 'sku', 'productid', 'productsku', 'code'],
  name: ['name', 'product', 'productname', 'item', 'itemname', 'title'],
  price: ['price', 'sellprice', 'sellingprice', 'unitprice', 'retail', 'retailprice'],
  cost: ['cost', 'costprice', 'buyprice', 'purchaseprice', 'wholesale'],
  stock: ['stock', 'qty', 'quantity', 'onhand', 'inventory', 'count'],
  category: ['category', 'cat', 'group', 'department', 'type']
};

function mapHeaders(headers) {
  const normalized = headers.map(normalizeHeader);
  const map = {};

  Object.entries(HEADER_ALIASES).forEach(([field, aliases]) => {
    const index = normalized.findIndex((header) => aliases.includes(header));
    if (index >= 0) map[field] = index;
  });

  return map;
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const cleaned = String(value).replace(/[₦$,\s]/g, '');
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

/**
 * Parse a CSV/TSV/TXT product upload into product row objects.
 * Required columns: name, price, stock
 * Optional: id/sku, cost, category
 */
export function parseProductCsv(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '').trim();
  if (!raw) {
    return { products: [], errors: ['File is empty.'] };
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return { products: [], errors: ['File needs a header row and at least one product row.'] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitDelimitedLine(lines[0], delimiter);
  const map = mapHeaders(headers);

  if (map.name === undefined || map.price === undefined || map.stock === undefined) {
    return {
      products: [],
      errors: [
        'Missing required columns. Use headers like: name, price, stock (optional: sku, cost, category).'
      ]
    };
  }

  const products = [];
  const errors = [];

  lines.slice(1).forEach((line, index) => {
    const rowNumber = index + 2;
    const cells = splitDelimitedLine(line, delimiter);
    const name = cells[map.name]?.trim();
    const price = parseNumber(cells[map.price]);
    const stock = parseNumber(cells[map.stock]);
    const cost = map.cost !== undefined ? parseNumber(cells[map.cost]) : 0;
    const category = map.category !== undefined ? cells[map.category]?.trim() : '';
    const id = map.id !== undefined ? cells[map.id]?.trim() : '';

    if (!name && price === null && stock === null) return;

    if (!name) {
      errors.push(`Row ${rowNumber}: missing product name.`);
      return;
    }
    if (price === null || price < 0) {
      errors.push(`Row ${rowNumber}: invalid price for "${name || 'product'}".`);
      return;
    }
    if (stock === null || stock < 0 || !Number.isInteger(stock)) {
      errors.push(`Row ${rowNumber}: invalid stock quantity for "${name}". Use a whole number.`);
      return;
    }

    products.push({
      id: id || undefined,
      name,
      price,
      cost: cost === null || cost < 0 ? 0 : cost,
      stock,
      category: category || 'General'
    });
  });

  if (products.length === 0 && errors.length === 0) {
    errors.push('No product rows found in the file.');
  }

  return { products, errors };
}

export const PRODUCT_CSV_TEMPLATE = `sku,name,category,price,cost,stock
SKU-0100,Sample Peak Milk,Dairy,1800,1500,40
,Indomie Carton,Noodles,8500,7200,20
`;
