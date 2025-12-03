document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const votingSection = document.getElementById('voting-section');
    const successSection = document.getElementById('success-section');

    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const votingError = document.getElementById('voting-error');
    const voterNameSpan = document.getElementById('voter-name');
    const candidateList = document.getElementById('candidate-list');

    let currentUsercode = null;

    // --- Login Logic ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usercode = document.getElementById('usercode').value;
        const passcode = document.getElementById('passcode').value;

        loginError.classList.add('hidden');
        loginError.textContent = '';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usercode, passcode })
            });

            const data = await response.json();

            if (response.ok) {
                currentUsercode = usercode;
                voterNameSpan.textContent = usercode;
                showSection('voting');
                loadCandidates();
            } else {
                loginError.textContent = data.error || 'Login failed.';
                loginError.classList.remove('hidden');
            }
        } catch (err) {
            loginError.textContent = 'Network error.';
            loginError.classList.remove('hidden');
        }
    });

    // --- Load Candidates ---
    async function loadCandidates() {
        try {
            const response = await fetch('/api/candidates');
            const candidates = await response.json();

            candidateList.innerHTML = '';
            candidates.forEach(candidate => {
                const div = document.createElement('div');
                div.className = 'candidate-item';

                const span = document.createElement('span');
                span.textContent = candidate;

                const button = document.createElement('button');
                button.textContent = 'Vote';
                button.onclick = () => onVote(candidate);

                div.appendChild(span);
                div.appendChild(button);
                candidateList.appendChild(div);
            });
        } catch (err) {
            votingError.textContent = 'Failed to load candidates.';
            votingError.classList.remove('hidden');
        }
    }

    // --- Voting Logic ---
    async function onVote(candidate) {
        if (!currentUsercode) return;

        if (!confirm(`Are you sure you want to vote for ${candidate}?`)) {
            return;
        }

        try {
            const response = await fetch('/api/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usercode: currentUsercode, candidate })
            });

            const data = await response.json();

            if (response.ok) {
                showSection('success');
                startTimer(7);
            } else {
                votingError.textContent = data.error || 'Voting failed.';
                votingError.classList.remove('hidden');
            }
        } catch (err) {
            votingError.textContent = 'Network error.';
            votingError.classList.remove('hidden');
        }
    }

    // --- Timer Logic ---
    function startTimer(seconds) {
        const timerSpan = document.getElementById('timer');
        let remaining = seconds;
        timerSpan.textContent = remaining;

        const interval = setInterval(() => {
            remaining--;
            timerSpan.textContent = remaining;
            if (remaining <= 0) {
                clearInterval(interval);
                window.location.reload(); // Refresh the page as requested
            }
        }, 1000);
    }

    // --- Helper Functions ---
    function showSection(sectionName) {
        loginSection.classList.add('hidden');
        votingSection.classList.add('hidden');
        successSection.classList.add('hidden');

        if (sectionName === 'login') loginSection.classList.remove('hidden');
        if (sectionName === 'voting') votingSection.classList.remove('hidden');
        if (sectionName === 'success') successSection.classList.remove('hidden');
    }

    function resetSession() {
        currentUsercode = null;
        document.getElementById('usercode').value = '';
        document.getElementById('passcode').value = '';
        loginError.textContent = '';
        votingError.textContent = '';
        showSection('login');
    }
});
