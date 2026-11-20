import { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [clubId, setClubId] = useState('');
  const [clubs, setClubs] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!['CLUB_ADMIN', 'FACULTY'].includes(role)) return;

    const fetchAvailableClubs = async () => {
      setClubsLoading(true);
      setError('');
      try {
        const endpoint = role === 'FACULTY' ? '/api/clubs' : '/api/clubs/available-for-admin';
        const response = await axios.get(`http://localhost:5005${endpoint}`);
        setClubs(response.data);
      } catch (requestError) {
        console.error('Failed to fetch clubs available for admin signup', requestError);
        setError(requestError.response?.data?.error || 'Failed to load available clubs.');
      } finally {
        setClubsLoading(false);
      }
    };

    fetchAvailableClubs();
  }, [role]);

  const handleRoleChange = (e) => {
    setRole(e.target.value);
    setClubId('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (role === 'CLUB_ADMIN' && !clubId) {
      setError('Please select a club for your club admin account.');
      return;
    }
    setIsLoading(true);
    setError('');
    
    const res = await register(name, email, password, role, clubId);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white overflow-hidden relative">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 relative z-10"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Create an account</h1>
          <p className="text-muted-foreground text-sm">Join the Smart Campus Platform today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name" 
                className="w-full bg-secondary/50 border border-border rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="College Email" 
                className="w-full bg-secondary/50 border border-border rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password" 
                className="w-full bg-secondary/50 border border-border rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>

            <select
              value={role}
              onChange={handleRoleChange}
              className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none text-muted-foreground"
            >
              <option value="STUDENT">Student</option>
              <option value="CLUB_ADMIN">Club Admin</option>
              <option value="FACULTY">Club Faculty</option>
            </select>

            {['CLUB_ADMIN', 'FACULTY'].includes(role) && (
              <select
                required={role === 'CLUB_ADMIN'}
                value={clubId}
                onChange={(e) => setClubId(e.target.value)}
                disabled={clubsLoading || (role === 'CLUB_ADMIN' && clubs.length === 0)}
                className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none text-muted-foreground disabled:opacity-60"
              >
                <option value="">
                  {clubsLoading
                    ? 'Loading clubs...'
                    : role === 'FACULTY'
                      ? 'Choose a club (optional)'
                      : clubs.length ? 'Choose a club' : 'No clubs available'}
                </option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>{club.name}</option>
                ))}
              </select>
            )}
            {role === 'FACULTY' && (
              <p className="text-xs text-muted-foreground">
                Register as Club Faculty. You can choose a club already associated with another faculty member.
              </p>
            )}

          </div>

          <button 
            type="submit" 
            disabled={isLoading || clubsLoading || (role === 'CLUB_ADMIN' && clubs.length === 0)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-3 text-sm font-semibold transition-all flex items-center justify-center space-x-2 mt-6 disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                <span>Sign Up</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}



