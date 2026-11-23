import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  Snackbar,
  Paper,
  Chip,
  CircularProgress,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import {
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || '/api';

// Component to handle individual Airbnb embed (same approach as EmbedTestPage)
const AirbnbEmbed = ({ embedCode, id }) => {
  const embedRef = useRef(null);

  useEffect(() => {
    if (!embedRef.current) return;

    const initializeEmbed = () => {
      if (window.Airbnb && window.Airbnb.Embeds) {
        try {
          window.Airbnb.Embeds.init();
        } catch (error) {
          console.error('Error initializing Airbnb embed:', error);
        }
      }
    };

    // Remove any existing script first (same as EmbedTestPage)
    const existingScript = document.querySelector('script[src*="airbnb_jssdk"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Load script manually (same as EmbedTestPage)
    const script = document.createElement('script');
    script.src = 'https://www.airbnb.com/embeddable/airbnb_jssdk';
    script.async = false; // Load synchronously
    
    script.onload = () => {
      // Wait a bit for Airbnb object to be available
      setTimeout(() => {
        initializeEmbed();
        
        // Keep checking periodically
        let attempts = 0;
        const checkInterval = setInterval(() => {
          attempts++;
          initializeEmbed();
          if (window.Airbnb && window.Airbnb.Embeds) {
            clearInterval(checkInterval);
          } else if (attempts > 20) {
            clearInterval(checkInterval);
          }
        }, 500);
      }, 1000);
    };
    
    document.head.appendChild(script);
    
    // Also check periodically in case script loads but object doesn't appear
    let attempts = 0;
    const periodicCheck = setInterval(() => {
      attempts++;
      initializeEmbed();
      if (window.Airbnb && window.Airbnb.Embeds) {
        clearInterval(periodicCheck);
      } else if (attempts > 30) {
        clearInterval(periodicCheck);
      }
    }, 1000);

    return () => clearInterval(periodicCheck);
  }, [embedCode]);

  return (
    <Box
      ref={embedRef}
      id={`airbnb-embed-${id}`}
      sx={{
        width: '100%',
        minHeight: 450,
        position: 'relative',
        overflow: 'visible',
        backgroundColor: 'transparent',
        display: 'block',
        padding: '8px',
        '& .airbnb-embed-frame': {
          width: '100% !important',
          maxWidth: '100% !important',
          height: '450px !important',
          minHeight: '450px !important',
          margin: '0 !important',
        }
      }}
      dangerouslySetInnerHTML={{
        __html: embedCode
      }}
    />
  );
};

const WakacjePage = () => {
  const [objects, setObjects] = useState([]);
  const [votedObjects, setVotedObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [voting, setVoting] = useState({});
  const [selectedCountry, setSelectedCountry] = useState('wszystkie');
  const [voters, setVoters] = useState([]);
  const [selectedVoterName, setSelectedVoterName] = useState('');
  const [showVoterDialog, setShowVoterDialog] = useState(false);

  // Load selected voter name from cookie
  useEffect(() => {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    
    const savedName = getCookie('voterName');
    if (savedName) {
      setSelectedVoterName(savedName);
    } else {
      setShowVoterDialog(true);
    }
  }, []);

  useEffect(() => {
    fetchObjects();
    fetchVoters();
    if (selectedVoterName) {
      fetchMyVotes();
    }
  }, [selectedVoterName]);

  const fetchObjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/airbnb`);
      if (!response.ok) throw new Error('Błąd podczas pobierania obiektów');
      const data = await response.json();
      setObjects(data.objects || []);
    } catch (error) {
      console.error('Error fetching objects:', error);
      showSnackbar('Błąd podczas pobierania obiektów', 'error');
    } finally {
      setLoading(false);
    }
  };



  const fetchVoters = async () => {
    try {
      const response = await fetch(`${API_URL}/voters`);
      if (response.ok) {
        const data = await response.json();
        setVoters(data || []);
      }
    } catch (error) {
      console.error('Error fetching voters:', error);
    }
  };

  const fetchMyVotes = async () => {
    if (!selectedVoterName) return;
    
    try {
      const response = await fetch(`${API_URL}/airbnb/votes/me?voterName=${encodeURIComponent(selectedVoterName)}`);
      if (response.ok) {
        const data = await response.json();
        setVotedObjects(data.votes || []);
      }
    } catch (error) {
      console.error('Error fetching votes:', error);
    }
  };

  const handleVoterSelect = (name) => {
    setSelectedVoterName(name);
    // Save to cookie (expires in 1 year)
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `voterName=${name}; expires=${expires.toUTCString()}; path=/`;
    setShowVoterDialog(false);
  };

  const handleVote = async (objectId) => {
    if (!selectedVoterName) {
      setShowVoterDialog(true);
      return;
    }

    // Check if already voted (client-side check)
    if (votedObjects.includes(objectId)) {
      showSnackbar('Już głosowałeś na ten obiekt', 'warning');
      return;
    }

    try {
      setVoting({ ...voting, [objectId]: true });
      const response = await fetch(`${API_URL}/airbnb/${objectId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterName: selectedVoterName }),
      });

      if (response.ok) {
        // Add to voted objects
        const newVotedObjects = [...votedObjects, objectId];
        setVotedObjects(newVotedObjects);
        // Update object vote count
        setObjects(objects.map(obj => 
          obj.id === objectId 
            ? { ...obj, votesCount: (obj.votesCount || 0) + 1 }
            : obj
        ));
        showSnackbar('Głos został oddany!', 'success');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas głosowania');
      }
    } catch (error) {
      console.error('Error voting:', error);
      showSnackbar(error.message || 'Błąd podczas głosowania', 'error');
    } finally {
      setVoting({ ...voting, [objectId]: false });
    }
  };

  const handleUnvote = async (objectId) => {
    if (!selectedVoterName) return;

    try {
      setVoting({ ...voting, [objectId]: true });
      const response = await fetch(`${API_URL}/airbnb/${objectId}/vote?voterName=${encodeURIComponent(selectedVoterName)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from voted objects
        const newVotedObjects = votedObjects.filter(id => id !== objectId);
        setVotedObjects(newVotedObjects);
        // Update object vote count
        setObjects(objects.map(obj => 
          obj.id === objectId 
            ? { ...obj, votesCount: Math.max(0, (obj.votesCount || 0) - 1) }
            : obj
        ));
        showSnackbar('Głos został cofnięty!', 'success');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas cofania głosu');
      }
    } catch (error) {
      console.error('Error unvoting:', error);
      showSnackbar(error.message || 'Błąd podczas cofania głosu', 'error');
    } finally {
      setVoting({ ...voting, [objectId]: false });
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
  // Get unique countries
  // Filter objects by country

  return (
      <Container maxWidth="lg" className="py-8 relative z-20">
        <Box className="flex justify-center items-center min-h-screen">
          <CircularProgress size={60} className="text-red-500" />
        </Box>
      </Container>
    );
  }

  // Get unique countries
  const countries = [...new Set(objects.map(obj => obj.country || 'Inny').filter(c => c))];
  // Filter objects by country
  const filteredObjects = selectedCountry === 'wszystkie' ? objects : objects.filter(obj => (obj.country || 'Inny') === selectedCountry);

  return (
    <Container maxWidth="lg" className="py-8 relative z-20">
      <Paper
        elevation={10}
        className="p-8 bg-gradient-to-br from-red-50 to-green-50 border-4 border-red-300 rounded-3xl shadow-2xl mb-8"
        style={{
          background: 'linear-gradient(135deg, #fff5f5 0%, #f0fff4 100%)',
          border: '4px solid #C8102E',
        }}
      >
        <Typography
          variant="h3"
          className="mb-4 font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-green-600"
          style={{
            fontFamily: "'Comic Sans MS', cursive",
            textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          🏖️ Wakacje - Głosowanie na obiekty Airbnb 🏖️
        </Typography>
        <Typography variant="body1" className="text-center text-gray-600 mb-4">
          Wybierz obiekty, które Ci się podobają. Możesz głosować na kilka obiektów!
        </Typography>
      </Paper>

            {/* Country Filter */}
      {objects.length > 0 && (
        <Box className="mb-6 flex flex-wrap gap-2 justify-center">
          <Button
            variant={selectedCountry === 'wszystkie' ? 'contained' : 'outlined'}
            onClick={() => setSelectedCountry('wszystkie')}
            className={selectedCountry === 'wszystkie' ? 'bg-blue-600' : ''}
          >
            Wszystkie
          </Button>
          {countries.map((country) => (
            <Button
              key={country}
              variant={selectedCountry === country ? 'contained' : 'outlined'}
              onClick={() => setSelectedCountry(country)}
              className={selectedCountry === country ? 'bg-blue-600' : ''}
            >
              {country}
            </Button>
          ))}
        </Box>
      )}

{objects.length === 0 ? (
        <Paper
          elevation={5}
          className="p-8 bg-white border-2 border-gray-300 rounded-2xl text-center"
        >
          <Typography variant="h6" className="text-gray-500">
            Brak obiektów do wyświetlenia. Obiekty można dodać w panelu administratora.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={4}>

{filteredObjects.map((obj) => {
            const isVoted = votedObjects.includes(obj.id);
            const isVoting = voting[obj.id];

            return (
              <Grid item xs={12} md={6} lg={4} key={obj.id}>
                <Card
                  elevation={8}
                  className="h-full flex flex-col bg-white border-2 border-gray-200 rounded-2xl hover:shadow-xl transition-shadow overflow-hidden"
                >
                  {obj.embedCode && (
                    <Box sx={{ padding: '8px', backgroundColor: '#f5f5f5' }}>
                      <AirbnbEmbed 
                        embedCode={obj.embedCode} 
                        id={obj.id}
                      />
                    </Box>
                  )}

                  <CardContent className="flex-grow flex flex-col" sx={{ padding: '16px !important' }}>
                    {obj.pros && obj.pros.length > 0 && (
                      <Box className="mb-3">
                        <Typography variant="subtitle2" className="font-bold text-green-700 mb-1">
                          ✅ Plusy:
                        </Typography>
                        <Box className="flex flex-wrap gap-1">
                          {obj.pros.map((pro, idx) => (
                            <Chip
                              key={idx}
                              label={pro}
                              size="small"
                              className="bg-green-100 text-green-800"
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {obj.cons && obj.cons.length > 0 && (
                      <Box className="mb-3">
                        <Typography variant="subtitle2" className="font-bold text-red-700 mb-1">
                          ❌ Minusy:
                        </Typography>
                        <Box className="flex flex-wrap gap-1">
                          {obj.cons.map((con, idx) => (
                            <Chip
                              key={idx}
                              label={con}
                              size="small"
                              className="bg-red-100 text-red-800"
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    <Box className="mb-3">
                      {obj.price !== null && obj.price !== undefined && (
                        <Box className="flex items-center mb-1">
                          <MoneyIcon className="text-green-600 mr-1" />
                          <Typography variant="body2" className="font-semibold">
                            Cena: {obj.price.toFixed(2)} PLN
                          </Typography>
                        </Box>
                      )}
                      {obj.pricePerPerson !== null && obj.pricePerPerson !== undefined && (
                        <Box className="flex items-center">
                          <PersonIcon className="text-blue-600 mr-1" />
                          <Typography variant="body2" className="font-semibold">
                            Cena za osobę: {obj.pricePerPerson.toFixed(2)} PLN
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Box className="mt-auto pt-3">
                      {isVoted ? (
                        <Button
                          variant="outlined"
                          color="error"
                          fullWidth
                          startIcon={<ThumbDownIcon />}
                          onClick={() => handleUnvote(obj.id)}
                          disabled={isVoting}
                        >
                          {isVoting ? 'Cofanie...' : 'Cofnij głos'}
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          color="primary"
                          fullWidth
                          startIcon={<ThumbUpIcon />}
                          onClick={() => handleVote(obj.id)}
                          disabled={isVoting || !selectedVoterName}
                          className="bg-blue-600"
                        >
                          {isVoting ? 'Głosowanie...' : 'Głosuj'}
                        </Button>
                      )}
                      <Typography variant="body2" className="text-center mt-2 text-gray-600">
                        Głosów: {obj.votesCount || 0}
                      </Typography>
                      {selectedVoterName && (
                        <Typography variant="caption" className="text-center mt-1 text-gray-500">
                          Głosujesz jako: {selectedVoterName}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
</Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Voter Selection Dialog */}
      <Dialog open={showVoterDialog} onClose={() => {}} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" className="font-bold">
            Wybierz swoje imię
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" className="mb-3 text-gray-600">
            Wybierz swoje imię z listy, aby móc głosować na obiekty Airbnb.
          </Typography>
          {voters.length === 0 ? (
            <Typography variant="body2" className="text-gray-500">
              Brak dostępnych osób. Skontaktuj się z administratorem.
            </Typography>
          ) : (
            <List>
              {voters.map((name) => (
                <ListItem key={name} disablePadding>
                  <ListItemButton onClick={() => handleVoterSelect(name)}>
                    <ListItemText primary={name} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default WakacjePage;
