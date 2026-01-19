#!/usr/bin/env node
/**
 * Extract frost resistance items from SQL dump
 * Generates a JSON lookup file: { itemId: { name, frostRes } }
 */

const fs = require('fs');
const path = require('path');

const SQL_FILE = path.join(__dirname, 'items.sql');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'frostResistItems.json');

// Read SQL file
const sql = fs.readFileSync(SQL_FILE, 'utf-8');

// Find the column order from INSERT statement
const insertMatch = sql.match(/INSERT INTO `items` \(([^)]+)\) VALUES/);
if (!insertMatch) {
  console.error('Could not find INSERT statement');
  process.exit(1);
}

const columns = insertMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
const itemIdIndex = columns.indexOf('item_id');
const nameIndex = columns.indexOf('name');
const frostResIndex = columns.indexOf('frost_res');

console.log('Column indices:');
console.log(`  item_id: ${itemIdIndex}`);
console.log(`  name: ${nameIndex}`);
console.log(`  frost_res: ${frostResIndex}`);
console.log(`  Total columns: ${columns.length}`);

// Parse all VALUES tuples
// Match pattern: (value1, value2, ..., valueN)
const valuesRegex = /\((\d+,\d+,\d+,\d+,'[^']*'[^)]*)\)/g;
const items = {};
let totalItems = 0;
let frItems = 0;

let match;
while ((match = valuesRegex.exec(sql)) !== null) {
  totalItems++;
  const row = match[1];

  // Parse the row - handle quoted strings carefully
  const values = [];
  let current = '';
  let inQuote = false;
  let escaped = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      current += char;
      continue;
    }

    if (char === "'" && !inQuote) {
      inQuote = true;
      current += char;
      continue;
    }

    if (char === "'" && inQuote) {
      inQuote = false;
      current += char;
      continue;
    }

    if (char === ',' && !inQuote) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }
  values.push(current.trim()); // Last value

  const itemId = parseInt(values[itemIdIndex], 10);
  const name = values[nameIndex].replace(/^'|'$/g, '').replace(/\\'/g, "'");
  const frostRes = parseInt(values[frostResIndex], 10);

  if (frostRes > 0) {
    items[itemId] = { name, frostRes };
    frItems++;
  }
}

console.log(`\nProcessed ${totalItems} items`);
console.log(`Found ${frItems} items with frost resistance\n`);

// Sort by frost resistance (descending) for display
const sorted = Object.entries(items)
  .sort((a, b) => b[1].frostRes - a[1].frostRes);

console.log('Top 20 frost resistance items:');
sorted.slice(0, 20).forEach(([id, { name, frostRes }]) => {
  console.log(`  ${id}: ${name} (+${frostRes} FR)`);
});

// Create output directory if needed
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write JSON file - simplified format: { itemId: frostRes }
const simplified = {};
for (const [id, { frostRes }] of Object.entries(items)) {
  simplified[id] = frostRes;
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(simplified, null, 2));
console.log(`\nWrote ${OUTPUT_FILE}`);

// Also create a version with names for debugging
const debugFile = path.join(__dirname, '..', 'src', 'data', 'frostResistItems.debug.json');
fs.writeFileSync(debugFile, JSON.stringify(items, null, 2));
console.log(`Wrote ${debugFile} (with item names)`);
