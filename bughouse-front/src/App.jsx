import { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  ThemeProvider as MuiThemeProvider, 
  createTheme, 
  CssBaseline,
  Container,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Avatar,
  IconButton,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  Card,
  CardContent,
  Chip,
  Switch,
  FormControlLabel,
  Skeleton,
  Alert,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Badge
} from '@mui/material';
import { 
  Brightness4, 
  Brightness7, 
  Logout, 
  BugReport, 
  Search, 
  Leaderboard,
  Person,
  Edit,
  Check,
  Close,
  Upload,
  EmojiEvents,
  LocalOffer,
  Code,
  Description,
  Title
} from '@mui/icons-material';

// --- Main App ---
function App() {
  const [mode, setMode] = useState('light');
  const colorMode = useMemo(() => ({
    toggleColorMode: () => {
      setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
    },
  }), []);

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: '#3b82f6' },
      secondary: { main: '#f59e0b' },
      background: {
        default: mode === 'light' ? '#f8fafc' : '#0f172a',
        paper: mode === 'light' ? '#ffffff' : '#1e293b',
      },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
  }), [mode]);

  // --- State ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [bugs, setBugs] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [language, setLanguage] = useState('JavaScript');
  const [showFixForm, setShowFixForm] = useState(null);
  const [fixCode, setFixCode] = useState('');
  const [view, setView] = useState('feed');
  const [leaderboard, setLeaderboard] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSolved, setShowSolved] = useState(false);
  const [profileUserId, setProfileUserId] = useState(null);
  const [profileBugs, setProfileBugs] = useState([]);
  const [profileUser, setProfileUser] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Fetch profile ---
  const fetchMyProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single();
    setMyProfile(data);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchMyProfile(session.user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchMyProfile(session.user.id);
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchBugs();
  }, [session]);

  useEffect(() => {
    if (view === 'leaderboard') fetchLeaderboard();
  }, [view]);

  useEffect(() => {
    if (profileUserId) fetchProfile(profileUserId);
  }, [profileUserId]);

  const fetchBugs = async () => {
    const { data, error } = await supabase
      .from('bugs')
      .select(`
        *,
        profiles:profiles(username, avatar_url, reputation, bio),
        submissions(
          id,
          fix_code,
          is_winner,
          solver_id,
          created_at,
          solver:profiles!submissions_solver_id_fkey(username, avatar_url, reputation)
        )
      `)
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    else setBugs(data || []);
  };

  const fetchLeaderboard = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('username, reputation, avatar_url')
      .order('reputation', { ascending: false })
      .limit(10);
    if (error) console.error(error);
    else setLeaderboard(data || []);
  };

  const fetchProfile = async (userId) => {
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('username, reputation, avatar_url, bio')
      .eq('id', userId)
      .single();
    if (userError) console.error(userError);
    else {
      setProfileUser(userData);
      setEditUsername(userData?.username || '');
      setEditBio(userData?.bio || '');
    }

    const { data: bugsData, error: bugsError } = await supabase
      .from('bugs')
      .select(`
        *,
        submissions(
          id,
          fix_code,
          is_winner,
          solver_id,
          solver:profiles!submissions_solver_id_fkey(username, avatar_url)
        )
      `)
      .eq('poster_id', userId)
      .order('created_at', { ascending: false });
    if (bugsError) console.error(bugsError);
    else setProfileBugs(bugsData || []);
  };

  // --- Auth handlers ---
  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const handleSignup = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert('Account created. Login now.');
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfileUserId(null);
    setMyProfile(null);
  };

  // --- Post bug ---
  const postBug = async () => {
    if (!title || !description) { alert('Title and description required'); return; }
    setLoading(true);
    const { error } = await supabase
      .from('bugs')
      .insert([{ title, description, code_snippet: codeSnippet, language, poster_id: session.user.id }]);
    if (error) alert(error.message);
    else { setTitle(''); setDescription(''); setCodeSnippet(''); fetchBugs(); }
    setLoading(false);
  };

  // --- Submit fix ---
  const submitFix = async (bugId) => {
    if (!fixCode.trim()) { alert('Write some code to fix'); return; }
    setLoading(true);
    const { error } = await supabase
      .from('submissions')
      .insert([{ bug_id: bugId, solver_id: session.user.id, fix_code: fixCode }]);
    if (error) alert(error.message);
    else {
      setFixCode('');
      setShowFixForm(null);
      fetchBugs();
    }
    setLoading(false);
  };

  // --- Pick winner ---
  const pickWinner = async (submissionId) => {
    if (!confirm('Pick this as the winning fix? This gives +10 rep to solver.')) return;
    setLoading(true);
    const { error } = await supabase.rpc('pick_winner', { submission_id: submissionId });
    if (error) alert(error.message);
    else {
      alert('Winner picked! Refreshing...');
      window.location.reload();
    }
    setLoading(false);
  };

  // --- Avatar upload ---
  const uploadAvatar = async (file) => {
    if (!file) return;
    setLoading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${session.user.id}/avatar.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });
    if (uploadError) { alert('Upload error: ' + uploadError.message); setLoading(false); return; }
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', session.user.id);
    if (updateError) alert('Update error: ' + updateError.message);
    else window.location.reload();
    setLoading(false);
  };

  // --- Profile update ---
  const updateProfile = async () => {
    const updates = {};
    if (editUsername) updates.username = editUsername;
    if (editBio) updates.bio = editBio;
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id);
    if (error) alert('Update error: ' + error.message);
    else {
      alert('Profile updated!');
      setEditingProfile(false);
      fetchMyProfile(session.user.id);
      fetchProfile(session.user.id);
    }
  };

  // --- Filter logic ---
  const getFilteredBugs = (bugList) => {
    if (view === 'feed') {
      return bugList.filter(bug => showSolved ? true : bug.status !== 'solved');
    } else if (view === 'graveyard') {
      return bugList.filter(bug => 
        bug.status === 'solved' &&
        (bug.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
         bug.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
         bug.language?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         bug.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return bugList;
  };

  const displayedBugs = getFilteredBugs(bugs);

  const getAvatar = (profile) => {
    return profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.username || 'U'}&background=3b82f6&color=fff&size=40`;
  };

  // --- Not logged in ---
  if (!session) {
    return (
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="sm" sx={{ mt: 8 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BugReport color="primary" /> Bughouse
            </Typography>
            <IconButton onClick={colorMode.toggleColorMode} color="inherit">
              {mode === 'light' ? <Brightness4 /> : <Brightness7 />}
            </IconButton>
          </Box>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Login or sign up to start debugging.
          </Typography>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
          />
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button variant="contained" onClick={handleLogin} disabled={loading} fullWidth>
              Login
            </Button>
            <Button variant="outlined" onClick={handleSignup} disabled={loading} fullWidth>
              Signup
            </Button>
          </Box>
          {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 2 }} />}
        </Container>
      </MuiThemeProvider>
    );
  }

  // --- Profile view ---
  if (profileUserId) {
    const isOwnProfile = profileUserId === session.user.id;
    return (
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="md" sx={{ mt: 3 }}>
          <Button variant="outlined" startIcon={<Close />} onClick={() => { setProfileUserId(null); setProfileUser(null); setProfileBugs([]); }} sx={{ mb: 2 }}>
            Back
          </Button>
          <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Avatar src={getAvatar(profileUser)} sx={{ width: 80, height: 80 }} />
            <Box sx={{ flex: 1 }}>
              {editingProfile && isOwnProfile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField label="Username" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} size="small" />
                  <TextField label="Bio" value={editBio} onChange={(e) => setEditBio(e.target.value)} size="small" />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="contained" onClick={updateProfile} startIcon={<Check />}>Save</Button>
                    <Button variant="outlined" onClick={() => setEditingProfile(false)}>Cancel</Button>
                  </Box>
                </Box>
              ) : (
                <>
                  <Typography variant="h5">{profileUser?.username || 'User'}</Typography>
                  <Typography color="text.secondary">{profileUser?.bio || 'No bio yet'}</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <EmojiEvents sx={{ fontSize: 16, verticalAlign: 'middle' }} /> Reputation: {profileUser?.reputation || 0}
                  </Typography>
                  {isOwnProfile && (
                    <Button variant="outlined" startIcon={<Edit />} onClick={() => setEditingProfile(true)} sx={{ mt: 1 }}>
                      Edit Profile
                    </Button>
                  )}
                </>
              )}
            </Box>
          </Paper>
          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Bugs posted ({profileBugs.length})</Typography>
          {profileBugs.length === 0 ? (
            <Alert severity="info">No bugs posted yet.</Alert>
          ) : profileBugs.map(bug => (
            <Card key={bug.id} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1">{bug.title}</Typography>
                <Chip label={bug.status} size="small" color={bug.status === 'solved' ? 'success' : 'default'} />
                <Typography variant="body2" color="text.secondary">{bug.description}</Typography>
                <Typography variant="caption">Fixes: {bug.submissions?.length || 0}</Typography>
              </CardContent>
            </Card>
          ))}
        </Container>
      </MuiThemeProvider>
    );
  }

  // --- Main feed (logged in) ---
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ mt: 2 }}>
        {/* App Bar */}
        <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar sx={{ px: 0, display: 'flex', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BugReport color="primary" />
              <Typography variant="h6">Bughouse</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>slay bugs</Typography>
            </Box>
            <Box>
              <IconButton onClick={colorMode.toggleColorMode} color="inherit">
                {mode === 'light' ? <Brightness4 /> : <Brightness7 />}
              </IconButton>
              <IconButton onClick={handleLogout} color="inherit">
                <Logout />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        {/* User bar */}
        <Paper sx={{ p: 1.5, my: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Avatar src={getAvatar(myProfile)} sx={{ width: 40, height: 40 }} />
          <Typography 
            sx={{ cursor: 'pointer', fontWeight: 'medium', '&:hover': { textDecoration: 'underline' } }}
            onClick={() => setProfileUserId(session.user.id)}
          >
            {myProfile?.username || session.user.email}
          </Typography>
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button variant="outlined" size="small" component="label" startIcon={<Upload />}>
              Change avatar
              <input type="file" accept="image/*" hidden onChange={(e) => uploadAvatar(e.target.files[0])} />
            </Button>
          </Box>
        </Paper>

        {/* Tabs */}
        <Tabs value={view} onChange={(_, val) => { setView(val); setSearchQuery(''); }} sx={{ mb: 2 }}>
          <Tab label="Feed" value="feed" icon={<BugReport />} iconPosition="start" />
          <Tab label="Graveyard" value="graveyard" icon={<Search />} iconPosition="start" />
          <Tab label="Leaderboard" value="leaderboard" icon={<Leaderboard />} iconPosition="start" />
        </Tabs>

        {view === 'graveyard' && (
          <TextField
            fullWidth
            placeholder="Search solved bugs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
            sx={{ mb: 2 }}
          />
        )}

        {view === 'feed' && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BugReport /> Post a bug
              </Typography>
              <TextField fullWidth label="Title" value={title} onChange={(e) => setTitle(e.target.value)} margin="normal" />
              <TextField fullWidth label="Description" value={description} onChange={(e) => setDescription(e.target.value)} margin="normal" multiline rows={3} />
              <TextField fullWidth label="Code snippet (optional)" value={codeSnippet} onChange={(e) => setCodeSnippet(e.target.value)} margin="normal" multiline rows={2} />
              <Select fullWidth value={language} onChange={(e) => setLanguage(e.target.value)} sx={{ mt: 1, mb: 2 }}>
                <MenuItem value="JavaScript">JavaScript</MenuItem>
                <MenuItem value="TypeScript">TypeScript</MenuItem>
                <MenuItem value="Python">Python</MenuItem>
                <MenuItem value="Go">Go</MenuItem>
                <MenuItem value="Rust">Rust</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
              <Button variant="contained" onClick={postBug} disabled={loading} startIcon={<BugReport />}>
                Post Bug
              </Button>
            </CardContent>
          </Card>
        )}

        {view === 'leaderboard' ? (
          <>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmojiEvents /> Top 10 Bug Slayers
            </Typography>
            <List>
              {leaderboard.length === 0 ? <Alert severity="info">No reputation yet.</Alert> : leaderboard.map((user, idx) => (
                <ListItem key={user.username} divider>
                  <ListItemAvatar>
                    <Avatar src={getAvatar(user)} />
                  </ListItemAvatar>
                  <ListItemText 
                    primary={
                      <span style={{ cursor: 'pointer', color: '#3b82f6' }} 
                        onClick={async () => {
                          const { data } = await supabase.from('profiles').select('id').eq('username', user.username).single();
                          if (data) setProfileUserId(data.id);
                        }}>
                        {idx+1}. {user.username || 'anonymous'}
                      </span>
                    }
                    secondary={`${user.reputation} reputation`}
                  />
                </ListItem>
              ))}
            </List>
          </>
        ) : (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{view === 'graveyard' ? '💀 Graveyard' : '📋 Feed'}</Typography>
              {view === 'feed' && (
                <FormControlLabel 
                  control={<Switch checked={showSolved} onChange={() => setShowSolved(!showSolved)} />} 
                  label="Show solved" 
                />
              )}
            </Box>
            {displayedBugs.length === 0 ? (
              <Alert severity="info" sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body1">✨ Nothing here yet</Typography>
                <Typography variant="body2">Be the first to post a bug or solve one!</Typography>
              </Alert>
            ) : displayedBugs.map(bug => {
              const isPoster = session.user.id === bug.poster_id;
              const alreadySubmitted = bug.submissions?.some(sub => sub.solver_id === session.user.id);
              const isSolved = bug.status === 'solved';

              return (
                <Card key={bug.id} sx={{ mb: 3 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                      <Avatar src={getAvatar(bug.profiles)} sx={{ width: 28, height: 28 }} />
                      <Typography variant="subtitle1">{bug.title}</Typography>
                      <Chip 
                        label={`by ${bug.profiles?.username || 'unknown'}`} 
                        size="small" 
                        variant="outlined"
                        onClick={() => setProfileUserId(bug.poster_id)}
                        sx={{ cursor: 'pointer' }}
                      />
                      {isSolved && <Chip label="Solved" color="success" size="small" />}
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>{bug.description}</Typography>
                    {bug.code_snippet && (
                      <Paper variant="outlined" sx={{ p: 1, bgcolor: 'background.default', fontFamily: 'monospace', fontSize: '0.85rem', overflow: 'auto' }}>
                        <pre style={{ margin: 0 }}>{bug.code_snippet}</pre>
                      </Paper>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Lang: {bug.language} | Status: {bug.status}
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Code fontSize="small" /> Fixes ({bug.submissions?.length || 0})
                    </Typography>
                    {bug.submissions?.map(sub => (
                      <Paper key={sub.id} variant="outlined" sx={{ p: 1, mt: 1, bgcolor: 'background.default' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Avatar src={getAvatar(sub.solver)} sx={{ width: 24, height: 24 }} />
                          <Typography variant="body2" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }} onClick={() => setProfileUserId(sub.solver_id)}>
                            {sub.solver?.username || 'unknown'}
                          </Typography>
                          {sub.is_winner && <Chip label="🏆 Winner" color="secondary" size="small" />}
                        </Box>
                        <pre style={{ margin: '0.5rem 0 0', padding: '0.5rem', background: theme.palette.background.paper, borderRadius: 4, overflow: 'auto' }}>
                          {sub.fix_code}
                        </pre>
                        {isPoster && !isSolved && !sub.is_winner && (
                          <Button variant="outlined" size="small" onClick={() => pickWinner(sub.id)} sx={{ mt: 1 }}>
                            👑 Pick as Winner
                          </Button>
                        )}
                      </Paper>
                    ))}

                    {!isPoster && !alreadySubmitted && !isSolved && (
                      <Box sx={{ mt: 1 }}>
                        {showFixForm === bug.id ? (
                          <Box>
                            <TextField
                              fullWidth
                              multiline
                              rows={3}
                              value={fixCode}
                              onChange={(e) => setFixCode(e.target.value)}
                              placeholder="Your fix code here..."
                              size="small"
                              sx={{ mt: 1 }}
                            />
                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                              <Button variant="contained" size="small" onClick={() => submitFix(bug.id)} disabled={loading}>
                                Submit Fix
                              </Button>
                              <Button variant="outlined" size="small" onClick={() => { setShowFixForm(null); setFixCode(''); }}>
                                Cancel
                              </Button>
                            </Box>
                          </Box>
                        ) : (
                          <Button variant="contained" size="small" onClick={() => setShowFixForm(bug.id)}>
                            🔧 Submit Fix
                          </Button>
                        )}
                      </Box>
                    )}
                    {isPoster && isSolved && <Typography variant="caption" color="text.secondary">✅ Solved. Well done.</Typography>}
                    {isPoster && !isSolved && bug.submissions?.length === 0 && <Typography variant="caption" color="text.secondary">⏳ Waiting for fixes...</Typography>}
                    {!isPoster && alreadySubmitted && <Typography variant="caption" color="text.secondary">📝 You already submitted a fix.</Typography>}
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </Container>
    </MuiThemeProvider>
  );
}

export default App;