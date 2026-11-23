import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeSettingsCard from './ThemeSettingsCard';
import { useSiteTheme } from '../ThemeContext';
import { resolveMenuMessage } from './menuShared';
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
  Autocomplete,
  InputAdornment,
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
  Inventory2 as ArchiveIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const AdminPage = () => {
  const navigate = useNavigate();
  const { preset } = useSiteTheme();
  const [people, setPeople] = useState([]);
  const [newName, setNewName] = useState('');
  const [newWants, setNewWants] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newExcludeEmail, setNewExcludeEmail] = useState('');
  // Edycja osoby / prezentu (w tym lista osob, ktorych dana osoba nie moze wylosowac)
  const [editingPerson, setEditingPerson] = useState(null);
  const [personName, setPersonName] = useState('');
  const [personEmail, setPersonEmail] = useState('');
  const [personWants, setPersonWants] = useState('');
  const [personExcludes, setPersonExcludes] = useState([]); // lista emaili
  const [savingPerson, setSavingPerson] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  // Archiwum menu
  const [archives, setArchives] = useState([]);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveName, setArchiveName] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [drawPreview, setDrawPreview] = useState(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [menuMessage, setMenuMessage] = useState('Zobacz, co przygotowaliśmy na wigilijny stół!');
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
    // Sesja jest wazna tylko, gdy zapamietane jest tez haslo (potrzebne do zapisow chronionych na serwerze)
    const auth = sessionStorage.getItem('adminAuth');
    if (auth === 'true' && sessionStorage.getItem('adminPass')) {
      setIsAuthenticated(true);
      setShowPasswordDialog(false);
      fetchPeople();
      fetchMenu();
      fetchAirbnb();
      fetchVoters();
      fetchArchives();
    }
  }, []);

  // Logowanie: haslo sprawdza serwer (POST /api/admin/login); w przegladarce nie ma zadnego zapisanego hasla
  const handleLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!password) {
      setLoginError('Wpisz hasło');
      return;
    }
    setLoggingIn(true);
    setLoginError('');
    try {
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setLoginError(data.error || 'Nie udało się zalogować');
        setPassword('');
        return;
      }
      setIsAuthenticated(true);
      setShowPasswordDialog(false);
      sessionStorage.setItem('adminAuth', 'true');
      sessionStorage.setItem('adminPass', password);
      fetchPeople();
      fetchMenu();
      fetchAirbnb();
      fetchVoters();
      fetchArchives();
    } catch (error) {
      setLoginError('Brak połączenia z serwerem');
    } finally {
      setLoggingIn(false);
    }
  };

  const adminHeaders = () => ({
    'Content-Type': 'application/json',
    'x-admin-password': sessionStorage.getItem('adminPass') || '',
  });

  // ----- Archiwum menu -----
  const fetchArchives = async () => {
    try {
      const response = await fetch(`${API_URL}/archives`);
      if (response.ok) setArchives(await response.json());
    } catch (error) {
      console.error('Error fetching archives:', error);
    }
  };

  const createArchive = async () => {
    const name = archiveName.trim();
    if (!name) return;
    setArchiving(true);
    try {
      const response = await fetch(`${API_URL}/archives`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ name }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showSnackbar(data.error || 'Nie udało się utworzyć archiwum');
        return;
      }
      setMenuItems([]);
      setShowArchiveDialog(false);
      setArchiveName('');
      await fetchArchives();
      showSnackbar(`Menu przeniesione do archiwum „${data.archive.name}” (${data.archive.itemCount} pozycji)`);
    } catch (error) {
      showSnackbar('Błąd podczas archiwizacji: ' + error.message);
    } finally {
      setArchiving(false);
    }
  };

  const deleteArchive = async (archive) => {
    if (!window.confirm(`Usunąć archiwum „${archive.name}” (${archive.itemCount} pozycji)?\nTej operacji nie można cofnąć.`)) return;
    try {
      const response = await fetch(`${API_URL}/archives/${archive.id}`, { method: 'DELETE', headers: adminHeaders() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showSnackbar(data.error || 'Nie udało się usunąć archiwum');
        return;
      }
      setArchives((prev) => prev.filter((a) => a.id !== archive.id));
      showSnackbar('Archiwum zostało usunięte');
    } catch (error) {
      showSnackbar('Błąd podczas usuwania archiwum: ' + error.message);
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

  // Wszystkie emaile wykluczone dla osoby (stare pole excludeEmail + nowa lista excludeEmails)
  const getExcludes = (person) => {
    const all = [];
    if (person.excludeEmail) all.push(person.excludeEmail);
    if (Array.isArray(person.excludeEmails)) all.push(...person.excludeEmails);
    return [...new Set(all.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  };

  const personByEmail = (email) =>
    people.find((p) => p.email && p.email.trim().toLowerCase() === String(email).trim().toLowerCase());

  const openEditPerson = (person) => {
    setEditingPerson(person);
    setPersonName(person.name || '');
    setPersonEmail(person.email || '');
    setPersonWants(person.wants || '');
    setPersonExcludes(getExcludes(person));
  };

  const closeEditPerson = () => {
    setEditingPerson(null);
    setPersonExcludes([]);
  };

  const savePersonEdit = async () => {
    if (!editingPerson || !personName.trim()) return;
    setSavingPerson(true);
    try {
      const response = await fetch(`${API_URL}/people/${editingPerson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: personName,
          email: personEmail,
          wants: personWants,
          excludeEmails: personExcludes,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        showSnackbar(result.error || 'Błąd podczas zapisywania');
        return;
      }
      setPeople((prev) => prev.map((p) => (p.id === result.id ? result : p)));
      showSnackbar('Zapisano zmiany!');
      closeEditPerson();
    } catch (error) {
      showSnackbar('Błąd podczas zapisywania: ' + error.message);
    } finally {
      setSavingPerson(false);
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
        setMenuMessage(resolveMenuMessage(data.message, preset));
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
        <Dialog open={showPasswordDialog} onClose={() => navigate('/')} maxWidth="xs" fullWidth>
          <Box component="form" onSubmit={handleLogin} noValidate>
            <DialogTitle sx={{ background: 'linear-gradient(120deg, var(--primary-dark), var(--primary))', color: '#fff6e5', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              <Box className="flex items-center gap-2">
                <LockIcon />
                Panel administracyjny
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: '24px !important' }}>
              <TextField
                autoFocus
                margin="dense"
                label="Hasło"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                fullWidth
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={!!loginError}
                helperText={loginError || ' '}
                inputProps={{ style: { color: '#1a1a1a' } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button type="button" color="inherit" onClick={() => navigate('/')}>
                Anuluj
              </Button>
              <Button type="submit" variant="contained" disabled={loggingIn}>
                {loggingIn ? 'Logowanie...' : 'Zaloguj'}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" className="py-8 relative z-20">
      <Paper
        elevation={10}
        className="p-8 rounded-3xl admin-shell"
        style={{
          background: 'linear-gradient(160deg, #fff9ee 0%, #f3ead6 100%)',
          border: '1px solid rgba(217, 165, 33, 0.6)',
        }}
      >
        <Box className="text-center mb-8">
          <Typography sx={{ letterSpacing: 4, textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--gold-deep)', mb: 1 }}>
            {preset.adminEyebrow}
          </Typography>
          <Typography
            variant="h3"
            sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--primary-dark)', fontSize: { xs: '2rem', md: '2.6rem' } }}
          >
            🔐 Panel administracyjny
          </Typography>
          <hr className="gold-rule" style={{ marginTop: 16 }} />
        </Box>

        <ThemeSettingsCard />

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
                          {getExcludes(person).length > 0 && (
                            <Typography variant="body2" className="text-orange-600 mb-2 font-semibold">
                              🚫 Nie może wylosować:{' '}
                              {getExcludes(person)
                                .map((e) => (personByEmail(e) ? `${personByEmail(e).name} (${e})` : e))
                                .join(', ')}
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
                      onClick={() => openEditPerson(person)}
                      aria-label={`Edytuj ${person.name}`}
                      title="Edytuj osobę, prezent i wykluczenia"
                      className="text-blue-600"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => deletePerson(person.id)}
                      aria-label={`Usuń ${person.name}`}
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

      {/* Edit Person / Gift Dialog */}
      <Dialog open={!!editingPerson} onClose={closeEditPerson} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(120deg, var(--primary-dark), var(--primary))', color: '#fff6e5', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          Edytuj osobę i prezent
        </DialogTitle>
        <DialogContent sx={{ pt: '24px !important' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField label="Imię" value={personName} onChange={(e) => setPersonName(e.target.value)} fullWidth required />
            <TextField
              label="Email (do wysyłki linku)"
              type="email"
              value={personEmail}
              onChange={(e) => setPersonEmail(e.target.value)}
              fullWidth
              helperText="Po tym emailu inni mogą wykluczyć tę osobę z losowania."
            />
            <TextField
              label="Co chciałby/chciałaby otrzymać?"
              value={personWants}
              onChange={(e) => setPersonWants(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
            <Autocomplete
              multiple
              options={people.filter((p) => editingPerson && p.id !== editingPerson.id && p.email).map((p) => p.email.trim().toLowerCase())}
              value={personExcludes}
              onChange={(e, value) => setPersonExcludes(value)}
              getOptionLabel={(email) => (personByEmail(email) ? `${personByEmail(email).name} (${email})` : email)}
              renderTags={(value, getTagProps) =>
                value.map((email, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={email}
                    size="small"
                    color="warning"
                    label={personByEmail(email) ? personByEmail(email).name : email}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Osoby, których ta osoba nie może wylosować"
                  placeholder="Wybierz osobę"
                  helperText={`Możesz wybrać kilka osób. Dostępne są osoby, które mają email (${people.filter((p) => p.email).length} z ${people.length}).`}
                />
              )}
              noOptionsText="Brak osób z emailem do wykluczenia"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeEditPerson} color="inherit">
            Anuluj
          </Button>
          <Button onClick={savePersonEdit} variant="contained" disabled={savingPerson || !personName.trim()}>
            {savingPerson ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Archive Menu Dialog (prompt o nazwe archiwum) */}
      <Dialog open={showArchiveDialog} onClose={() => !archiving && setShowArchiveDialog(false)} maxWidth="sm" fullWidth>
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            createArchive();
          }}
        >
          <DialogTitle sx={{ background: 'linear-gradient(120deg, var(--primary-dark), var(--primary))', color: '#fff6e5', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            📦 Przenieś menu do archiwum
          </DialogTitle>
          <DialogContent sx={{ pt: '24px !important' }}>
            <Typography variant="body2" sx={{ mb: 2, mt: 1 }}>
              Wszystkie pozycje menu ({menuItems.length}) zostaną przeniesione do archiwum, a aktualne menu zostanie opróżnione.
              Archiwum będzie dostępne na stronie w zakładce „Archiwum”.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label="Nazwa archiwum"
              placeholder="np. Wigilia 2026"
              value={archiveName}
              onChange={(e) => setArchiveName(e.target.value)}
              inputProps={{ maxLength: 80, style: { color: '#1a1a1a' } }}
              helperText={`${archiveName.length}/80`}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button type="button" color="inherit" onClick={() => setShowArchiveDialog(false)} disabled={archiving}>
              Anuluj
            </Button>
            <Button type="submit" variant="contained" disabled={archiving || !archiveName.trim()}>
              {archiving ? 'Przenoszenie...' : 'Przenieś do archiwum'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

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
          {preset.emoji} Zarządzanie: {preset.menuTitle} {preset.emoji}
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

        {/* Archives */}
        <Card className="mb-6 bg-white shadow-md border-2 border-blue-200">
          <CardContent>
            <Typography variant="h6" className="mb-2 font-semibold text-blue-700">
              📦 Archiwa menu ({archives.length})
            </Typography>
            {archives.length === 0 ? (
              <Typography variant="body2" className="text-gray-500">
                Brak archiwów. Użyj przycisku „Przenieś wszystko do archiwum” przy liście pozycji menu.
              </Typography>
            ) : (
              <List dense>
                {archives.map((a) => (
                  <ListItem
                    key={a.id}
                    secondaryAction={
                      <IconButton edge="end" aria-label={`Usuń archiwum ${a.name}`} onClick={() => deleteArchive(a)} className="text-red-500">
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={a.name}
                      secondary={`${a.itemCount} pozycji · ${new Date(a.createdAt).toLocaleString('pl-PL')}`}
                    />
                  </ListItem>
                ))}
              </List>
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
              <Box className="flex gap-2 flex-wrap justify-end">
                <Button
                  variant="outlined"
                  onClick={() => setShowArchiveDialog(true)}
                  disabled={menuItems.length === 0}
                  startIcon={<ArchiveIcon />}
                >
                  Przenieś wszystko do archiwum
                </Button>
                <Button
                  variant="contained"
                  onClick={() => setShowAddMenuDialog(true)}
                  className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-gray-900 font-bold"
                  startIcon={<AddIcon />}
                >
                  Dodaj pozycję
                </Button>
              </Box>
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
