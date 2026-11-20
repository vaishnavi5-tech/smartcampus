import { useCallback, useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Users, ArrowRight, ArrowLeft, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export default function Bookings() {
  const { user } = useContext(AuthContext);
  const [auditoriums, setAuditoriums] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [managedClub, setManagedClub] = useState(null);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [clubError, setClubError] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedAuditorium, setSelectedAuditorium] = useState(null);
  
  const [formData, setFormData] = useState({
    date: '',
    timeSlot: '',
    reason: ''
  });

  const fetchAuditoriums = useCallback(async () => {
    try {
      const token = localStorage.getItem('campusToken');
      const res = await axios.get('http://localhost:5005/api/bookings/auditoriums', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAuditoriums(res.data);
    } catch (error) {
      console.error(error);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchAuditoriums);
  }, [fetchAuditoriums]);

  useEffect(() => {
    const fetchBookingClubs = async () => {
      try {
        const token = localStorage.getItem('campusToken');
        if (user?.role === 'FACULTY') {
          const response = await axios.get('http://localhost:5005/api/clubs', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setClubs(response.data);
        } else if (user?.role === 'CLUB_ADMIN') {
          const response = await axios.get('http://localhost:5005/api/clubs/managed', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setManagedClub(response.data);
        }
      } catch (error) {
        console.error('Failed to load clubs for auditorium booking', error);
        setClubError(error.response?.data?.error || 'Unable to load club assignment.');
      }
    };
    void fetchBookingClubs();
  }, [user?.role]);

  const retryFetchAuditoriums = () => {
    setLoading(true);
    setFetchError(false);
    fetchAuditoriums();
  };

  const handleBook = async (e) => {
    e.preventDefault();
    const clubId = user?.role === 'FACULTY' ? selectedClubId : managedClub?.id;
    if (!clubId) {
      setClubError('Select a club before requesting the booking.');
      return;
    }
    try {
      const token = localStorage.getItem('campusToken');
      await axios.post('http://localhost:5005/api/bookings', {
        auditoriumId: selectedAuditorium.id,
        clubId,
        ...formData
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Booking request submitted successfully!');
      setShowModal(false);
      setFormData({ date: '', timeSlot: '', reason: '' });
      setClubError('');
      fetchAuditoriums();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to submit booking');
    }
  };

  const openBookingModal = (auditorium) => {
    setSelectedAuditorium(auditorium);
    setShowModal(true);
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center font-bold text-white">Loading Auditoriums...</div>;

  const canRequestBooking = ['CLUB_ADMIN', 'FACULTY'].includes(user?.role);

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed text-white font-sans selection:bg-amber-500/30 relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=2000')" }}>
      {/* Moderate Dark Blue Glassmorphism Overlay */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md pointer-events-none z-0" />
      
      <div className="max-w-7xl mx-auto p-6 md:p-12 relative z-10">
        
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between">
          <div>
            <Link to="/dashboard" className="text-slate-300 hover:text-white font-bold mb-6 inline-flex items-center transition-colors text-sm bg-slate-800/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2 drop-shadow-md">Book Auditoriums</h1>
            <p className="text-slate-300 text-lg font-bold drop-shadow-sm">Reserve campus venues for your club events and meetings.</p>
          </div>
          
          {!canRequestBooking && (
            <div className="mt-6 md:mt-0 bg-rose-500/10 backdrop-blur-md border border-rose-500/20 p-5 rounded-2xl max-w-sm flex items-start shadow-lg">
              <AlertCircle className="w-6 h-6 text-rose-500 mr-3 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-extrabold text-rose-500">Restricted Access</h4>
                <p className="text-xs text-rose-300/80 font-bold mt-1">Only Club Admins and Club Faculty can request auditorium bookings.</p>
              </div>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {fetchError ? (
            <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-rose-400/30 bg-slate-800/80 p-8 text-center">
              <p className="mb-4 text-slate-200">Unable to load auditoriums. Check that the backend is running, then try again.</p>
              <button onClick={retryFetchAuditoriums} className="rounded-xl bg-amber-500 px-5 py-2 font-bold text-slate-900 hover:bg-amber-400">Retry</button>
            </div>
          ) : auditoriums.length === 0 ? (
            <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-white/10 bg-slate-800/80 p-8 text-center text-slate-200">
              No auditoriums are available yet.
            </div>
          ) : auditoriums.map((auditorium, index) => (
            <motion.div 
              key={auditorium.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-800/60 backdrop-blur-xl rounded-[2rem] border border-white/10 overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all flex flex-col group"
            >
              <div className="h-48 relative bg-slate-900 overflow-hidden border-b border-white/10">
                <img 
                  src={auditorium.images ? auditorium.images.split(',')[0] : "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800"} 
                  onError={(e) => e.target.src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80" 
                  alt={auditorium.name} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent pointer-events-none" />
              </div>
              
              <div className="p-8 flex-1 flex flex-col relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-2xl font-extrabold text-white line-clamp-1">{auditorium.name}</h3>
                  <div className="bg-slate-900/80 border border-white/10 px-4 py-1.5 rounded-xl flex items-center text-xs font-black text-amber-500 shadow-sm">
                    <Users className="w-4 h-4 mr-2" /> {auditorium.capacity}
                  </div>
                </div>
                
                <div className="space-y-3 mb-8">
                  {auditorium.amenities?.split(',').map((amenity, i) => (
                    <div key={i} className="flex items-center text-sm font-bold text-slate-300">
                      <div className="w-6 h-6 rounded-full bg-slate-900/50 flex items-center justify-center mr-3 border border-white/5">
                        <CheckCircle className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      {amenity.trim()}
                    </div>
                  ))}
                </div>
                
                <div className="mt-auto">
                  <button 
                    onClick={() => openBookingModal(auditorium)}
                    disabled={!canRequestBooking}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-extrabold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm flex items-center justify-center"
                  >
                    {canRequestBooking ? 'Request Booking' : 'Club Admins / Faculty Only'} <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-800 rounded-[2rem] border border-white/10 p-8 md:p-10 w-full max-w-lg shadow-2xl relative"
            >
              <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white bg-slate-700 p-2.5 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
              
              <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-white mb-2">Book {selectedAuditorium?.name}</h2>
                <p className="text-slate-400 text-sm font-bold">Submit your request. Approvals usually take 24 hours.</p>
              </div>

              <form onSubmit={handleBook} className="space-y-5">
                {user?.role === 'FACULTY' ? (
                  <div>
                    <label className="mb-2 block text-xs font-extrabold uppercase tracking-widest text-slate-400">Club</label>
                    <select
                      required
                      value={selectedClubId}
                      onChange={event => {
                        setSelectedClubId(event.target.value);
                        setClubError('');
                      }}
                      className="w-full rounded-xl border border-white/5 bg-slate-900 px-4 py-3.5 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-amber-500/50"
                    >
                      <option value="">Select a club</option>
                      {clubs.map(club => <option key={club.id} value={club.id}>{club.name}</option>)}
                    </select>
                    <p className="mt-1 text-[11px] text-slate-400">Club Faculty may request for any club, including one assigned to another faculty member.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/5 bg-slate-900 px-4 py-3.5 text-sm font-semibold text-slate-200">
                    Club: {managedClub?.name || 'Loading your club...'}
                  </div>
                )}
                {clubError && <p role="alert" className="text-xs font-semibold text-rose-300">{clubError}</p>}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-2 uppercase tracking-widest">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-900 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-amber-500/50 text-white font-medium outline-none shadow-inner [color-scheme:dark]" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-2 uppercase tracking-widest">Time Slot</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <select required value={formData.timeSlot} onChange={e => setFormData({...formData, timeSlot: e.target.value})} className="w-full bg-slate-900 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-amber-500/50 text-white font-medium outline-none appearance-none shadow-inner">
                      <option value="">Select a slot</option>
                      <option value="09:00 AM - 12:00 PM">09:00 AM - 12:00 PM</option>
                      <option value="01:00 PM - 04:00 PM">01:00 PM - 04:00 PM</option>
                      <option value="05:00 PM - 08:00 PM">05:00 PM - 08:00 PM</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-2 uppercase tracking-widest">Reason / Event Details</label>
                  <textarea required value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full bg-slate-900 border border-white/5 rounded-xl py-3.5 px-4 focus:ring-2 focus:ring-amber-500/50 text-white font-medium h-28 resize-none outline-none shadow-inner" placeholder="Provide details about the event..."></textarea>
                </div>
                
                <button type="submit" className="w-full mt-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-extrabold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 text-base">
                  Submit Request
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


