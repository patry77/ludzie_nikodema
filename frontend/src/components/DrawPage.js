import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Box,
  Card,
  CardContent,
  Alert,
  Snackbar,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Shuffle as ShuffleIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const DrawPage = () => {
  const [people, setPeople] = useState([]);
  const [newName, setNewName] = useState('');
  const [newWants, setNewWants] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    try {
      const response = await fetch(`${API_URL}/people`);
      const data = await response.json();
      setPeople(data);
    } catch (error) {
      showSnackbar('Błąd podczas ładowania danych');
    }
  };

  const addPerson = async () => {
    if (!newName.trim()) return;

    try {
      const response = await fetch(`${API_URL}/people`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, wants: newWants, email: newEmail }),
      });

      if (response.ok) {
        const person = await response.json();
        setPeople([...people, person]);
        setNewName('');
        setNewWants('');
        setNewEmail('');
        showSnackbar(`${person.name} został dodany!`);
      }
    } catch (error) {
      showSnackbar('Błąd podczas dodawania osoby');
    }
  };

  const deletePerson = async (id) => {
    try {
      const response = await fetch(`${API_URL}/people/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPeople(people.filter(p => p.id !== id));
        showSnackbar('Osoba została usunięta');
      }
    } catch (error) {
      showSnackbar('Błąd podczas usuwania osoby');
    }
  };

  const drawAssignments = async () => {
    if (people.length < 2) {
      showSnackbar('Potrzeba co najmniej 2 osób do losowania!');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/draw`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        setPeople(result.people);
        
        // Check email results
        if (result.emailResults && result.emailResults.length > 0) {
          const successCount = result.emailResults.filter(r => r.success).length;
          const failCount = result.emailResults.length - successCount;
          if (failCount > 0) {
            showSnackbar(`Losowanie zakończone! Wysłano ${successCount} emaili, ${failCount} błędów.`);
          } else {
            showSnackbar(`Losowanie zakończone! Wysłano ${successCount} emaili! 🎉`);
          }
        } else {
          showSnackbar('Losowanie zakończone! 🎉');
        }
      }
    } catch (error) {
      showSnackbar('Błąd podczas losowania');
    } finally {
      setLoading(false);
    }
  };

  const resetAssignments = async () => {
    try {
      const response = await fetch(`${API_URL}/reset`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        setPeople(result.people);
        showSnackbar('Przypisania zostały zresetowane');
      }
    } catch (error) {
      showSnackbar('Błąd podczas resetowania');
    }
  };

  const copyLink = (linkId) => {
    const link = `${window.location.origin}/person/${linkId}`;
    navigator.clipboard.writeText(link);
    showSnackbar('Link skopiowany do schowka!');
  };

  const showSnackbar = (message) => {
    setSnackbar({ open: true, message });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const hasAssignments = people.some(p => p.assignedTo);

  return (
    <Container maxWidth="md" className="py-8 relative z-20">
      <Paper
        elevation={10}
        className="p-8 bg-gradient-to-br from-red-50 to-green-50 border-4 border-red-300 rounded-3xl shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #fff5f5 0%, #f0fff4 100%)',
          border: '4px solid #C8102E',
        }}
      >
        <Box className="text-center mb-8">
          <Typography
            variant="h2"
            className="mb-4 font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-green-600"
            style={{
              fontFamily: "'Comic Sans MS', cursive",
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            🎅 Wigilia boża 🎄
          </Typography>
          <Typography variant="h6" className="text-gray-600">
            Losowanie osób na prezent
          </Typography>
        </Box>

        {/* Add Person Section */}
        <Card className="mb-6 bg-white shadow-lg border-2 border-red-200">
          <CardContent>
            <Box className="space-y-3">
              <TextField
                fullWidth
                label="Dodaj osobę"
                variant="outlined"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addPerson()}
                className="bg-white"
                required
              />
              <TextField
                fullWidth
                label="Email (opcjonalnie - do wysyłki linku)"
                variant="outlined"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addPerson()}
                className="bg-white"
              />
              <TextField
                fullWidth
                label="Co chciałby/chciałaby otrzymać? (opcjonalnie)"
                variant="outlined"
                value={newWants}
                onChange={(e) => setNewWants(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addPerson()}
                className="bg-white"
                multiline
                rows={2}
              />
              <Button
                variant="contained"
                onClick={addPerson}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6"
                startIcon={<AddIcon />}
                fullWidth
              >
                Dodaj
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* People List */}
        <Card className="mb-6 bg-white shadow-lg border-2 border-green-200">
          <CardContent>
            <Typography variant="h6" className="mb-4 font-semibold text-green-700">
              Lista osób ({people.length})
            </Typography>
            {people.length === 0 ? (
              <Typography className="text-gray-500 text-center py-4">
                Dodaj osoby do losowania
              </Typography>
            ) : (
              <List>
                {people.map((person) => (
                  <ListItem
                    key={person.id}
                    className="mb-2 bg-gradient-to-r from-red-50 to-green-50 rounded-lg border border-red-200 hover:shadow-md transition-shadow"
                  >
                    <ListItemText
                      primary={
                        <Box className="flex items-center gap-2">
                          <span className="font-semibold text-lg">🎁 {person.name}</span>
                          {person.assignedTo && (
                            <Chip
                              label="Wylosowano"
                              color="success"
                              size="small"
                              icon={<TrophyIcon />}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box className="mt-2">
                          {person.email && (
                            <Typography variant="body2" className="text-gray-600 mb-1">
                              📧 {person.email}
                            </Typography>
                          )}
                          {person.wants && (
                            <Typography variant="body2" className="text-gray-700 mb-2 italic">
                              💝 Chce: {person.wants}
                            </Typography>
                          )}
                          <Typography variant="body2" className="text-gray-600">
                            Link: {window.location.origin}/person/{person.linkId}
                          </Typography>
                          <Button
                            size="small"
                            startIcon={<CopyIcon />}
                            onClick={() => copyLink(person.linkId)}
                            className="mt-1 text-blue-600"
                          >
                            Kopiuj link
                          </Button>
                        </Box>
                      }
                    />
                    <IconButton
                      onClick={() => deletePerson(person.id)}
                      className="text-red-500 hover:bg-red-100"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Box className="flex gap-4 justify-center flex-wrap">
          <Button
            variant="contained"
            size="large"
            onClick={drawAssignments}
            disabled={loading || people.length < 2}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-3 text-lg font-bold shadow-lg transform hover:scale-105 transition-transform"
            startIcon={<ShuffleIcon />}
          >
            {loading ? 'Losowanie...' : '🎲 Losuj osoby!'}
          </Button>

          {hasAssignments && (
            <Button
              variant="outlined"
              size="large"
              onClick={resetAssignments}
              className="border-red-500 text-red-600 hover:bg-red-50 px-8 py-3 text-lg font-bold"
              startIcon={<RefreshIcon />}
            >
              Resetuj
            </Button>
          )}
        </Box>

        {hasAssignments && (
          <Alert severity="success" className="mt-6 bg-green-100 border-2 border-green-400">
            <Typography variant="body1" className="font-semibold">
              ✅ Losowanie zakończone! Każda osoba może sprawdzić swój link.
            </Typography>
          </Alert>
        )}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default DrawPage;

