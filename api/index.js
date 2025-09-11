// api/index.js
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const db = require('./database');
const bcrypt = require('bcrypt');
const saltRounds = 10; // Cost factor for hashing

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- NEW Endpoints ---

// Endpoint for user login



// ... rest of the file
app.post('/api/login', (req, res) => {
  const { usercode, passcode } = req.body;
  if (!usercode || !passcode) {
    return res.status(400).json({ error: 'Usercode and passcode are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE usercode = ?').get(usercode);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  
  // --- THIS IS THE CORRECTED LOGIC ---
  // Compare the submitted passcode with the stored hash
  bcrypt.compare(passcode, user.passcode, (err, result) => {
    if (result) {
      // Passcode matches! Now check if they have voted.
      if (user.hasVoted) {
        return res.status(403).json({ error: 'This user has already voted.' });
      }
      // If everything is good, send success message
      res.status(200).json({ message: 'Login successful.' });

    } else {
      // Passcode does not match
      return res.status(401).json({ error: 'Invalid passcode.' });
    }
  });
});
// Endpoint to get the list of candidates
app.get('/api/candidates', (req, res) => {
  try {
    const candidates = db.prepare('SELECT name FROM candidates ORDER BY name ASC').all();
    res.json(candidates.map(c => c.name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- MODIFIED Endpoints ---

// Endpoint to get the entire blockchain (no changes)
app.get('/api/chain', (req, res) => {
  // ... (no changes needed here)
});

// MODIFIED endpoint to submit a new vote
app.post('/api/vote', (req, res) => {
  try {
    // Vote now requires usercode to prevent multiple votes
    const { usercode, candidate } = req.body;
    if (!usercode || !candidate) {
      return res.status(400).json({ error: 'Usercode and candidate are required.' });
    }

    // 1. Verify the user has not voted yet
    const user = db.prepare('SELECT hasVoted FROM users WHERE usercode = ?').get(usercode);
    if (!user || user.hasVoted) {
      return res.status(403).json({ error: 'User is not allowed to vote.' });
    }

    // 2. Get the last block to find its hash
    const lastBlock = db.prepare('SELECT hash FROM blocks ORDER BY id DESC LIMIT 1').get();
    
    // 3. Create and hash the new block
    const newBlockData = {
      timestamp: new Date().toISOString(),
      voteData: JSON.stringify({ voter: usercode, candidate: candidate }), // Updated payload
      previousHash: lastBlock.hash,
    };
    const newBlockHash = crypto.createHash('sha256').update(JSON.stringify(newBlockData)).digest('hex');

    // 4. Insert the new block into the database
    const stmt = db.prepare('INSERT INTO blocks (timestamp, voteData, previousHash, hash) VALUES (?, ?, ?, ?)');
    stmt.run(newBlockData.timestamp, newBlockData.voteData, newBlockData.previousHash, newBlockHash);
    
    // 5. CRITICAL: Update the user's status to prevent them from voting again
    db.prepare('UPDATE users SET hasVoted = 1 WHERE usercode = ?').run(usercode);

    res.status(201).json({ message: "Vote cast successfully!" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});