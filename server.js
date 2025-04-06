// SERVER CODE (Node.js with Express)
// File: server.js

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve the frontend

// Simple in-memory database (replace with a real database in production)
let qrCodesDB = {};

// Make sure our data directory exists
const dataDir = path.join(__dirname, 'data');
const setupDataDir = async () => {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    
    // Try to load existing data
    try {
      const data = await fs.readFile(path.join(dataDir, 'qrcodes.json'), 'utf8');
      qrCodesDB = JSON.parse(data);
    } catch (err) {
      // If file doesn't exist, start with empty DB
      await fs.writeFile(path.join(dataDir, 'qrcodes.json'), JSON.stringify(qrCodesDB));
    }
  } catch (err) {
    console.error('Error setting up data directory:', err);
  }
};

// Save database to file
const saveDB = async () => {
  try {
    await fs.writeFile(
      path.join(dataDir, 'qrcodes.json'), 
      JSON.stringify(qrCodesDB), 
      'utf8'
    );
  } catch (err) {
    console.error('Error saving database:', err);
  }
};

// API: Create a new QR code
app.post('/api/qrcodes', async (req, res) => {
  try {
    const { title, instructions } = req.body;
    
    if (!title || !instructions) {
      return res.status(400).json({ error: 'Title and instructions are required' });
    }
    
    const qrId = uuidv4();
    const timestamp = new Date().toISOString();
    
    qrCodesDB[qrId] = {
      id: qrId,
      title,
      instructions,
      created: timestamp
    };
    
    await saveDB();
    
    res.status(201).json({
      id: qrId,
      title,
      instructions,
      created: timestamp,
      url: `/view/${qrId}`
    });
  } catch (err) {
    console.error('Error creating QR code:', err);
    res.status(500).json({ error: 'Failed to create QR code' });
  }
});

// API: Get all QR codes
app.get('/api/qrcodes', (req, res) => {
  const qrCodes = Object.values(qrCodesDB);
  res.json(qrCodes);
});

// API: Get a specific QR code
app.get('/api/qrcodes/:id', (req, res) => {
  const qrCode = qrCodesDB[req.params.id];
  
  if (!qrCode) {
    return res.status(404).json({ error: 'QR code not found' });
  }
  
  res.json(qrCode);
});

// API: Delete a QR code
app.delete('/api/qrcodes/:id', async (req, res) => {
  const qrId = req.params.id;
  
  if (!qrCodesDB[qrId]) {
    return res.status(404).json({ error: 'QR code not found' });
  }
  
  delete qrCodesDB[qrId];
  await saveDB();
  
  res.json({ message: 'QR code deleted successfully' });
});

// Route to serve the instruction view page
app.get('/view/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize and start server
(async () => {
  await setupDataDir();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the app at http://localhost:${PORT}`);
  });
})();