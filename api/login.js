// MODIFIED: /api/login endpoint
app.post('/api/login', (req, res) => {
  const { usercode, passcode } = req.body;
  // ... input validation

  const user = db.prepare('SELECT * FROM users WHERE usercode = ?').get(usercode);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  
  // Compare the submitted passcode with the stored hash
  bcrypt.compare(passcode, user.passcode, (err, result) => {
    if (result) {
      // Passcode matches
      if (user.hasVoted) {
        return res.status(403).json({ error: 'This user has already voted.' });
      }
      res.status(200).json({ message: 'Login successful.' });
    } else {
      // Passcode does not match
      return res.status(401).json({ error: 'Invalid passcode.' });
    }
  });
});