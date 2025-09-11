// api/database.js
const path = require('path');
const Database = require('better-sqlite3');
const crypto = require('crypto');


// Create the blocks table (no changes here)
db.exec(`
  CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    voteData TEXT NOT NULL,
    previousHash TEXT NOT NULL,
    hash TEXT NOT NULL
  )
`);

// NEW: Create the users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    usercode TEXT PRIMARY KEY,
    passcode TEXT NOT NULL,
    hasVoted INTEGER DEFAULT 0 -- 0 for false, 1 for true
  )
`);

// NEW: Create the candidates table
db.exec(`
  CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )
`);

// --- Data Seeding ---
const dbPath = process.env.VERCEL_ENV === 'production' 
  ? path.join('/tmp', 'blockchain.db') 
  : 'blockchain.db';

const db = new Database(dbPath);
console.log(`Database initialized at: ${dbPath}`);
// Create the Genesis Block if needed (no changes here)
const genesisBlockExists = db.prepare('SELECT id FROM blocks WHERE id = 1').get();
if (!genesisBlockExists) {
  // ... (keep existing genesis block code)
  const genesisBlock = {
    timestamp: new Date().toISOString(),
    voteData: JSON.stringify({ message: "Genesis Block" }),
    previousHash: "0",
  };
  const hash = crypto.createHash('sha256').update(JSON.stringify(genesisBlock)).digest('hex');
  db.prepare(
    'INSERT INTO blocks (timestamp, voteData, previousHash, hash) VALUES (?, ?, ?, ?)'
  ).run(genesisBlock.timestamp, genesisBlock.voteData, genesisBlock.previousHash, hash);
  console.log('Genesis Block Created.');
}


// NEW: Add some sample users if the table is empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (userCount === 0) {
  console.log('Seeding users...');
  const insertUser = db.prepare('INSERT INTO users (usercode, passcode) VALUES (?, ?)');
  // In a real app, HASH your passcodes! For this demo, we store them as plain text.
insertUser.run('reshma', '$2b$10$CYzBDQtaEGukdEi37n8YL.Dt8pnI8KQgAcoCCqUbtdo7PTkSLOZRK');
insertUser.run('vanmathi', '$2b$10$1rDHn6ANO4OP5u6cBrsIw.6nLcYnpoF2Z9Clf/UMnScNBAV7MdAuC');
insertUser.run('amar47', '$2b$10$9IhPe5S0Y27s5VS/zWL/R.sjeh.jqkpXyp3UFiihVBIBD6YEGmZbS');
insertUser.run('divya', '$2b$10$cDpnYbcG1ioiGT6UZjO.r.6yL4pntv/sFE4odO11jrBpr.j9G/pN2');
insertUser.run('matheu', '$2b$10$XPuwsBLca4jt2Q3ntBEIau5XwKGyMA4rahdKuUhQE6xVnTrid1bWe');
}

// NEW: Add some sample candidates if the table is empty
const candidateCount = db.prepare('SELECT COUNT(*) as count FROM candidates').get().count;
if (candidateCount === 0) {
  console.log('Seeding candidates...');
  const insertCandidate = db.prepare('INSERT INTO candidates (name) VALUES (?)');
  insertCandidate.run('Trump');
  insertCandidate.run('Modi');
  insertCandidate.run('Lewis Hamilton');
  insertCandidate.run('Vijay Antony');
  insertCandidate.run('Motta Rajendran');
  insertCandidate.run('Upendra');
}

module.exports = db;