import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Link,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Shuffle as ShuffleIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  EmojiEvents as TrophyIcon,
  Lock as LockIcon,
  Send as SendIcon,
  ClearAll as ClearAllIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const AdminPage = () => {
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [newName, setNewName] = useState('');
  const [newWants, setNewWants] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newExcludeEmail, setNewExcludeEmail] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(true);
  const [drawPreview, setDrawPreview] = useState(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [menuMessage, setMenuMessage] = useState('Zobacz co przygotowaliśmy na sylwestra!');
  const [editingMenuMessage, setEditingMenuMessage] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [editDishName, setEditDishName] = useState('');
  const [editMadeBy, setEditMadeBy] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('dania');
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editImagePosition, setEditImagePosition] = useState('center');
  // States for adding new menu item
  const [newDishName, setNewDishName] = useState('');
  const [newMadeBy, setNewMadeBy] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('dania');
  const [newImage, setNewImage] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState(null);
  const [newImagePosition, setNewImagePosition] = useState('center');
  const [showAddMenuDialog, setShowAddMenuDialog] = useState(false);

  // States for Airbnb objects
  const [airbnbObjects, setAirbnbObjects] = useState([]);
  const [showAddAirbnbDialog, setShowAddAirbnbDialog] = useState(false);
  const [editingAirbnbObject, setEditingAirbnbObject] = useState(null);
  const [newAirbnbName, setNewAirbnbName] = useState('');
  const [newAirbnbEmbed, setNewAirbnbEmbed] = useState('');
  const [newAirbnbImageUrl, setNewAirbnbImageUrl] = useState('');
  const [newAirbnbPros, setNewAirbnbPros] = useState('');
  const [newAirbnbCons, setNewAirbnbCons] = useState('');
  const [newAirbnbPrice, setNewAirbnbPrice] = useState('');
  const [newAirbnbPricePerPerson, setNewAirbnbPricePerPerson] = useState('');
  const [newAirbnbCountry, setNewAirbnbCountry] = useState('');
  
  // States for voters (names)
  const [voters, setVoters] = useState([]);
  const [newVoterName, setNewVoterName] = useState('');


  useEffect(() => {
    const auth = sessionStorage.getItem('adminAuth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      setShowPasswordDialog(false);
      fetchPeople();
      fetchMenu();
      fetchAirbnb();
      fetchVoters();
    }
  }, []);

  const handleLogin = () => {
    // Simple password check - in production use proper authentication
    if (password === 'admin123') { // Change this password
      setIsAuthenticated(true);
      setShowPasswordDialog(false);
      sessionStorage.setItem('adminAuth', 'true');
      fetchPeople();
      fetchMenu();
    } else {
      setSnackbar({ open: true, message: 'Nieprawidłowe hasło', severity: 'error' });
      setPassword('');
    }
  };

  const fetchPeople = async () => {
    try {
      const response = await fetch(`${API_URL}/people`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPeople(data);
    } catch (error) {
      console.error('Error fetching people:', error);
      showSnackbar('Błąd podczas ładowania danych: ' + error.message);
    }
  };

  const addPerson = async () => {
    if (!newName.trim()) return;

    try {
      const response = await fetch(`${API_URL}/people`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newName, 
          wants: newWants, 
          email: newEmail,
          excludeEmail: newExcludeEmail 
        }),
      });

      if (response.ok) {
        const person = await response.json();
        setPeople([...people, person]);
        setNewName('');
        setNewWants('');
        setNewEmail('');
        setNewExcludeEmail('');
        showSnackbar(`${person.name} został dodany!`);
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Błąd podczas dodawania osoby');
      }
    } catch (error) {
      console.error('Error adding person:', error);
      showSnackbar('Błąd podczas dodawania osoby: ' + error.message);
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
      const response = await fetch(`${API_URL}/draw-preview`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        setDrawPreview(result.preview);
        setShowPreviewDialog(true);
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Błąd podczas losowania');
      }
    } catch (error) {
      console.error('Error drawing assignments:', error);
      showSnackbar('Błąd podczas losowania: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmDraw = async () => {
    if (!drawPreview) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/draw-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: drawPreview             
          }),
      });

      if (response.ok) {
        const result = await response.json();
        setPeople(result.people);
        setShowPreviewDialog(false);
        setDrawPreview(null);
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
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Błąd podczas potwierdzania losowania');
      }
    } catch (error) {
      console.error('Error confirming draw:', error);
      showSnackbar('Błąd podczas potwierdzania losowania: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelDraw = () => {
    setShowPreviewDialog(false);
    setDrawPreview(null);
  };

  const clearAllData = async () => {
    if (!window.confirm('Czy na pewno chcesz usunąć wszystkie osoby? Ta operacja jest nieodwracalna!')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/people`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPeople([]);
        showSnackbar('Wszystkie osoby zostały usunięte');
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Błąd podczas usuwania danych');
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      showSnackbar('Błąd podczas usuwania danych: ' + error.message);
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
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Błąd podczas resetowania');
      }
    } catch (error) {
      console.error('Error resetting assignments:', error);
      showSnackbar('Błąd podczas resetowania: ' + error.message);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail.trim()) {
      showSnackbar('Podaj adres email');
      return;
    }

    setSendingTest(true);
    try {
      const response = await fetch(`${API_URL}/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail.trim() }),
      });

      if (response.ok) {
        const result = await response.json();
        showSnackbar('Test email wysłany pomyślnie!');
        setTestEmail('');
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Błąd podczas wysyłania testowego maila');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      showSnackbar('Błąd podczas wysyłania testowego maila: ' + error.message);
    } finally {
      setSendingTest(false);
    }
  };

  const copyLink = (linkId) => {
    const link = `${window.location.origin}/person/${linkId}`;
    navigator.clipboard.writeText(link);
    showSnackbar('Link skopiowany do schowka!');
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const fetchMenu = async () => {
    try {
      const response = await fetch(`${API_URL}/menu`);
      if (!response.ok) throw new Error('Błąd podczas pobierania menu');
      const data = await response.json();
      setMenuItems(data.items || []);
      if (data.message) {
        setMenuMessage(data.message);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
      showSnackbar('Błąd podczas pobierania menu');
    }
  };

  const fetchAirbnb = async () => {
    try {
      const response = await fetch(`${API_URL}/airbnb`);
      if (!response.ok) throw new Error('Błąd podczas pobierania obiektów');
      const data = await response.json();
      setAirbnbObjects(data.objects || []);
    } catch (error) {
      console.error('Error fetching Airbnb objects:', error);
      showSnackbar('Błąd podczas pobierania obiektów');
    }
  };

  const fetchVoters = async () => {
    try {
      const response = await fetch(`${API_URL}/voters`);
      if (!response.ok) throw new Error('Błąd podczas pobierania osób');
      const data = await response.json();
      setVoters(data || []);
    } catch (error) {
      console.error('Error fetching voters:', error);
      showSnackbar('Błąd podczas pobierania osób');
    }
  };

  const addVoter = async () => {
    if (!newVoterName.trim()) {
      showSnackbar('Imię jest wymagane', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/voters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newVoterName.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Błąd podczas dodawania osoby');
      }

      await fetchVoters();
      showSnackbar('Osoba dodana pomyślnie!', 'success');
      setNewVoterName('');
    } catch (error) {
      console.error('Error adding voter:', error);
      showSnackbar(error.message || 'Błąd podczas dodawania osoby', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteVoter = async (name) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć osobę "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/voters/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Błąd podczas usuwania osoby');
      }

      await fetchVoters();
      showSnackbar('Osoba usunięta pomyślnie!', 'success');
    } catch (error) {
      console.error('Error deleting voter:', error);
      showSnackbar('Błąd podczas usuwania osoby', 'error');
    }
  };

  const handleEditAirbnbObject = (obj) => {
    setEditingAirbnbObject(obj);
    setNewAirbnbEmbed(obj.embedCode || '');
    setNewAirbnbPros(obj.pros ? obj.pros.join('\n') : '');
    setNewAirbnbCons(obj.cons ? obj.cons.join('\n') : '');
    setNewAirbnbPrice(obj.price ? obj.price.toString() : '');
    setNewAirbnbPricePerPerson(obj.pricePerPerson ? obj.pricePerPerson.toString() : '');
    setNewAirbnbCountry(obj.country || '');
    setShowAddAirbnbDialog(true);
  };

  const updateAirbnbObject = async () => {
    if (!newAirbnbEmbed.trim()) {
      showSnackbar('Kod embed jest wymagany', 'error');
      return;
    }

    try {
      setLoading(true);
      const pros = newAirbnbPros.split('\n').filter(p => p.trim());
      const cons = newAirbnbCons.split('\n').filter(c => c.trim());
      const response = await fetch(`${API_URL}/airbnb/${editingAirbnbObject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embedCode: newAirbnbEmbed.trim(),
          pros: pros,
          cons: cons,
          price: newAirbnbPrice ? parseFloat(newAirbnbPrice) : null,
          pricePerPerson: newAirbnbPricePerPerson ? parseFloat(newAirbnbPricePerPerson) : null,
          country: newAirbnbCountry.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Błąd podczas aktualizacji obiektu');
      }

      await fetchAirbnb();
      showSnackbar('Obiekt zaktualizowany pomyślnie!', 'success');
      setShowAddAirbnbDialog(false);
      setEditingAirbnbObject(null);
      setNewAirbnbEmbed('');
      setNewAirbnbPros('');
      setNewAirbnbCons('');
      setNewAirbnbPrice('');
      setNewAirbnbPricePerPerson('');
      setNewAirbnbCountry('');
    } catch (error) {
      console.error('Error updating Airbnb object:', error);
      showSnackbar(error.message || 'Błąd podczas aktualizacji obiektu', 'error');
    } finally {
      setLoading(false);
    }
  };



  const handleEditMenuItem = (item) => {
    setEditingMenuItem(item);
    setEditDishName(item.dishName);
    setEditMadeBy(item.madeBy);
    setEditDescription(item.description || '');
    setEditCategory(item.category || 'dania');
    setEditImage(item.image);
    setEditImagePreview(item.image);
    setEditImagePosition(item.imagePosition || 'center');
  };

  const handleCloseEditDialog = () => {
    setEditingMenuItem(null);
    setEditDishName('');
    setEditMadeBy('');
    setEditDescription('');
    setEditCategory('dania');
    setEditImage(null);
    setEditImagePreview(null);
    setEditImagePosition('center');
  };
  const handleCloseAddMenuDialog = () => {
    setShowAddMenuDialog(false);
    setNewDishName('');
    setNewMadeBy('');
    setNewDescription('');
    setNewCategory('dania');
    setNewImage(null);
    setNewImagePreview(null);
    setNewImagePosition('center');
  };
  const handleNewImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showSnackbar('Zdjęcie jest za duże. Maksymalny rozmiar to 5MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setNewImage(base64String);
        setNewImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };
  const addMenuItem = async () => {
    if (!newDishName.trim() || !newMadeBy.trim()) {
      showSnackbar('Nazwa dania i osoba są wymagane', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dishName: newDishName.trim(),
          madeBy: newMadeBy.trim(),
          description: newDescription.trim(),
          category: newCategory,
          image: newImage,
          imagePosition: newImagePosition,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Nieznany błąd' }));
        throw new Error(errorData.error || 'Błąd podczas dodawania pozycji');
      }

      await fetchMenu();
      showSnackbar('Pozycja dodana pomyślnie!');
      handleCloseAddMenuDialog();
    } catch (error) {
      console.error('Error adding menu item:', error);
      showSnackbar(error.message || 'Błąd podczas dodawania pozycji', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addAirbnbObject = async () => {
    if (!newAirbnbEmbed.trim()) {
      showSnackbar('Kod embed jest wymagany', 'error');
      return;
    }

    // If editing, use update function
    if (editingAirbnbObject) {
      return updateAirbnbObject();
    }

    try {
      setLoading(true);
      const pros = newAirbnbPros.split('\n').filter(p => p.trim());
      const cons = newAirbnbCons.split('\n').filter(c => c.trim());
      const response = await fetch(`${API_URL}/airbnb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embedCode: newAirbnbEmbed.trim(),
          pros: pros,
          cons: cons,
          price: newAirbnbPrice ? parseFloat(newAirbnbPrice) : null,
          pricePerPerson: newAirbnbPricePerPerson ? parseFloat(newAirbnbPricePerPerson) : null,
          country: newAirbnbCountry.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Błąd podczas dodawania obiektu');
      }

      await fetchAirbnb();
      showSnackbar('Obiekt dodany pomyślnie!', 'success');
      setShowAddAirbnbDialog(false);
      setNewAirbnbEmbed('');
      setNewAirbnbPros('');
      setNewAirbnbCons('');
      setNewAirbnbPrice('');
      setNewAirbnbPricePerPerson('');
      setNewAirbnbCountry('');
    } catch (error) {
      console.error('Error adding Airbnb object:', error);
      showSnackbar(error.message || 'Błąd podczas dodawania obiektu', 'error');
    } finally {
      setLoading(false);
    }
  };
  const deleteAirbnbObject = async (id) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten obiekt?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/airbnb/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Błąd podczas usuwania obiektu');
      }

      await fetchAirbnb();
      showSnackbar('Obiekt został usunięty', 'success');
    } catch (error) {
      console.error('Error deleting Airbnb object:', error);
      showSnackbar('Błąd podczas usuwania obiektu', 'error');
    }
  };


  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showSnackbar('Zdjęcie jest za duże. Maksymalny rozmiar to 5MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setEditImage(base64String);
        setEditImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateMenuItem = async () => {
    if (!editingMenuItem || !editingMenuItem.id) {
      showSnackbar('Błąd: brak danych do edycji', 'error');
      return;
    }

    if (!editDishName.trim() || !editMadeBy.trim()) {
      showSnackbar('Nazwa dania i osoba są wymagane', 'error');
      return;
    }

    try {
      setLoading(true);
      console.log('Updating menu item:', editingMenuItem.id, {
        dishName: editDishName.trim(),
        madeBy: editMadeBy.trim(),
        description: editDescription.trim(),
        category: editCategory,
        hasImage: !!editImage,
      });
      const response = await fetch(`${API_URL}/menu/${editingMenuItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dishName: editDishName.trim(),
          madeBy: editMadeBy.trim(),
          description: editDescription.trim(),
          category: editCategory,
          image: editImage,
          imagePosition: editImagePosition,
        }),
      });

      console.log('Response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Nieznany błąd' }));
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Błąd podczas aktualizacji pozycji');
      }

      const updatedItem = await response.json();
      console.log('Item updated successfully:', updatedItem);
      await fetchMenu();
      showSnackbar('Pozycja zaktualizowana pomyślnie!');
      handleCloseEditDialog();
    } catch (error) {
      console.error('Error updating menu item:', error);
      showSnackbar(error.message || 'Błąd podczas aktualizacji pozycji', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteMenuItem = async (id) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę pozycję z menu?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/menu/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Błąd podczas usuwania pozycji');

      // Refresh menu after deletion
      await fetchMenu();
      showSnackbar('Pozycja usunięta pomyślnie!');
    } catch (error) {
      console.error('Error deleting menu item:', error);
      showSnackbar('Błąd podczas usuwania pozycji');
    }
  };

  const updateMenuMessage = async () => {
    try {
      const response = await fetch(`${API_URL}/menu/message`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: menuMessage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas aktualizacji wiadomości');
      }

      setEditingMenuMessage(false);
      showSnackbar('Wiadomość zaktualizowana pomyślnie!');
    } catch (error) {
      console.error('Error updating menu message:', error);
      showSnackbar(error.message || 'Błąd podczas aktualizacji wiadomości');
    }
  };

  const hasAssignments = people.some(p => p.assignedTo);

  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm" className="py-8 relative z-20">
        <Dialog open={showPasswordDialog} onClose={() => navigate('/')}>
          <DialogTitle>
            <Box className="flex items-center gap-2">
              <LockIcon />
              <Typography variant="h6">Panel administracyjny</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Hasło"
              type="password"
              fullWidth
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => navigate('/')}>Anuluj</Button>
            <Button onClick={handleLogin} variant="contained">
              Zaloguj
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    );
  }

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
            🔐 Panel administracyjny
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
              <TextField
                fullWidth
                label="Email osoby, której nie można wylosować (opcjonalnie)"
                variant="outlined"
                type="email"
                value={newExcludeEmail}
                onChange={(e) => setNewExcludeEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addPerson()}
                className="bg-white"
                helperText="Podaj email osoby z listy, której ta osoba nie może wylosować"
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
                          {person.excludeEmail && (
                            <Typography variant="body2" className="text-orange-600 mb-2 font-semibold">
                              🚫 Nie może wylosować: {person.excludeEmail}
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

        {/* Test Email Section */}
        <Card className="mb-6 bg-white shadow-lg border-2 border-blue-200">
          <CardContent>
            <Typography variant="h6" className="mb-4 font-semibold text-blue-700">
              📧 Test wysyłania maila
            </Typography>
            <Box className="flex gap-2">
              <TextField
                fullWidth
                label="Email do testu"
                variant="outlined"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendTestEmail()}
                className="bg-white"
                placeholder="twoj@email.com"
              />
              <Button
                variant="contained"
                onClick={sendTestEmail}
                disabled={sendingTest || !testEmail.trim()}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6"
                startIcon={<SendIcon />}
              >
                {sendingTest ? 'Wysyłanie...' : 'Wyślij test'}
              </Button>
            </Box>
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

          <Button
            variant="outlined"
            size="large"
            onClick={clearAllData}
            className="border-orange-500 text-orange-600 hover:bg-orange-50 px-8 py-3 text-lg font-bold"
            startIcon={<ClearAllIcon />}
          >
            Wyczyść wszystkie dane
          </Button>
        </Box>

        {hasAssignments && (
          <Alert severity="success" className="mt-6 bg-green-100 border-2 border-green-400">
            <Typography variant="body1" className="font-semibold">
              ✅ Losowanie zakończone! Każda osoba może sprawdzić swój link.
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* Draw Preview Dialog */}
      <Dialog 
        open={showPreviewDialog} 
        onClose={cancelDraw}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" className="font-bold">
            🎲 Podgląd losowania
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" className="mb-4 text-gray-600">
            Sprawdź przypisania przed potwierdzeniem. Po potwierdzeniu maile zostaną wysłane automatycznie.
          </Typography>
          {drawPreview && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell className="font-bold">Osoba</TableCell>
                    <TableCell className="font-bold">Wylosowała</TableCell>
                    <TableCell className="font-bold">Chce otrzymać</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drawPreview.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-semibold">{item.personName}</TableCell>
                      <TableCell className="font-semibold text-green-700">{item.assignedName}</TableCell>
                      <TableCell className="text-gray-600 italic">
                        {item.assignedWants || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={cancelDraw}
            variant="outlined"
            className="border-gray-400 text-gray-600"
            startIcon={<CloseIcon />}
          >
            Anuluj
          </Button>
          <Button
            onClick={confirmDraw}
            variant="contained"
            className="bg-gradient-to-r from-green-500 to-green-600 text-white"
            startIcon={<CheckIcon />}
            disabled={loading}
          >
            {loading ? 'Zapisywanie...' : 'Potwierdź i wyślij maile'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu Management Section */}
      <Paper className="p-6 mt-8 bg-white shadow-lg border-2 border-green-200">
        <Typography variant="h5" className="mb-4 font-bold text-yellow-400" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          🎉 Zarządzanie Menu Sylwestrowe 2025 🎊
        </Typography>

        {/* Menu Message Editor */}
        <Card className="mb-6 bg-white shadow-md border-2 border-blue-200">
          <CardContent>
            <Typography variant="h6" className="mb-4 font-semibold text-blue-700">
              Wiadomość na stronie menu
            </Typography>
            {!editingMenuMessage ? (
              <Box>
                <Typography variant="body1" className="mb-3 text-gray-700">
                  {menuMessage}
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => setEditingMenuMessage(true)}
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  Edytuj wiadomość
                </Button>
              </Box>
            ) : (
              <Box>
                <TextField
                  fullWidth
                  label="Wiadomość"
                  variant="outlined"
                  value={menuMessage}
                  onChange={(e) => setMenuMessage(e.target.value)}
                  multiline
                  rows={2}
                  className="mb-3 bg-white"
                />
                <Box className="flex gap-2">
                  <Button
                    variant="contained"
                    onClick={updateMenuMessage}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Zapisz
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setEditingMenuMessage(false);
                      fetchMenu(); // Reset to original
                    }}
                    className="border-gray-500 text-gray-600"
                  >
                    Anuluj
                  </Button>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Menu Items List */}
        <Card className="bg-white shadow-md border-2 border-green-200">
          <CardContent>
            <Box className="flex justify-between items-center mb-4">
              <Typography variant="h6" className="font-semibold text-green-700">
                Pozycje menu ({menuItems.length})
              </Typography>
              <Button
                variant="contained"
                onClick={() => setShowAddMenuDialog(true)}
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-gray-900 font-bold"
                startIcon={<AddIcon />}
              >
                Dodaj pozycję
              </Button>
            </Box>
            {menuItems.length === 0 ? (
              <Typography variant="body2" className="text-gray-500">
                Brak pozycji w menu
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className="font-bold">Danie/Napój</TableCell>
                      <TableCell className="font-bold">Kategoria</TableCell>
                      <TableCell className="font-bold">Przygotował/a</TableCell>
                      <TableCell className="font-bold">Opis</TableCell>
                      <TableCell className="font-bold">Zdjęcie</TableCell>
                      <TableCell className="font-bold">Akcje</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {menuItems.map((item) => {
                      const categoryLabels = {
                        dania: '🍽️ Dania',
                        przekąski: '🍿 Przekąski',
                        napoje: '🥤 Napoje',
                        alkohole: '🍷 Alkohole'
                      };
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-semibold">{item.dishName}</TableCell>
                          <TableCell>{categoryLabels[item.category] || item.category}</TableCell>
                          <TableCell>{item.madeBy}</TableCell>
                          <TableCell>{item.description || '-'}</TableCell>
                          <TableCell>{item.image ? '✓' : '-'}</TableCell>
                          <TableCell>
                            <IconButton
                              onClick={() => deleteMenuItem(item.id)}
                              className="text-red-500 hover:bg-red-50"
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
          </CardContent>
        </Card>
      </Paper>

      {/* Airbnb Management Section */}
      <Paper className="p-6 mt-8 bg-white shadow-lg border-2 border-blue-200">
        <Typography variant="h5" className="mb-4 font-bold text-blue-600" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          🏖️ Zarządzanie Wakacjami - Obiekty Airbnb 🏖️
        </Typography>

        <Card className="bg-white shadow-md border-2 border-blue-200">
          <CardContent>
            <Box className="flex justify-between items-center mb-4">
              <Typography variant="h6" className="font-semibold text-blue-700">
                Obiekty Airbnb ({airbnbObjects.length})
              </Typography>
              <Button
                variant="contained"
                onClick={() => setShowAddAirbnbDialog(true)}
                className="bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white font-bold"
                startIcon={<AddIcon />}
              >
                Dodaj obiekt Airbnb
              </Button>
            </Box>
            {airbnbObjects.length === 0 ? (
              <Typography variant="body2" className="text-gray-500">
                Brak obiektów Airbnb
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className="font-bold">Nazwa</TableCell>
                      <TableCell className="font-bold">Kraj</TableCell>
                      <TableCell className="font-bold">Kod embed</TableCell>
                      <TableCell className="font-bold">Cena (PLN)</TableCell>
                      <TableCell className="font-bold">Cena za osobę (PLN)</TableCell>
                      <TableCell className="font-bold">Akcje</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {airbnbObjects.map((obj) => (
                      <TableRow key={obj.id}>
                        <TableCell className="font-semibold">{obj.name || '-'}</TableCell>
                        <TableCell>{obj.country || '-'}</TableCell>
                        <TableCell>{obj.embedCode ? "✓ Kod embed" : "-"}</TableCell>
                        <TableCell>{obj.price ? `${obj.price.toFixed(2)} PLN` : '-'}</TableCell>
                        <TableCell>{obj.pricePerPerson ? `${obj.pricePerPerson.toFixed(2)} PLN` : '-'}</TableCell>
                        <TableCell>
                          <IconButton
                            onClick={() => handleEditAirbnbObject(obj)}
                            className="text-blue-500 hover:bg-blue-50"
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => deleteAirbnbObject(obj.id)}
                            className="text-red-500 hover:bg-red-50"
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Paper>

      {/* Voters (Names) Management Section */}
      <Paper className="p-6 mt-8 bg-white shadow-lg border-2 border-purple-200">
        <Typography variant="h5" className="mb-4 font-bold text-purple-600" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          👥 Zarządzanie Osobami (Imionami) 👥
        </Typography>

        <Card className="bg-white shadow-md border-2 border-purple-200">
          <CardContent>
            <Box className="flex justify-between items-center mb-4">
              <Typography variant="h6" className="font-semibold text-purple-700">
                Osoby ({voters.length})
              </Typography>
              <Box className="flex gap-2">
                <TextField
                  label="Dodaj imię"
                  variant="outlined"
                  size="small"
                  value={newVoterName}
                  onChange={(e) => setNewVoterName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addVoter()}
                  className="bg-white"
                />
                <Button
                  variant="contained"
                  onClick={addVoter}
                  className="bg-gradient-to-r from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700 text-white font-bold"
                  startIcon={<AddIcon />}
                  disabled={loading || !newVoterName.trim()}
                >
                  Dodaj
                </Button>
              </Box>
            </Box>
            {voters.length === 0 ? (
              <Typography variant="body2" className="text-gray-500">
                Brak osób. Dodaj osoby, które będą mogły głosować.
              </Typography>
            ) : (
              <Box className="flex flex-wrap gap-2">
                {voters.map((name) => (
                  <Chip
                    key={name}
                    label={name}
                    onDelete={() => deleteVoter(name)}
                    className="bg-purple-100 text-purple-800"
                    deleteIcon={<DeleteIcon />}
                  />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Paper>

      {/* Add/Edit Airbnb Object Dialog */}
      <Dialog open={showAddAirbnbDialog} onClose={() => {
        setShowAddAirbnbDialog(false);
        setEditingAirbnbObject(null);
        setNewAirbnbEmbed('');
        setNewAirbnbPros('');
        setNewAirbnbCons('');
        setNewAirbnbPrice('');
        setNewAirbnbPricePerPerson('');
        setNewAirbnbCountry('');
      }} maxWidth="md" fullWidth>
        <DialogTitle className="bg-gradient-to-r from-blue-400 to-blue-600 text-white">
          <Typography variant="h6" className="font-bold">
            {editingAirbnbObject ? 'Edytuj obiekt Airbnb' : 'Dodaj obiekt Airbnb'}
          </Typography>
        </DialogTitle>
        <DialogContent className="pt-6">
          <Box className="space-y-4">
            <TextField
              fullWidth
              label="Kod embed z Airbnb *"
              variant="outlined"
              multiline
              rows={6}
              value={newAirbnbEmbed}
              onChange={(e) => setNewAirbnbEmbed(e.target.value)}
              required
              className="bg-white"
              helperText="Skopiuj kod embed z Airbnb (przycisk 'Udostępnij' -> 'Zamieść')"
            />
            <TextField
              fullWidth
              label="Plusy (jeden na linię)"
              variant="outlined"
              multiline
              rows={4}
              value={newAirbnbPros}
              onChange={(e) => setNewAirbnbPros(e.target.value)}
              className="bg-white"
            />
            <TextField
              fullWidth
              label="Minusy (jeden na linię)"
              variant="outlined"
              multiline
              rows={4}
              value={newAirbnbCons}
              onChange={(e) => setNewAirbnbCons(e.target.value)}
              className="bg-white"
            />
            <TextField
              fullWidth
              label="Cena (PLN)"
              variant="outlined"
              type="number"
              value={newAirbnbPrice}
              onChange={(e) => {
                const price = e.target.value;
                setNewAirbnbPrice(price);
                // Automatically calculate price per person for 12 people
                if (price && !isNaN(price) && parseFloat(price) > 0) {
                  const pricePerPerson = (parseFloat(price) / 12).toFixed(2);
                  setNewAirbnbPricePerPerson(pricePerPerson);
                } else if (!price) {
                  setNewAirbnbPricePerPerson('');
                }
              }}
              className="bg-white"
            />
            <TextField
              fullWidth
              label="Cena za osobę dla 12 osób (PLN)"
              variant="outlined"
              type="number"
              value={newAirbnbPricePerPerson}
              onChange={(e) => setNewAirbnbPricePerPerson(e.target.value)}
              className="bg-white"
            />
            <TextField
              fullWidth
              label="Kraj"
              variant="outlined"
              value={newAirbnbCountry}
              onChange={(e) => setNewAirbnbCountry(e.target.value)}
              className="bg-white"
            />
          </Box>
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setShowAddAirbnbDialog(false)} className="text-gray-600">
            Anuluj
          </Button>
          <Button
            onClick={addAirbnbObject}
            variant="contained"
            className="bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white font-bold"
            disabled={loading || !newAirbnbEmbed.trim()}
          >
            {loading ? (editingAirbnbObject ? 'Zapisywanie...' : 'Dodawanie...') : (editingAirbnbObject ? 'Zapisz' : 'Dodaj')}
          </Button>
        </DialogActions>
      </Dialog>

<Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity || 'success'} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminPage;
