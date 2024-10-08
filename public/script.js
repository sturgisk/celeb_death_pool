let currentUser = '';
let names = [];

async function loginOrSignUp() {
    const username = document.getElementById('username').value.trim();
    if (username) {
        try {
            const response = await axios.get(`/api/users/${username}`);
            currentUser = response.data.username;
            names = response.data.names;
        } catch (error) {
            if (error.response && error.response.status === 404) {
                const signUpResponse = await axios.post('/api/users', { username });
                currentUser = signUpResponse.data.username;
                names = signUpResponse.data.names;
            } else {
                console.error('Error logging in:', error);
                alert('Error logging in: ' + (error.response?.data?.message || error.message));
                return;
            }
        }
        document.getElementById('loginForm').style.display = 'none';
        document.querySelector('.section-divider').style.display = 'none';
        document.getElementById('nameInput').style.display = 'block';
        document.getElementById('deleteAccountContainer').style.display = 'block';
        document.getElementById('userDisplay').textContent = currentUser;
        updateNameList();
        fetchAllUsers();
    } else {
        alert('Please enter a valid username.');
    }
}

async function addName() {
    const newName = document.getElementById('newName').value.trim();
    if (newName && names.length < 5) {
        try {
            const response = await axios.post('/api/names', { username: currentUser, name: newName, action: 'add' });
            names = response.data.names;
            document.getElementById('newName').value = '';
            updateNameList();
            fetchAllUsers();
        } catch (error) {
            console.error('Error adding name:', error);
            alert('Error adding name: ' + (error.response?.data?.message || error.message));
        }
    } else if (names.length >= 5) {
        alert('You can only add up to 5 names.');
    } else {
        alert('Please enter a valid name.');
    }
}

async function removeName(name) {
    try {
        const response = await axios.post('/api/names', { username: currentUser, name: name, action: 'remove' });
        names = response.data.names;
        updateNameList();
        fetchAllUsers();
    } catch (error) {
        console.error('Error removing name:', error);
        alert('Error removing name: ' + (error.response?.data?.message || error.message));
    }
}

function updateNameList() {
    const nameList = document.getElementById('nameList');
    nameList.innerHTML = `<h3>${currentUser}'s Names:</h3>`;
    if (names.length > 0) {
        const ul = document.createElement('ul');
        names.forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            const deleteIcon = document.createElement('span');
            deleteIcon.textContent = '✖';
            deleteIcon.className = 'delete-icon';
            deleteIcon.onclick = () => removeName(name);
            li.appendChild(deleteIcon);
            ul.appendChild(li);
        });
        nameList.appendChild(ul);
    } else {
        nameList.innerHTML += '<p>No names added yet.</p>';
    }
}

async function fetchAllUsers() {
    try {
        const response = await axios.get('/api/users');
        displayAllUsers(response.data);
    } catch (error) {
        console.error('Error fetching users:', error);
        alert('Error fetching users: ' + (error.response?.data?.message || error.message));
    }
}

function displayAllUsers(users) {
    const userList = document.getElementById('userList');
    userList.innerHTML = '';
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.innerHTML = `
            <h3>${user.username}</h3>
            <ul>
                ${user.names.map(name => `<li>${name}</li>`).join('')}
            </ul>
        `;
        userList.appendChild(userDiv);
    });
}

async function confirmDeleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        try {
            await axios.delete(`/api/users/${currentUser}`);
            alert('Account deleted successfully');
            // Reset the UI
            currentUser = '';
            names = [];
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('nameInput').style.display = 'none';
            document.getElementById('nameList').innerHTML = '';
            document.getElementById('username').value = '';
            fetchAllUsers();
        } catch (error) {
            console.error('Error deleting account:', error);
            alert('Error deleting account: ' + (error.response?.data?.message || error.message));
        }
    }
    document.getElementById('deleteAccountContainer').style.display = 'none';
}

async function searchAge() {
    const name = document.getElementById('newName').value;
    const ageDisplay = document.getElementById('ageDisplay');
    ageDisplay.textContent = '';

    if (!name) {
        ageDisplay.textContent = "Please enter a celebrity name.";
        return;
    }

    // Wikipedia API URL
    const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&origin=*`;

    try {
        const response = await axios.get(apiUrl);
        const pageId = response.data.query.search[0]?.pageid;

        if (pageId) {
            const pageDetailsUrl = `https://en.wikipedia.org/w/api.php?action=parse&pageid=${pageId}&prop=text&format=json&origin=*`;
            const detailsResponse = await axios.get(pageDetailsUrl);
            const htmlContent = detailsResponse.data.parse.text['*'];

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;

            const infobox = tempDiv.querySelector('.infobox');
            let exactAge = 'Age not found';

            if (infobox) {
                const rows = infobox.querySelectorAll('tr');
                rows.forEach(row => {
                    const header = row.querySelector('th');
                    const data = row.querySelector('td');
                    if (header && data) {
                        // Check for various formats of birth date
                        if (header.textContent.includes('Born')) {
                            const birthDate = data.textContent.match(/(\d{1,2} \w+ \d{4})|(\d{4}-\d{2}-\d{2})/);
                            if (birthDate) {
                                const birthDateObj = new Date(birthDate[0]);
                                const today = new Date();
                                let age = today.getFullYear() - birthDateObj.getFullYear();

                                // Adjust age if the birthday hasn't occurred yet this year
                                if (today.getMonth() < birthDateObj.getMonth() ||
                                    (today.getMonth() === birthDateObj.getMonth() && today.getDate() < birthDateObj.getDate())) {
                                    age--;
                                }

                                exactAge = age;
                            }
                        }
                    }
                });
            }

            ageDisplay.textContent = `${name} is ${exactAge} years old.`;
        } else {
            ageDisplay.textContent = "No results found for the given name.";
        }
    } catch (error) {
        console.error("Error fetching age:", error);
        ageDisplay.textContent = "Could not find age information. Please try again.";
    }
}

// Call fetchAllUsers when the page loads
fetchAllUsers();
