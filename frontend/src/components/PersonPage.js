import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import { EmojiEvents as TrophyIcon } from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PersonPage = () => {
  const { linkId } = useParams();
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPerson();
  }, [linkId]);

  const fetchPerson = async () => {
    try {
      const response = await fetch(`${API_URL}/person/${linkId}`);
      if (response.ok) {
        const data = await response.json();
        setPerson(data);
      } else {
        setError('Nie znaleziono osoby o podanym linku');
      }
    } catch (error) {
      setError('Błąd podczas ładowania danych');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" className="py-8 relative z-20">
        <Box className="flex justify-center items-center min-h-screen">
          <CircularProgress size={60} className="text-red-500" />
        </Box>
      </Container>
    );
  }

  if (error || !person) {
    return (
      <Container maxWidth="md" className="py-8 relative z-20">
        <Paper
          elevation={10}
          className="p-8 bg-gradient-to-br from-red-50 to-green-50 border-4 border-red-300 rounded-3xl shadow-2xl"
        >
          <Alert severity="error" className="text-center">
            {error || 'Nie znaleziono osoby'}
          </Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" className="py-8 relative z-20">
      <Paper
        elevation={10}
        className="p-8 bg-gradient-to-br from-red-50 to-green-50 border-4 border-red-300 rounded-3xl shadow-2xl min-h-[400px] flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #fff5f5 0%, #f0fff4 100%)',
          border: '4px solid #C8102E',
        }}
      >
        <Box className="text-center w-full">
          <Typography
            variant="h3"
            className="mb-6 font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-green-600 animate-pulse"
            style={{
              fontFamily: "'Comic Sans MS', cursive",
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            🎄 Cześć {person.name}! 🎅
          </Typography>

          {person.assignedTo ? (
            <Card className="bg-gradient-to-br from-red-100 to-green-100 border-4 border-green-500 rounded-2xl shadow-xl p-8 transform hover:scale-105 transition-transform">
              <CardContent>
                <Box className="mb-6">
                  <TrophyIcon className="text-6xl text-yellow-500 mb-4 animate-bounce" />
                </Box>
                <Typography
                  variant="h4"
                  className="mb-4 font-bold text-green-700"
                  style={{ fontFamily: "'Comic Sans MS', cursive" }}
                >
                  🎁 Twoja wylosowana osoba to:
                </Typography>
                <Typography
                  variant="h2"
                  className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-green-600 mb-6 animate-pulse"
                  style={{
                    fontFamily: "'Comic Sans MS', cursive",
                    fontSize: '3rem',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  {person.assignedTo.name}
                </Typography>
                {person.assignedTo.wants && (
                  <Card className="bg-white bg-opacity-80 border-2 border-yellow-400 rounded-xl p-4 mb-4">
                    <Typography variant="h6" className="font-semibold text-yellow-700 mb-2">
                      💝 Co ta osoba chciałaby otrzymać:
                    </Typography>
                    <Typography variant="body1" className="text-gray-700 italic">
                      {person.assignedTo.wants}
                    </Typography>
                  </Card>
                )}
                <Typography variant="h6" className="text-gray-600 mt-4">
                  🎉 I pamiętaj o jedzonku! 🎉
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white border-2 border-yellow-400 rounded-2xl shadow-lg p-8">
              <CardContent>
                <Typography variant="h5" className="mb-4 text-yellow-600 font-semibold">
                  ⏳ Losowanie jeszcze się nie odbyło
                </Typography>
                <Typography variant="body1" className="text-gray-600">
                  Poczekaj na losowanie, a następnie odśwież tę stronę.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default PersonPage;

