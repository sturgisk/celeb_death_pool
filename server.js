require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 80; // temporary set until SSL certs
// const port = process.env.PORT || 8443; 

// MongoDB Atlas connection string from environment variable
const mongoURI = process.env.MONGODB_URI;


mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('Error connecting to MongoDB Atlas:', err));

// Create User model
const User = mongoose.model('User', {
    username: String,
    names: [String]
});

app.use(bodyParser.json());

// Add this middleware to log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve static files
const publicPath = path.join(__dirname, 'public');
console.log('Public directory path:', publicPath);
app.use(express.static(publicPath));


// API routes
app.post('/api/users', async (req, res) => {
    try {
        const { username } = req.body;
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        user = new User({ username, names: [] });
        await user.save();
        res.json(user);
    } catch (error) {
        console.error('Error in /api/users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Modify the existing /api/names route to handle both adding and removing names
app.post('/api/names', async (req, res) => {
    try {
        const { username, name, action } = req.body;
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (action === 'add') {
            if (user.names.length >= 5) {
                return res.status(400).json({ message: 'Maximum number of names reached' });
            }
            user.names.push(name);
        } else if (action === 'remove') {
            const index = user.names.indexOf(name);
            if (index > -1) {
                user.names.splice(index, 1);
            }
        }
        
        await user.save();
        res.json(user);
    } catch (error) {
        console.error('Error in /api/names:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add this new route to your existing routes
app.delete('/api/users/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const result = await User.deleteOne({ username });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add a new route to get a single user's data
app.get('/api/users/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add this new route to fetch all users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, 'username names');
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Main route to serve index.html
app.get('/', (req, res) => {
    console.log('Main route hit');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});