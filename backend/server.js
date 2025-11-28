require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { sendEmailsToAll } = require('./utils/emailService');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'data', 'people.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Helper function to read data
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { people: [] };
  }
}

// Helper function to write data
async function writeData(data) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// Get all people
app.get('/api/people', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.people);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get person by unique link
app.get('/api/person/:linkId', async (req, res) => {
  try {
    const data = await readData();
    const person = data.people.find(p => p.linkId === req.params.linkId);
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.json(person);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Draw assignments (shuffle and assign)
app.post('/api/draw', async (req, res) => {
  try {
    const data = await readData();
    const people = [...data.people];
    
    if (people.length < 2) {
      return res.status(400).json({ error: 'Potrzeba co najmniej 2 osób do losowania' });
    }

    // Shuffle array
    const shuffled = [...people];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Assign each person to the next one (circular)
    for (let i = 0; i < shuffled.length; i++) {
      const currentPerson = people.find(p => p.id === shuffled[i].id);
      const assignedPerson = shuffled[(i + 1) % shuffled.length];
      currentPerson.assignedTo = {
        id: assignedPerson.id,
        name: assignedPerson.name,
        wants: assignedPerson.wants || ''
      };
    }

    await writeData({ people });
    
    // Send emails if SMTP is configured
    let emailResults = [];
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const baseUrl = process.env.BASE_URL || req.protocol + '://' + req.get('host');
      try {
        emailResults = await sendEmailsToAll(people, baseUrl);
        console.log('Email sending results:', emailResults);
      } catch (emailError) {
        console.error('Error sending emails:', emailError);
        // Don't fail the request if emails fail
      }
    }
    
    res.json({ success: true, people, emailResults });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add person
app.post('/api/people', async (req, res) => {
  try {
    const { name, wants, email } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const data = await readData();
    const newPerson = {
      id: uuidv4(),
      name: name.trim(),
      wants: wants ? wants.trim() : '',
      email: email ? email.trim() : '',
      linkId: uuidv4(),
      assignedTo: null
    };

    data.people.push(newPerson);
    await writeData(data);
    res.json(newPerson);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update person wants
app.put('/api/people/:id/wants', async (req, res) => {
  try {
    const { wants } = req.body;
    const data = await readData();
    const person = data.people.find(p => p.id === req.params.id);
    
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    person.wants = wants ? wants.trim() : '';
    await writeData(data);
    res.json(person);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete person
app.delete('/api/people/:id', async (req, res) => {
  try {
    const data = await readData();
    data.people = data.people.filter(p => p.id !== req.params.id);
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset assignments
app.post('/api/reset', async (req, res) => {
  try {
    const data = await readData();
    data.people.forEach(person => {
      person.assignedTo = null;
    });
    await writeData(data);
    res.json({ success: true, people: data.people });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

