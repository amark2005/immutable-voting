// api/hash-generator.js
const bcrypt = require('bcrypt');
const saltRounds = 10;

// This is your master list of voters and their passcodes
const voters = [
  { usercode: 'amar47', passcode: '8008' },
  { usercode: 'reshma', passcode: '8925' },
  { usercode: 'vanmathi', passcode: '8438' },
  { usercode: 'divya', passcode: '9363' },
  { usercode: 'matheu', passcode: '6969' },
  // Add more voters here as needed
];

console.log('--- Generating Hashes for database.js ---');

voters.forEach(voter => {
  bcrypt.hash(voter.passcode, saltRounds, (err, hash) => {
    if (err) {
      console.error('Error hashing for', voter.usercode);
    } else {
      // This line generates the code you will copy-paste
      console.log(`insertUser.run('${voter.usercode}', '${hash}');`);
    }
  });
});