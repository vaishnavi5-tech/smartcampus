import { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Users, Calendar, Award, Briefcase, Activity, CheckCircle, Shield, UserPlus } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function SuperAdmin() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availableClubs, setAvailableClubs] = useState([]);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', clubId: '' });
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [headUsers, setHeadUsers] = useState([]);
  const [headForm, setHeadForm] = useState({ name: '', email: '', password: '', department: '' });
  const [headError, setHeadError] = useState('');
  const [headSuccess, setHeadSuccess] = useState('');
  const [creatingHead, setCreatingHead] = useState(false);
  const [clubFacultyUsers, setClubFacultyUsers] = useState([]);
  const [allClubs, setAllClubs] = useState([]);
  const [facultyAssignment, setFacultyAssignment] = useState({ facultyId: '', clubId: '' });
  const [facultyAssignmentError, setFacultyAssignmentError] = useState('');
  const [facultyAssignmentSuccess, setFacultyAssignmentSuccess] = useState('');
  const [assigningFaculty, setAssigningFaculty] = useState(false);

  useEffect(() => {
    // In a real app, this would be a dedicated endpoint like /api/admin/stats
    // We will simulate the data fetching for the Dashboard
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('campusToken');
        
        // Fetch users, clubs, events, bookings
        const [usersRes, clubsRes, eventsRes, bookingsRes] = await Promise.all([
          axios.get('http://localhost:5005/api/auth/users', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
          axios.get('http://localhost:5005/api/clubs', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:5005/api/events', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:5005/api/bookings', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
        ]);

        setStats({
          users: usersRes.data.length || 156, // fallback for demo
          clubs: clubsRes.data.length,
          events: eventsRes.data.length,
          bookings: bookingsRes.data.length || 42 // fallback for demo
        });
      } catch (error) {
        console.error("Failed to fetch super admin stats");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchAvailableClubs = async () => {
      try {
        const token = localStorage.getItem('campusToken');
        const response = await axios.get('http://localhost:5005/api/clubs/available-for-admin', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAvailableClubs(response.data);
      } catch (error) {
        console.error('Failed to fetch clubs available for admin assignment', error);
        setAdminError(error.response?.data?.error || 'Failed to load available clubs.');
      }
    };
    fetchAvailableClubs();
  }, []);

  useEffect(() => {
    const fetchFacultyAssignmentOptions = async () => {
      try {
        const token = localStorage.getItem('campusToken');
        const headers = { Authorization: `Bearer ${token}` };
        const [usersResponse, clubsResponse] = await Promise.all([
          axios.get('http://localhost:5005/api/auth/users', { headers }),
          axios.get('http://localhost:5005/api/clubs', { headers })
        ]);
        setClubFacultyUsers(usersResponse.data.filter(account => account.role === 'FACULTY'));
        setHeadUsers(usersResponse.data.filter(account => account.role === 'HEAD'));
        setAllClubs(clubsResponse.data);
      } catch (error) {
        console.error('Failed to load faculty assignment options', error);
        setFacultyAssignmentError(error.response?.data?.error || 'Failed to load faculty and clubs.');
      }
    };
    fetchFacultyAssignmentOptions();
  }, []);

  const createClubAdmin = async (e) => {
    e.preventDefault();
    setCreatingAdmin(true);
    setAdminError('');
    setAdminSuccess('');
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.post('http://localhost:5005/api/auth/club-admin', adminForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdminSuccess(`${response.data.user.name} is now the admin for the selected club.`);
      setAvailableClubs((clubs) => clubs.filter((club) => club.id !== adminForm.clubId));
      setAdminForm({ name: '', email: '', password: '', clubId: '' });
    } catch (error) {
      console.error('Failed to create club admin', error);
      setAdminError(error.response?.data?.error || 'Failed to create club admin.');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const createHeadAccount = async (event) => {
    event.preventDefault();
    setCreatingHead(true);
    setHeadError('');
    setHeadSuccess('');
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.post('http://localhost:5005/api/auth/head', headForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHeadUsers(users => [...users, response.data.user]);
      setHeadSuccess(`${response.data.user.name} can now review auditorium bookings.`);
      setHeadForm({ name: '', email: '', password: '', department: '' });
    } catch (error) {
      console.error('Failed to create Head account', error);
      setHeadError(error.response?.data?.error || 'Failed to create Head account.');
    } finally {
      setCreatingHead(false);
    }
  };

  const assignFacultyToClub = async (event) => {
    event.preventDefault();
    setAssigningFaculty(true);
    setFacultyAssignmentError('');
    setFacultyAssignmentSuccess('');
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.post(
        `http://localhost:5005/api/clubs/${facultyAssignment.clubId}/faculty-assignments`,
        { facultyId: facultyAssignment.facultyId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAllClubs(clubs => clubs.map(club => club.id === response.data.id ? { ...club, ...response.data } : club));
      setFacultyAssignmentSuccess(`${clubFacultyUsers.find(faculty => faculty.id === facultyAssignment.facultyId)?.name} is assigned to ${response.data.name} as club faculty.`);
      setFacultyAssignment({ facultyId: '', clubId: '' });
    } catch (error) {
      console.error('Failed to assign club faculty', error);
      setFacultyAssignmentError(error.response?.data?.error || 'Failed to assign club faculty.');
    } finally {
      setAssigningFaculty(false);
    }
  };

  const removeFacultyAssignment = async (clubId, facultyId) => {
    setFacultyAssignmentError('');
    setFacultyAssignmentSuccess('');
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.delete(
        `http://localhost:5005/api/clubs/${clubId}/faculty-assignments/${facultyId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAllClubs(clubs => clubs.map(club => club.id === response.data.id ? { ...club, ...response.data } : club));
    } catch (error) {
      console.error('Failed to remove club faculty assignment', error);
      setFacultyAssignmentError(error.response?.data?.error || 'Failed to remove club faculty.');
    }
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-10 font-sans relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/20 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[150px] pointer-events-none" />
      
      <header className="mb-12 max-w-7xl mx-auto relative z-10 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center">
            <Shield className="w-10 h-10 mr-4 text-primary" /> Super Admin Center
          </h1>
          <p className="text-slate-400 font-medium mt-2 text-lg">God-mode view of the Smart Campus Platform.</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 px-6 py-3 rounded-xl flex items-center shadow-lg">
          <Activity className="w-5 h-5 text-emerald-400 mr-3 animate-pulse" />
          <span className="font-extrabold text-sm tracking-widest uppercase">System Online</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        
        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Students" value={loading ? '...' : stats?.users} icon={<Users className="w-8 h-8"/>} color="text-blue-400" bg="bg-blue-400/10" border="border-blue-400/20" />
          <StatCard title="Active Clubs" value={loading ? '...' : stats?.clubs} icon={<Briefcase className="w-8 h-8"/>} color="text-primary" bg="bg-primary/10" border="border-primary/20" />
          <StatCard title="Upcoming Events" value={loading ? '...' : stats?.events} icon={<Award className="w-8 h-8"/>} color="text-amber-400" bg="bg-amber-400/10" border="border-amber-400/20" />
          <StatCard title="Auditorium Bookings" value={loading ? '...' : stats?.bookings} icon={<Calendar className="w-8 h-8"/>} color="text-emerald-400" bg="bg-emerald-400/10" border="border-emerald-400/20" />
        </div>

        <section className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-3xl p-8 shadow-xl">
          <h2 className="text-2xl font-extrabold mb-2 flex items-center">
            <UserPlus className="w-6 h-6 mr-3 text-primary" /> Create Club Admin
          </h2>
          <p className="text-sm text-slate-400 mb-6">Each club can have one assigned admin, and each admin can manage one club.</p>
          {adminError && <p role="alert" className="mb-4 text-sm text-rose-400">{adminError}</p>}
          {adminSuccess && <p role="status" className="mb-4 text-sm text-emerald-400">{adminSuccess}</p>}
          {availableClubs.length === 0 ? (
            <p className="text-sm text-slate-400">There are no clubs available for admin assignment.</p>
          ) : (
            <form onSubmit={createClubAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                required
                value={adminForm.name}
                onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                placeholder="Full name"
                aria-label="Club admin full name"
                className="bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500"
              />
              <input
                required
                type="email"
                value={adminForm.email}
                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                placeholder="Email"
                aria-label="Club admin email"
                className="bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500"
              />
              <input
                required
                type="password"
                minLength={8}
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                placeholder="Temporary password (8+ characters)"
                aria-label="Club admin password"
                className="bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500"
              />
              <select
                required
                value={adminForm.clubId}
                onChange={(e) => setAdminForm({ ...adminForm, clubId: e.target.value })}
                aria-label="Club to assign"
                className="bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white"
              >
                <option value="">Choose an available club</option>
                {availableClubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
              </select>
              <button
                type="submit"
                disabled={creatingAdmin}
                className="md:col-span-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all"
              >
                {creatingAdmin ? 'Creating admin...' : 'Create and assign club admin'}
              </button>
            </form>
          )}
        </section>

        <section className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-3xl p-8 shadow-xl">
          <h2 className="text-2xl font-extrabold mb-2 flex items-center">
            <Shield className="w-6 h-6 mr-3 text-amber-400" /> Create Head Account
          </h2>
          <p className="text-sm text-slate-400 mb-6">Only Heads can approve or reject auditorium bookings and issue the approval letter.</p>
          {headError && <p role="alert" className="mb-4 text-sm text-rose-400">{headError}</p>}
          {headSuccess && <p role="status" className="mb-4 text-sm text-emerald-400">{headSuccess}</p>}
          <form onSubmit={createHeadAccount} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              required
              value={headForm.name}
              onChange={event => setHeadForm({ ...headForm, name: event.target.value })}
              placeholder="Head's full name"
              aria-label="Head full name"
              className="bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500"
            />
            <input
              required
              type="email"
              value={headForm.email}
              onChange={event => setHeadForm({ ...headForm, email: event.target.value })}
              placeholder="Head's email"
              aria-label="Head email"
              className="bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500"
            />
            <input
              required
              type="password"
              minLength={8}
              value={headForm.password}
              onChange={event => setHeadForm({ ...headForm, password: event.target.value })}
              placeholder="Temporary password (8+ characters)"
              aria-label="Head password"
              className="bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500"
            />
            <input
              value={headForm.department}
              onChange={event => setHeadForm({ ...headForm, department: event.target.value })}
              placeholder="Department (optional)"
              aria-label="Head department"
              className="bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={creatingHead}
              className="md:col-span-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold py-3 rounded-xl transition-all"
            >
              {creatingHead ? 'Creating Head...' : 'Create Head account'}
            </button>
          </form>
          <p className="mt-4 text-xs text-slate-500">
            Current Heads: {headUsers.length ? headUsers.map(head => head.name).join(', ') : 'None assigned'}
          </p>
        </section>

        <section className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-3xl p-8 shadow-xl">
          <h2 className="text-2xl font-extrabold mb-2 flex items-center">
            <Users className="w-6 h-6 mr-3 text-blue-400" /> Assign Club Faculty
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            A club may have multiple faculty members. Assigning another faculty member makes them the primary coordinator without removing existing faculty.
          </p>
          {facultyAssignmentError && <p role="alert" className="mb-4 text-sm text-rose-400">{facultyAssignmentError}</p>}
          {facultyAssignmentSuccess && <p role="status" className="mb-4 text-sm text-emerald-400">{facultyAssignmentSuccess}</p>}
          <form onSubmit={assignFacultyToClub} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              required
              value={facultyAssignment.facultyId}
              onChange={event => setFacultyAssignment({ ...facultyAssignment, facultyId: event.target.value })}
              aria-label="Faculty member to assign"
              className="bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white"
            >
              <option value="">Choose Club Faculty</option>
              {clubFacultyUsers.map(faculty => (
                <option key={faculty.id} value={faculty.id}>{faculty.name} ({faculty.department || faculty.email})</option>
              ))}
            </select>
            <select
              required
              value={facultyAssignment.clubId}
              onChange={event => setFacultyAssignment({ ...facultyAssignment, clubId: event.target.value })}
              aria-label="Club for faculty assignment"
              className="bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white"
            >
              <option value="">Choose a club</option>
              {allClubs.map(club => <option key={club.id} value={club.id}>{club.name}</option>)}
            </select>
            <button
              type="submit"
              disabled={assigningFaculty || clubFacultyUsers.length === 0 || allClubs.length === 0}
              className="md:col-span-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-60 text-slate-950 font-bold py-3 rounded-xl transition-all"
            >
              {assigningFaculty ? 'Assigning...' : 'Assign Club Faculty'}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {allClubs.map(club => {
              const facultyMembers = [...(club.facultyAssignments || []).map(assignment => assignment.faculty)];
              if (club.facultyCoordinator && !facultyMembers.some(faculty => faculty.id === club.facultyCoordinator.id)) {
                facultyMembers.unshift(club.facultyCoordinator);
              }
              return (
                <div key={club.id} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                  <p className="font-bold text-white">{club.name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Primary coordinator: {club.facultyCoordinator?.name || 'Not assigned'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {facultyMembers.length ? facultyMembers.map(faculty => (
                      <span key={faculty.id} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200">
                        {faculty.name}
                        {club.facultyCoordinator?.id === faculty.id && <strong className="text-amber-300">Primary</strong>}
                        <button
                          type="button"
                          onClick={() => removeFacultyAssignment(club.id, faculty.id)}
                          className="text-rose-300 hover:text-rose-200"
                          aria-label={`Remove ${faculty.name} from ${club.name}`}
                        >
                          Remove
                        </button>
                      </span>
                    )) : <span className="text-xs text-slate-500">No faculty assigned.</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
          
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-3xl p-8 shadow-xl">
            <h2 className="text-2xl font-extrabold mb-6 flex items-center">
              <Activity className="w-6 h-6 mr-3 text-slate-400" /> Platform Activity Feed
            </h2>
            <div className="space-y-4">
              {[
                { time: '10 mins ago', text: 'New club "The Byte Club" was created.', type: 'club' },
                { time: '1 hour ago', text: 'Auditorium 1 booked for "Annual Tech Symposium".', type: 'booking' },
                { time: '3 hours ago', text: '14 new students registered on the platform.', type: 'user' },
                { time: '5 hours ago', text: 'Event "Hackathon 2026" reached max capacity (500/500).', type: 'event' }
              ].map((act, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/50">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${act.type === 'club' ? 'bg-primary/20 text-primary' : act.type === 'booking' ? 'bg-emerald-500/20 text-emerald-400' : act.type === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-200">{act.text}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-b from-primary/20 to-slate-800/50 border border-primary/30 rounded-3xl p-8 shadow-xl">
            <h2 className="text-xl font-extrabold mb-6 flex items-center">
              <Shield className="w-6 h-6 mr-3 text-primary" /> Management Hub
            </h2>
            <div className="space-y-3">
              <button className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold py-4 rounded-xl transition-all text-sm flex items-center justify-between px-6 shadow-sm">
                <span>Manage Users & Roles</span> <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
              <button className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold py-4 rounded-xl transition-all text-sm flex items-center justify-between px-6 shadow-sm">
                <span>Audit Logs</span> <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
              <button className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold py-4 rounded-xl transition-all text-sm flex items-center justify-between px-6 shadow-sm">
                <span>Platform Settings</span> <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
              <button className="w-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold py-4 rounded-xl transition-all text-sm flex items-center justify-center mt-6">
                System Restart
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, bg, border }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={`bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-3xl p-6 shadow-lg relative overflow-hidden`}
    >
      <div className={`absolute -right-4 -top-4 w-24 h-24 ${bg} rounded-full blur-2xl pointer-events-none`} />
      <div className={`w-14 h-14 rounded-2xl ${bg} ${border} border flex items-center justify-center ${color} mb-6`}>
        {icon}
      </div>
      <h3 className="text-4xl font-extrabold mb-2 text-white">{value}</h3>
      <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">{title}</p>
    </motion.div>
  );
}

function ArrowRight({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>;
}




