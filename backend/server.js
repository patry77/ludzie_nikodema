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
const MENU_FILE = path.join(__dirname, 'data', 'menu.json');
const AIRBNB_FILE = path.join(__dirname, 'data', 'airbnb.json');
const VOTES_FILE = path.join(__dirname, 'data', 'votes.json');
const VOTERS_FILE = path.join(__dirname, 'data', 'voters.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.use('/uploads', express.static(UPLOADS_DIR));

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

// Helper function to read menu data
async function readMenuData() {
  try {
    const data = await fs.readFile(MENU_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { items: [], message: 'Zobacz, co przygotowaliśmy na wigilijny stół!' };
  }
}

// Helper function to write menu data
async function writeMenuData(data) {
  await fs.mkdir(path.dirname(MENU_FILE), { recursive: true });
  await fs.writeFile(MENU_FILE, JSON.stringify(data, null, 2));
}


// Helper function to read airbnb data
async function readAirbnbData() {
  try {
    const data = await fs.readFile(AIRBNB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { objects: [] };
  }
}

// Helper function to write airbnb data
async function writeAirbnbData(data) {
  await fs.mkdir(path.dirname(AIRBNB_FILE), { recursive: true });
  await fs.writeFile(AIRBNB_FILE, JSON.stringify(data, null, 2));
}

// Helper function to read votes data
async function readVotesData() {
  try {
    const data = await fs.readFile(VOTES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { votes: [] };
  }
}

// Helper function to write votes data
async function writeVotesData(data) {
  await fs.mkdir(path.dirname(VOTES_FILE), { recursive: true });
  await fs.writeFile(VOTES_FILE, JSON.stringify(data, null, 2));
}

// Helper function to read voters (names) data
async function readVotersData() {
  try {
    const data = await fs.readFile(VOTERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { names: [] };
  }
}

// Helper function to write voters (names) data
async function writeVotersData(data) {
  await fs.mkdir(path.dirname(VOTERS_FILE), { recursive: true });
  await fs.writeFile(VOTERS_FILE, JSON.stringify(data, null, 2));
}

// Helper function to get client identifier for voting protection
function getClientId(req) {
  const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  // Create a hash-like identifier (simplified)
  return `${ip}-${userAgent}`.substring(0, 100);
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

// All emails a person must not draw: legacy single `excludeEmail` + list `excludeEmails` (lowercased, unique)
function getExcludedEmails(person) {
  const list = [];
  if (person.excludeEmail) list.push(person.excludeEmail);
  if (Array.isArray(person.excludeEmails)) list.push(...person.excludeEmails);
  return [...new Set(list.filter(Boolean).map(e => String(e).trim().toLowerCase()))];
}

// Function to generate draw preview (without saving)
function generateDrawPreview(people) {
  // Function to check if assignment is valid (respects exclusions)
  const isValidAssignment = (person, assignedPerson) => {
    // Person cannot be assigned to themselves
    if (person.id === assignedPerson.id) {
      return false;
    }
    // Check if the assigned person's email is on the person's exclusion list
    if (assignedPerson.email) {
      const assignedEmail = assignedPerson.email.trim().toLowerCase();
      if (getExcludedEmails(person).includes(assignedEmail)) {
        return false;
      }
    }
    return true;
  };

  // Try to find valid assignments (with retries)
  let maxAttempts = 100;
  let validAssignment = false;
  let shuffled = [];

  while (!validAssignment && maxAttempts > 0) {
    // Shuffle array
    shuffled = [...people];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Check if circular assignment is valid
    validAssignment = true;
    for (let i = 0; i < shuffled.length; i++) {
      const currentPerson = shuffled[i];
      const assignedPerson = shuffled[(i + 1) % shuffled.length];
      if (!isValidAssignment(currentPerson, assignedPerson)) {
        validAssignment = false;
        break;
      }
    }
    maxAttempts--;
  }

  if (!validAssignment) {
    return null;
  }

  // Create preview assignments
  const preview = [];
  for (let i = 0; i < shuffled.length; i++) {
    const currentPerson = shuffled[i];
    const assignedPerson = shuffled[(i + 1) % shuffled.length];
    preview.push({
      personId: currentPerson.id,
      personName: currentPerson.name,
      assignedId: assignedPerson.id,
      assignedName: assignedPerson.name,
      assignedWants: assignedPerson.wants || ''
    });
  }

  return preview;
}

// Draw assignments preview (without saving)
app.post('/api/draw-preview', async (req, res) => {
  try {
    const data = await readData();
    const people = [...data.people];
    
    if (people.length < 2) {
      return res.status(400).json({ error: 'Potrzeba co najmniej 2 osób do losowania' });
    }

    const preview = generateDrawPreview(people);
    
    if (!preview) {
      return res.status(400).json({ 
        error: 'Nie można utworzyć prawidłowego przypisania z uwzględnieniem wykluczeń. Spróbuj zmienić wykluczenia lub dodać więcej osób.' 
      });
    }
    
    res.json({ success: true, preview });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Confirm and save draw assignments
app.post('/api/draw-confirm', async (req, res) => {
  try {
    const { preview } = req.body;
    
    if (!preview || !Array.isArray(preview)) {
      return res.status(400).json({ error: 'Invalid preview data' });
    }

    const data = await readData();
    const people = [...data.people];
    
    if (people.length < 2) {
      return res.status(400).json({ error: 'Potrzeba co najmniej 2 osób do losowania' });
    }

    // Apply assignments from preview
    preview.forEach(previewItem => {
      const person = people.find(p => p.id === previewItem.personId);
      const assignedPerson = people.find(p => p.id === previewItem.assignedId);
      
      if (person && assignedPerson) {
        person.assignedTo = {
          id: assignedPerson.id,
          name: assignedPerson.name,
          wants: assignedPerson.wants || ''
        };
      }
    });

    await writeData({ people });
    
    // Send emails if SMTP is configured
    let emailResults = [];
    if (process.env.SMTP_HOST) {
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

// Draw assignments (shuffle and assign with exclusions) - DEPRECATED, use draw-preview + draw-confirm
app.post('/api/draw', async (req, res) => {
  try {
    const data = await readData();
    const people = [...data.people];
    
    if (people.length < 2) {
      return res.status(400).json({ error: 'Potrzeba co najmniej 2 osób do losowania' });
    }

    const preview = generateDrawPreview(people);
    
    if (!preview) {
      return res.status(400).json({ 
        error: 'Nie można utworzyć prawidłowego przypisania z uwzględnieniem wykluczeń. Spróbuj zmienić wykluczenia lub dodać więcej osób.' 
      });
    }

    // Apply assignments from preview
    preview.forEach(previewItem => {
      const person = people.find(p => p.id === previewItem.personId);
      const assignedPerson = people.find(p => p.id === previewItem.assignedId);
      
      if (person && assignedPerson) {
        person.assignedTo = {
          id: assignedPerson.id,
          name: assignedPerson.name,
          wants: assignedPerson.wants || ''
        };
      }
    });

    await writeData({ people });
    
    // Send emails if SMTP is configured
    let emailResults = [];
    if (process.env.SMTP_HOST) {
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

// Email validation helper
function isValidEmail(email) {
  if (!email) return true; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// Add person
app.post('/api/people', async (req, res) => {
  try {
    const { name, wants, email, excludeEmail } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (excludeEmail && !isValidEmail(excludeEmail)) {
      return res.status(400).json({ error: 'Invalid exclude email format' });
    }

    const data = await readData();
    
    // Check for duplicate names
    const duplicate = data.people.find(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (duplicate) {
      return res.status(400).json({ error: 'Person with this name already exists' });
    }

    // Check if excludeEmail exists in people list
    if (excludeEmail) {
      const excludePerson = data.people.find(p => p.email && p.email.toLowerCase() === excludeEmail.trim().toLowerCase());
      if (!excludePerson) {
        return res.status(400).json({ error: 'Osoba o podanym emailu do wykluczenia nie istnieje na liście' });
      }
    }

    const newPerson = {
      id: uuidv4(),
      name: name.trim(),
      wants: wants ? wants.trim() : '',
      email: email ? email.trim() : '',
      excludeEmail: excludeEmail ? excludeEmail.trim() : '',
      linkId: uuidv4(),
      assignedTo: null
    };

    data.people.push(newPerson);
    await writeData(data);
    res.json(newPerson);
  } catch (error) {
    console.error('Error adding person:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Public sign-up form (/mikolajki): name, optional email and wish list.
// Deliberately has NO excludeEmail field and never returns linkId/email - the admin manages exclusions.
const joinAttempts = new Map(); // ip -> [timestamps]
const JOIN_WINDOW_MS = 10 * 60 * 1000;
const JOIN_MAX_PER_WINDOW = 10;

app.post('/api/mikolajki/join', async (req, res) => {
  try {
    const now = Date.now();
    const ip = req.ip || 'unknown';
    const recent = (joinAttempts.get(ip) || []).filter(t => now - t < JOIN_WINDOW_MS);
    if (recent.length >= JOIN_MAX_PER_WINDOW) {
      return res.status(429).json({ error: 'Zbyt wiele prób. Spróbuj ponownie za kilka minut.' });
    }
    recent.push(now);
    joinAttempts.set(ip, recent);

    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const wants = typeof req.body.wants === 'string' ? req.body.wants.trim() : '';

    if (!name) {
      return res.status(400).json({ error: 'Podaj swoje imię.' });
    }
    if (name.length > 60) {
      return res.status(400).json({ error: 'Imię jest za długie (max 60 znaków).' });
    }
    if (wants.length > 500) {
      return res.status(400).json({ error: 'Opis prezentu jest za długi (max 500 znaków).' });
    }
    if (email && !isValidEmail(email)) {
      return res.status(400).json({ error: 'Niepoprawny format adresu email.' });
    }

    const data = await readData();

    if (data.people.some(p => p.assignedTo)) {
      return res.status(409).json({ error: 'Losowanie już się odbyło – zgłoś się do organizatora.' });
    }
    if (data.people.some(p => p.name.trim().toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: 'Osoba o takim imieniu jest już na liście.' });
    }

    const newPerson = {
      id: uuidv4(),
      name,
      wants,
      email,
      excludeEmail: '',
      linkId: uuidv4(),
      assignedTo: null
    };
    data.people.push(newPerson);
    await writeData(data);
    res.json({ success: true, name: newPerson.name });
  } catch (error) {
    console.error('Error in public join:', error);
    res.status(500).json({ error: 'Błąd serwera. Spróbuj ponownie.' });
  }
});

// Edit a person (admin): name, email, wishes and the list of people they must not draw
app.put('/api/people/:id', async (req, res) => {
  try {
    const { name, email, wants, excludeEmails } = req.body;
    const data = await readData();
    const person = data.people.find(p => p.id === req.params.id);
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const newName = typeof name === 'string' ? name.trim() : person.name;
    const newEmail = typeof email === 'string' ? email.trim() : (person.email || '');
    const newWants = typeof wants === 'string' ? wants.trim() : (person.wants || '');

    if (!newName) {
      return res.status(400).json({ error: 'Imię jest wymagane' });
    }
    if (newEmail && !isValidEmail(newEmail)) {
      return res.status(400).json({ error: 'Niepoprawny format adresu email' });
    }
    if (data.people.some(p => p.id !== person.id && p.name.trim().toLowerCase() === newName.toLowerCase())) {
      return res.status(400).json({ error: 'Osoba o takim imieniu już istnieje' });
    }
    if (newEmail && data.people.some(p => p.id !== person.id && p.email && p.email.trim().toLowerCase() === newEmail.toLowerCase())) {
      return res.status(400).json({ error: 'Ten adres email ma już inna osoba' });
    }

    let newExcludes = getExcludedEmails(person);
    if (Array.isArray(excludeEmails)) {
      newExcludes = [...new Set(excludeEmails.map(e => String(e).trim().toLowerCase()).filter(Boolean))];
      for (const ex of newExcludes) {
        if (!isValidEmail(ex)) {
          return res.status(400).json({ error: `Niepoprawny email do wykluczenia: ${ex}` });
        }
        if (ex === newEmail.toLowerCase()) {
          return res.status(400).json({ error: 'Osoba nie może wykluczyć samej siebie' });
        }
        if (!data.people.some(p => p.id !== person.id && p.email && p.email.trim().toLowerCase() === ex)) {
          return res.status(400).json({ error: `Na liście nie ma osoby z emailem ${ex}` });
        }
      }
    }

    person.name = newName;
    person.email = newEmail;
    person.wants = newWants;
    person.excludeEmails = newExcludes;
    person.excludeEmail = newExcludes[0] || ''; // keep legacy field in sync
    await writeData(data);
    res.json(person);
  } catch (error) {
    console.error('Error editing person:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
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

// Update person excludeEmail
app.put('/api/people/:id/exclude', async (req, res) => {
  try {
    const { excludeEmail } = req.body;
    const data = await readData();
    const person = data.people.find(p => p.id === req.params.id);
    
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    if (excludeEmail && !isValidEmail(excludeEmail)) {
      return res.status(400).json({ error: 'Invalid exclude email format' });
    }

    // Check if excludeEmail exists in people list
    if (excludeEmail) {
      const excludePerson = data.people.find(p => p.email && p.email.toLowerCase() === excludeEmail.trim().toLowerCase());
      if (!excludePerson) {
        return res.status(400).json({ error: 'Osoba o podanym emailu do wykluczenia nie istnieje na liście' });
      }
    }

    person.excludeEmail = excludeEmail ? excludeEmail.trim() : '';
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

// Clear all people
app.delete('/api/people', async (req, res) => {
  try {
    await writeData({ people: [] });
    res.json({ success: true, message: 'Wszystkie osoby zostały usunięte' });
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

// Send test email
app.post('/api/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    if (!process.env.SMTP_HOST) {
      return res.status(400).json({ error: 'SMTP is not configured' });
    }

    const { sendEmail } = require('./utils/emailService');
    const baseUrl = process.env.BASE_URL || 'https://ludzienikodema.com.pl';
    
    // Create test person and assigned person
    const testPerson = {
      name: 'Test',
      email: email,
      linkId: 'test-link-id'
    };
    
    const testAssigned = {
      name: 'Testowa Osoba',
      wants: 'To jest testowy email. Jeśli go otrzymałeś/aś, oznacza to że system wysyłania maili działa poprawnie!'
    };

    const result = await sendEmail(testPerson, testAssigned, baseUrl);
    
    if (result.success) {
      res.json({ success: true, message: 'Test email sent successfully', messageId: result.messageId });
    } else {
      res.status(500).json({ error: result.error || 'Failed to send test email' });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// ==================== MENU ENDPOINTS ====================

// Get all menu items
app.get('/api/menu', async (req, res) => {
  try {
    const data = await readMenuData();
    res.json({
      items: data.items || [],
      message: data.message || 'Zobacz, co przygotowaliśmy na wigilijny stół!'
    });
  } catch (error) {
    console.error('Error reading menu:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add menu item
app.post('/api/menu', async (req, res) => {
  try {
    const { dishName, madeBy, description, image, category, imagePosition } = req.body;
    
    if (!dishName || !madeBy) {
      return res.status(400).json({ error: 'Nazwa dania i osoba są wymagane' });
    }

    const validCategories = ['dania', 'przekąski', 'napoje', 'alkohole'];
    const itemCategory = category && validCategories.includes(category) ? category : 'dania';
    
    const validPositions = ['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'];
    const itemImagePosition = imagePosition && validPositions.includes(imagePosition) ? imagePosition : 'center';

    const data = await readMenuData();
    const items = data.items || [];
    
    const newItem = {
      id: uuidv4(),
      dishName: dishName.trim(),
      madeBy: madeBy.trim(),
      description: description ? description.trim() : '',
      image: image || null, // Base64 image or URL
      imagePosition: itemImagePosition,
      category: itemCategory,
      createdAt: new Date().toISOString()
    };
    
    items.push(newItem);
    await writeMenuData({ 
      items,
      message: data.message || 'Zobacz, co przygotowaliśmy na wigilijny stół!'
    });
    
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error adding menu item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update menu item
app.put('/api/menu/:id', async (req, res) => {
  try {
    const { dishName, madeBy, description, image, category, imagePosition } = req.body;
    
    if (!dishName || !madeBy) {
      return res.status(400).json({ error: 'Nazwa dania i osoba są wymagane' });
    }

    const validCategories = ['dania', 'przekąski', 'napoje', 'alkohole'];
    const itemCategory = category && validCategories.includes(category) ? category : 'dania';

    const data = await readMenuData();
    const items = data.items || [];
    const itemIndex = items.findIndex(item => item.id === req.params.id);
    
    const validPositions = ['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'];
    const itemImagePosition = imagePosition && validPositions.includes(imagePosition) ? imagePosition : (items[itemIndex]?.imagePosition || 'center');

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Pozycja menu nie została znaleziona' });
    }

    items[itemIndex] = {
      ...items[itemIndex],
      dishName: dishName.trim(),
      madeBy: madeBy.trim(),
      description: description ? description.trim() : '',
      image: image || null,
      imagePosition: itemImagePosition,
      category: itemCategory,
    };

    await writeMenuData({
      items,
      message: data.message || 'Zobacz, co przygotowaliśmy na wigilijny stół!'
    });

    res.json(items[itemIndex]);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete menu item
app.delete('/api/menu/:id', async (req, res) => {
  try {
    const data = await readMenuData();
    const items = (data.items || []).filter(item => item.id !== req.params.id);
    await writeMenuData({ 
      items,
      message: data.message || 'Zobacz, co przygotowaliśmy na wigilijny stół!'
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update existing menu items to have category "dania" if missing
app.post('/api/menu/migrate-categories', async (req, res) => {
  try {
    const data = await readMenuData();
    const items = (data.items || []).map(item => {
      if (!item.category) {
        return { ...item, category: 'dania' };
      }
      return item;
    });
    await writeMenuData({ 
      items,
      message: data.message || 'Zobacz, co przygotowaliśmy na wigilijny stół!'
    });
    res.json({ success: true, updated: items.length });
  } catch (error) {
    console.error('Error migrating categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update menu message
app.put('/api/menu/message', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Wiadomość jest wymagana' });
    }

    const data = await readMenuData();
    await writeMenuData({ 
      items: data.items || [],
      message: message.trim()
    });
    
    res.json({ success: true, message: message.trim() });
  } catch (error) {
    console.error('Error updating menu message:', error);
    res.status(500).json({ error: error.message });
  }
});


// Get all Airbnb objects
app.get('/api/airbnb', async (req, res) => {
  try {
    const data = await readAirbnbData();
    const votesData = await readVotesData();
    
    // Get number of voters for price calculation
    const votersData = await readVotersData();
    const votersCount = (votersData.names || []).length;
    
    const objects = (data.objects || []).map(obj => {
      const votes = (votesData.votes || []).filter(v => v.objectId === obj.id);
      const pricePerPerson = obj.price && votersCount > 0 
        ? parseFloat((obj.price / votersCount).toFixed(2))
        : obj.pricePerPerson;
      
      return {
        ...obj,
        votesCount: votes.length,
        pricePerPerson: pricePerPerson
      };
    });
    
    res.json({ objects });
  } catch (error) {
    console.error('Error reading Airbnb objects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add Airbnb object (admin only - should be protected by password)
app.post('/api/airbnb', async (req, res) => {
  try {
    const { embedCode, pros, cons, price, pricePerPerson, country } = req.body;
    
    if (!embedCode) {
      return res.status(400).json({ error: 'Kod embed jest wymagany' });
    }

    // Extract URL from embedCode if it's HTML with iframe
    let url = '';
    let name = '';
    let imageUrl = '';
    
    // Try to extract URL from iframe src
    const iframeMatch = embedCode.match(/<iframe[^>]*src=["']([^"']+)["']/i);
    if (iframeMatch) {
      url = iframeMatch[1];
    } else {
      // Try to extract URL from href (Airbnb embed uses href in links)
      const hrefMatches = embedCode.match(/href=["']([^"']*airbnb[^"']*)["']/gi);
      if (hrefMatches && hrefMatches.length > 0) {
        // Get the first href that contains airbnb
        url = hrefMatches[0].replace(/href=["']/i, '').replace(/["']$/, '').replace(/&amp;/g, '&');
      } else {
        // Try to extract from data-id and build URL
        const dataIdMatch = embedCode.match(/data-id=["'](\d+)["']/i);
        if (dataIdMatch) {
          const roomId = dataIdMatch[1];
          url = `https://www.airbnb.pl/rooms/${roomId}`;
        } else {
          // Try to extract from data-url
          const dataUrlMatch = embedCode.match(/data-url=["']([^"']+)["']/i);
          if (dataUrlMatch) {
            url = dataUrlMatch[1];
          } else {
            // Try to find any Airbnb URL in the embed code
            const urlMatch = embedCode.match(/(https?:\/\/[^\s"']*airbnb[^\s"']*)/i);
            if (urlMatch) {
              url = urlMatch[1].replace(/&amp;/g, '&');
            }
          }
        }
      }
    }

    // Remove duplicate script tag from embedCode (script is already in index.html)
    let cleanEmbedCode = embedCode.trim();
    // Remove the script tag that loads airbnb_jssdk from embed
    cleanEmbedCode = cleanEmbedCode.replace(/<script[^>]*airbnb_jssdk[^>]*><\/script>/gi, '');

    const data = await readAirbnbData();
    const objects = data.objects || [];
    
    const newObject = {
      id: uuidv4(),
      name: name || '',
      url: url || '',
      embedCode: cleanEmbedCode,
      imageUrl: imageUrl || '',
      pros: pros ? (Array.isArray(pros) ? pros : [pros]).filter(p => p.trim()) : [],
      cons: cons ? (Array.isArray(cons) ? cons : [cons]).filter(c => c.trim()) : [],
      price: price ? parseFloat(price) : null,
      pricePerPerson: pricePerPerson ? parseFloat(pricePerPerson) : null,
      country: country ? country.trim() : '',
      createdAt: new Date().toISOString()
    };
    
    objects.push(newObject);
    await writeAirbnbData({ objects });
    
    res.status(201).json(newObject);
  } catch (error) {
    console.error('Error adding Airbnb object:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Airbnb object
app.put('/api/airbnb/:id', async (req, res) => {
  try {
    const { embedCode, pros, cons, price, pricePerPerson, country } = req.body;
    
    const data = await readAirbnbData();
    const objects = data.objects || [];
    const objectIndex = objects.findIndex(obj => obj.id === req.params.id);
    
    if (objectIndex === -1) {
      return res.status(404).json({ error: 'Obiekt nie znaleziony' });
    }

    // Extract URL from embedCode if provided
    let url = objects[objectIndex].url || '';
    if (embedCode) {
      const iframeMatch = embedCode.match(/<iframe[^>]*src=["']([^"']+)["']/i);
      if (iframeMatch) {
        url = iframeMatch[1];
      } else {
        const hrefMatches = embedCode.match(/href=["']([^"']*airbnb[^"']*)["']/gi);
        if (hrefMatches && hrefMatches.length > 0) {
          url = hrefMatches[0].replace(/href=["']/i, '').replace(/["']$/, '').replace(/&amp;/g, '&');
        } else {
          const dataIdMatch = embedCode.match(/data-id=["'](\d+)["']/i);
          if (dataIdMatch) {
            url = `https://www.airbnb.pl/rooms/${dataIdMatch[1]}`;
          }
        }
      }
    }

    // Remove duplicate script tag from embedCode if provided
    let cleanEmbedCode = embedCode ? embedCode.trim() : objects[objectIndex].embedCode;
    if (embedCode) {
      cleanEmbedCode = cleanEmbedCode.replace(/<script[^>]*airbnb_jssdk[^>]*><\/script>/gi, '');
    }

    objects[objectIndex] = {
      ...objects[objectIndex],
      embedCode: embedCode ? cleanEmbedCode : objects[objectIndex].embedCode,
      url: url || objects[objectIndex].url,
      pros: pros !== undefined ? (Array.isArray(pros) ? pros : [pros]).filter(p => p.trim()) : objects[objectIndex].pros,
      cons: cons !== undefined ? (Array.isArray(cons) ? cons : [cons]).filter(c => c.trim()) : objects[objectIndex].cons,
      price: price !== undefined ? (price ? parseFloat(price) : null) : objects[objectIndex].price,
      pricePerPerson: pricePerPerson !== undefined ? (pricePerPerson ? parseFloat(pricePerPerson) : null) : objects[objectIndex].pricePerPerson,
      country: country !== undefined ? country.trim() : objects[objectIndex].country,
    };
    
    await writeAirbnbData({ objects });
    res.json(objects[objectIndex]);
  } catch (error) {
    console.error('Error updating Airbnb object:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Airbnb object
app.delete('/api/airbnb/:id', async (req, res) => {
  try {
    const data = await readAirbnbData();
    const objects = (data.objects || []).filter(obj => obj.id !== req.params.id);
    await writeAirbnbData({ objects });
    
    // Also remove votes for this object
    const votesData = await readVotesData();
    const votes = (votesData.votes || []).filter(v => v.objectId !== req.params.id);
    await writeVotesData({ votes });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting Airbnb object:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all voters (names)
app.get('/api/voters', async (req, res) => {
  try {
    const data = await readVotersData();
    res.json(data.names || []);
  } catch (error) {
    console.error('Error reading voters:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add voter (name)
app.post('/api/voters', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Imię jest wymagane' });
    }

    const data = await readVotersData();
    const names = data.names || [];
    
    // Check if name already exists
    if (names.includes(name.trim())) {
      return res.status(400).json({ error: 'To imię już istnieje' });
    }

    names.push(name.trim());
    await writeVotersData({ names });
    res.json(names);
  } catch (error) {
    console.error('Error adding voter:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete voter (name)
app.delete('/api/voters/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const data = await readVotersData();
    const names = (data.names || []).filter(n => n !== name);
    await writeVotersData({ names });
    
    // Also remove votes for this name
    const votesData = await readVotesData();
    const votes = (votesData.votes || []).filter(v => v.voterName !== name);
    await writeVotesData({ votes });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting voter:', error);
    res.status(500).json({ error: error.message });
  }
});

// Vote for Airbnb object
app.post('/api/airbnb/:id/vote', async (req, res) => {
  try {
    const { id: objectId } = req.params;
    const { voterName } = req.body;
    
    if (!voterName || !voterName.trim()) {
      return res.status(400).json({ error: 'Imię jest wymagane' });
    }

    // Check if voter name exists
    const votersData = await readVotersData();
    if (!votersData.names || !votersData.names.includes(voterName.trim())) {
      return res.status(400).json({ error: 'Nieprawidłowe imię' });
    }
    
    const data = await readAirbnbData();
    const object = (data.objects || []).find(obj => obj.id === objectId);
    
    if (!object) {
      return res.status(404).json({ error: 'Obiekt nie został znaleziony' });
    }
    
    const votesData = await readVotesData();
    const votes = votesData.votes || [];
    
    // Check if this voter already voted for this object
    const existingVote = votes.find(v => v.objectId === objectId && v.voterName === voterName.trim());
    
    if (existingVote) {
      return res.status(400).json({ error: 'Już głosowałeś na ten obiekt' });
    }
    
    // Add vote
    const newVote = {
      id: uuidv4(),
      objectId: objectId,
      voterName: voterName.trim(),
      createdAt: new Date().toISOString()
    };
    
    votes.push(newVote);
    await writeVotesData({ votes });
    
    res.json({ success: true, vote: newVote });
  } catch (error) {
    console.error('Error voting:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get votes for user (to check what they voted for)
app.get('/api/airbnb/votes/me', async (req, res) => {
  try {
    const { voterName } = req.query;
    if (!voterName) {
      return res.json({ votes: [] });
    }
    
    const votesData = await readVotesData();
    const votes = (votesData.votes || []).filter(v => v.voterName === voterName);
    res.json({ votes: votes.map(v => v.objectId) });
  } catch (error) {
    console.error('Error getting votes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove vote (unvote)
app.delete('/api/airbnb/:id/vote', async (req, res) => {
  try {
    const { id: objectId } = req.params;
    const { voterName } = req.query;
    
    if (!voterName) {
      return res.status(400).json({ error: 'Imię jest wymagane' });
    }
    
    const votesData = await readVotesData();
    const votes = (votesData.votes || []).filter(
      v => !(v.objectId === objectId && v.voterName === voterName)
    );
    await writeVotesData({ votes });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing vote:', error);
    res.status(500).json({ error: error.message });
  }
});



// Fetch metadata from Airbnb URL
app.post('/api/airbnb/fetch-metadata', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'URL jest wymagany' });
    }

    // Check if URL is Airbnb URL
    if (!url.includes('airbnb.com')) {
      return res.status(400).json({ error: 'URL musi być z Airbnb' });
    }

    // Fetch the page with proper headers
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');
    
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + (urlObj.search || ''),
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    };
    
    const html = await new Promise((resolve, reject) => {
      const req = client.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
          // Limit response size to 2MB
          if (data.length > 2 * 1024 * 1024) {
            response.destroy();
            reject(new Error('Response too large'));
          }
        });
        response.on('end', () => resolve(data));
        response.on('error', reject);
      });
      req.on('error', reject);
      req.end();
    });

    // Parse HTML to extract metadata
    // Try Open Graph tags first (most reliable)
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    
    // Fallback to title tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    
    let title = '';
    if (ogTitleMatch) {
      title = ogTitleMatch[1];
    } else if (titleMatch) {
      title = titleMatch[1];
    }
    
    // Clean title (remove - Airbnb suffix and decode HTML entities)
    title = title.replace(/\s*-\s*Airbnb.*$/i, '').trim();
    title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "\'");
    
    const imageUrl = ogImageMatch ? ogImageMatch[1] : '';
    
    res.json({
      name: title || '',
      imageUrl: imageUrl || '',
    });
  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({ error: 'Nie udało się pobrać danych z URL: ' + error.message });
  }
});



// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve React app for all other routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`SMTP configured: ${process.env.SMTP_HOST ? 'Yes' : 'No'}`);
});

