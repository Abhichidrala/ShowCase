/**
 * Simple JSON file-based database for the portfolio.
 * Zero dependencies, zero compilation issues, works everywhere.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data.json');

const DEFAULT_DATA = {
  users: [],
  projects: [],
  skills: [],
  experience: [],
  certificates: [],
  blogs: [],
  settings: [],
  _counters: {
    users: 0,
    projects: 0,
    skills: 0,
    experience: 0,
    certificates: 0,
    blogs: 0,
    settings: 0
  }
};

let data = null;

function load() {
  if (data) return data;
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      data = JSON.parse(raw);
      // Ensure all collections exist
      for (const key of Object.keys(DEFAULT_DATA)) {
        if (!(key in data)) data[key] = DEFAULT_DATA[key];
      }
      if (!data._counters) data._counters = { ...DEFAULT_DATA._counters };
    } else {
      data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
  } catch {
    data = JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
  return data;
}

function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function nextId(collection) {
  const d = load();
  if (!d._counters[collection]) d._counters[collection] = 0;
  d._counters[collection]++;
  return d._counters[collection];
}

// --- Generic CRUD helpers ---

const db = {
  // Get all items from a collection
  all(collection, filter) {
    const d = load();
    let items = d[collection] || [];
    if (filter) {
      items = items.filter(item => {
        return Object.entries(filter).every(([k, v]) => item[k] === v);
      });
    }
    return items;
  },

  // Get one item by id
  get(collection, id) {
    const d = load();
    return (d[collection] || []).find(item => item.id === id) || null;
  },

  // Find by field value
  findBy(collection, field, value) {
    const d = load();
    return (d[collection] || []).find(item => item[field] === value) || null;
  },

  // Insert a new item
  insert(collection, item) {
    const d = load();
    item.id = nextId(collection);
    if (!d[collection]) d[collection] = [];
    d[collection].push(item);
    save();
    return item;
  },

  // Update an item by id
  update(collection, id, updates) {
    const d = load();
    const arr = d[collection] || [];
    const index = arr.findIndex(item => item.id === id);
    if (index === -1) return null;
    Object.assign(arr[index], updates);
    save();
    return arr[index];
  },

  // Delete an item by id
  delete(collection, id) {
    const d = load();
    const arr = d[collection] || [];
    const index = arr.findIndex(item => item.id === id);
    if (index === -1) return false;
    arr.splice(index, 1);
    save();
    return true;
  },

  // Count items
  count(collection, filter) {
    return this.all(collection, filter).length;
  },

  // Upsert a setting by key
  setSetting(key, value) {
    const d = load();
    const existing = d.settings.find(s => s.key === key);
    if (existing) {
      existing.value = value;
    } else {
      d.settings.push({ id: nextId('settings'), key, value });
    }
    save();
  },

  // Get a setting by key
  getSetting(key) {
    const d = load();
    const s = d.settings.find(s => s.key === key);
    return s ? s.value : null;
  },

  // Get all settings as key-value object
  getSettings() {
    const d = load();
    const result = {};
    for (const s of d.settings) {
      result[s.key] = s.value;
    }
    return result;
  },

  // Sort items by field
  allSorted(collection, field = 'sort_order', order = 'asc') {
    const items = this.all(collection);
    return items.sort((a, b) => {
      if (order === 'asc') return (a[field] || 0) - (b[field] || 0);
      return (b[field] || 0) - (a[field] || 0);
    });
  },

  // Get max value of a field
  max(collection, field) {
    const items = this.all(collection);
    if (items.length === 0) return 0;
    return Math.max(...items.map(item => item[field] || 0));
  }
};

module.exports = db;
