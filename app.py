import os
import sqlite3
import json
import hashlib
import datetime
from flask import Flask, render_template, request, jsonify, g
import bcrypt

app = Flask(__name__)

# Vercel requires writing to /tmp in production (serverless)
if os.environ.get('VERCEL_ENV'):
    DB_PATH = os.path.join('/tmp', 'blockchain.db')
else:
    DB_PATH = 'blockchain.db'

# --- Database Helper Functions ---
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        cursor = db.cursor()
        
        # Create blocks table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS blocks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                voteData TEXT NOT NULL,
                previousHash TEXT NOT NULL,
                hash TEXT NOT NULL
            )
        ''')

        # Create users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                usercode TEXT PRIMARY KEY,
                passcode TEXT NOT NULL,
                hasVoted INTEGER DEFAULT 0
            )
        ''')

        # Create candidates table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS candidates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            )
        ''')
        
        db.commit()
        seed_data()

# --- Configuration ---
# EASILY MODIFY USERS HERE
# Define the users and their 4-digit passcodes.
# If you add a new user or change a passcode, you may need to delete 'blockchain.db' 
# for the changes to take effect if the user already exists.
USERS_CONFIG = [
    {"usercode": "reshma", "passcode": "1234"},
    {"usercode": "vanmathi", "passcode": "5678"},
    {"usercode": "amar", "passcode": "9894"},
    {"usercode": "divya", "passcode": "3456"},
    {"usercode": "matheu", "passcode": "7890"},
    {"usercode": "nicola", "passcode": "6969"}
]

def seed_data():
    db = get_db()
    cursor = db.cursor()

    # Seed Genesis Block
    cursor.execute('SELECT id FROM blocks WHERE id = 1')
    if not cursor.fetchone():
        genesis_block = {
            'timestamp': datetime.datetime.now().isoformat(),
            'voteData': json.dumps({'message': "Genesis Block"}),
            'previousHash': "0"
        }
        block_hash = hashlib.sha256(json.dumps(genesis_block, sort_keys=True).encode()).hexdigest()
        cursor.execute(
            'INSERT INTO blocks (timestamp, voteData, previousHash, hash) VALUES (?, ?, ?, ?)',
            (genesis_block['timestamp'], genesis_block['voteData'], genesis_block['previousHash'], block_hash)
        )
        print("Genesis Block Created.")

    # Seed Users from USERS_CONFIG
    print("Seeding users from configuration...")
    for user in USERS_CONFIG:
        # Check if user already exists
        cursor.execute('SELECT usercode FROM users WHERE usercode = ?', (user['usercode'],))
        if not cursor.fetchone():
            # Hash the passcode
            hashed_pw = bcrypt.hashpw(user['passcode'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            cursor.execute('INSERT INTO users (usercode, passcode) VALUES (?, ?)', (user['usercode'], hashed_pw))
            print(f"Added user: {user['usercode']}")
        else:
            # Optional: Update password if it changed? 
            # For simplicity in this dev environment, we'll skip updating existing users 
            # to avoid overwriting voting status unintentionally.
            # To reset a user, delete them from the DB or delete the DB file.
            pass

    # Seed Candidates
    cursor.execute('SELECT COUNT(*) as count FROM candidates')
    if cursor.fetchone()['count'] == 0:
        print("Seeding candidates...")
        candidates = [
            ('Julius Caesar',), ('Cleopatra',), ('Napoleon Bonaparte',), 
            ('Queen Elizabeth I',), ('Abraham Lincoln',), ('Winston Churchill',),
            ('Adolf Hitler',), ('Martin Luther King Jr.',), ('Joseph Stalin',)
        ]
        cursor.executemany('INSERT INTO candidates (name) VALUES (?)', candidates)
    
    db.commit()

# --- Routes ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    usercode = data.get('usercode')
    passcode = data.get('passcode')

    if not usercode or not passcode:
        return jsonify({'error': 'Usercode and passcode are required.'}), 400

    db = get_db()
    user = db.execute('SELECT * FROM users WHERE usercode = ?', (usercode,)).fetchone()

    if not user:
        return jsonify({'error': 'User not found.'}), 404

    if bcrypt.checkpw(passcode.encode('utf-8'), user['passcode'].encode('utf-8')):
        if user['hasVoted']:
            return jsonify({'error': 'This user has already voted.'}), 403
        return jsonify({'message': 'Login successful.'}), 200
    else:
        return jsonify({'error': 'Invalid passcode.'}), 401

@app.route('/api/candidates', methods=['GET'])
def get_candidates():
    db = get_db()
    candidates = db.execute('SELECT name FROM candidates ORDER BY name ASC').fetchall()
    return jsonify([c['name'] for c in candidates])

@app.route('/api/vote', methods=['POST'])
def vote():
    data = request.get_json()
    usercode = data.get('usercode')
    candidate = data.get('candidate')

    if not usercode or not candidate:
        return jsonify({'error': 'Usercode and candidate are required.'}), 400

    db = get_db()
    cursor = db.cursor()

    # 1. Verify user
    user = cursor.execute('SELECT hasVoted FROM users WHERE usercode = ?', (usercode,)).fetchone()
    if not user or user['hasVoted']:
        return jsonify({'error': 'User is not allowed to vote.'}), 403

    # 2. Get last block
    last_block = cursor.execute('SELECT hash FROM blocks ORDER BY id DESC LIMIT 1').fetchone()
    
    # 3. Create new block
    new_block_data = {
        'timestamp': datetime.datetime.now().isoformat(),
        'voteData': json.dumps({'voter': usercode, 'candidate': candidate}),
        'previousHash': last_block['hash']
    }
    # Sort keys to ensure consistent hashing
    new_block_hash = hashlib.sha256(json.dumps(new_block_data, sort_keys=True).encode()).hexdigest()

    # 4. Insert block
    cursor.execute(
        'INSERT INTO blocks (timestamp, voteData, previousHash, hash) VALUES (?, ?, ?, ?)',
        (new_block_data['timestamp'], new_block_data['voteData'], new_block_data['previousHash'], new_block_hash)
    )

    # 5. Update user status
    cursor.execute('UPDATE users SET hasVoted = 1 WHERE usercode = ?', (usercode,))
    db.commit()

    return jsonify({'message': "Vote cast successfully!"}), 201

@app.route('/api/chain', methods=['GET'])
def get_chain():
    db = get_db()
    chain = db.execute('SELECT * FROM blocks ORDER BY id ASC').fetchall()
    return jsonify([dict(row) for row in chain])

if __name__ == '__main__':
    if not os.path.exists(DB_PATH):
        init_db()
    else:
        # Re-run init to ensure tables exist if db file exists but is empty/corrupt
        init_db()
    app.run(debug=True, port=3000)
