import { useCallback, useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Users, ArrowRight, ArrowLeft, X, Clock } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

const getLocalDate = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

export default function Events() {
  const { user } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    date: '',
    timeSlot: '09:00 AM - 12:00 PM',
    venueId: '',
    capacity: '100',
    clubId: ''
  });

  useEffect(() => {
    if (!showCreateEvent) return undefined;

    let active = true;
    const fetchClubs = async () => {
      try {
        const token = localStorage.getItem('campusToken');
        if (user?.role === 'CLUB_ADMIN') {
          const response = await axios.get('http://localhost:5005/api/clubs/managed', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (active) setClubs([response.data]);
        } else {
          const response = await axios.get('http://localhost:5005/api/clubs');
          if (active) setClubs(response.data.map(({ id, name }) => ({ id, name })));
        }
      } catch (error) {
        if (active) {
          console.error('Failed to load clubs for event creation', error);
          setCreateError(error.response?.data?.error || 'Failed to load the club for this event.');
        }
      }
    };
    fetchClubs();
    return () => { active = false; };
  }, [showCreateEvent, user?.role]);

  useEffect(() => {
    if (!showCreateEvent || !createForm.date || !createForm.timeSlot) return undefined;

    let active = true;
    const fetchVenueAvailability = async () => {
      setVenuesLoading(true);
      setCreateError('');
      try {
        const token = localStorage.getItem('campusToken');
        const response = await axios.get('http://localhost:5005/api/events/venues/availability', {
          params: { date: createForm.date, timeSlot: createForm.timeSlot },
          headers: { Authorization: `Bearer ${token}` }
        });
        if (active) {
          setVenues(response.data);
          setCreateForm((form) => ({
            ...form,
            venueId: response.data.some((venue) => venue.id === form.venueId && venue.available)
              ? form.venueId
              : response.data.find((venue) => venue.available)?.id || ''
          }));
        }
      } catch (error) {
        if (active) {
          console.error('Failed to check venue availability', error);
          setCreateError(error.response?.data?.error || 'Failed to check venue availability.');
          setVenues([]);
        }
      } finally {
        if (active) setVenuesLoading(false);
      }
    };
    fetchVenueAvailability();
    return () => { active = false; };
  }, [showCreateEvent, createForm.date, createForm.timeSlot]);

  const openCreateEvent = () => {
    setCreateForm({
      title: '',
      description: '',
      date: getLocalDate(),
      timeSlot: '09:00 AM - 12:00 PM',
      venueId: '',
      capacity: '100',
      clubId: ''
    });
    setCreateError('');
    setShowCreateEvent(true);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setCreatingEvent(true);
    setCreateError('');
    try {
      const token = localStorage.getItem('campusToken');
      const payload = {
        title: createForm.title,
        description: createForm.description,
        date: createForm.date,
        timeSlot: createForm.timeSlot,
        venueId: createForm.venueId,
        capacity: createForm.capacity,
        ...(['FACULTY', 'SUPER_ADMIN'].includes(user?.role) ? { clubId: createForm.clubId } : {})
      };
      await axios.post('http://localhost:5005/api/events', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowCreateEvent(false);
      await fetchEvents();
    } catch (error) {
      console.error('Failed to create event', error);
      setCreateError(error.response?.data?.error || 'Failed to create event.');
    } finally {
      setCreatingEvent(false);
    }
  };

  const fetchEvents = useCallback(async () => {
    try {
      const token = localStorage.getItem('campusToken');
      const res = await axios.get('http://localhost:5005/api/events', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center font-bold text-white">Loading Events...</div>;

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed text-white font-sans selection:bg-amber-500/30 relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=2000')" }}>
      {/* Moderate Dark Blue Glassmorphism Overlay */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto p-6 md:p-12 relative z-10">
        <header className="mb-12">
          <Link to="/dashboard" className="text-slate-300 hover:text-white font-bold mb-4 inline-flex items-center transition-colors text-sm bg-slate-800/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-2 drop-shadow-md">Campus Events</h1>
              <p className="text-slate-300 text-lg font-bold drop-shadow-sm">Discover technical workshops, hackathons, and cultural fests.</p>
            </div>
            
            {['CLUB_ADMIN', 'FACULTY', 'SUPER_ADMIN'].includes(user?.role) && (
              <div className="mt-6 md:mt-0">
                <button onClick={openCreateEvent} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white px-6 py-3 rounded-2xl text-sm font-extrabold transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 inline-flex items-center">
                  + Create Event
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event, index) => (
            <motion.div 
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link 
                to={`/events/${event.id}`}
                className="bg-slate-800/60 backdrop-blur-xl rounded-[2rem] border border-white/10 overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all group flex flex-col h-full"
              >
                <div className="h-48 relative bg-slate-900 overflow-hidden border-b border-white/10">
                  <img 
                    src={event.posters ? event.posters.split(',')[0] : "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200"} 
                    onError={(e) => e.target.src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200"} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90" 
                    alt={event.title} 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent pointer-events-none" />
                  
                  <div className="absolute top-4 left-4 flex flex-col items-center justify-center w-14 h-14 bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/10 text-white">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-xl font-black leading-none text-white">{new Date(event.date).getDate()}</span>
                  </div>
                </div>
                
                <div className="p-8 flex-1 flex flex-col relative z-10">
                  <div className="flex items-center space-x-3 mb-4">
                    {event.club.logo ? (
                      <img src={event.club.logo} className="w-8 h-8 rounded-xl object-cover shadow-sm border border-white/10" alt="Club Logo" />
                    ) : (
                      <div className="w-8 h-8 bg-slate-700 rounded-xl flex items-center justify-center text-xs font-bold text-slate-300 border border-white/5 shadow-sm">
                        C
                      </div>
                    )}
                    <span className="text-xs font-extrabold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">{event.club.name}</span>
                  </div>
                  
                  <h3 className="text-2xl font-extrabold text-white mb-3 line-clamp-1">{event.title}</h3>
                  <p className="text-slate-400 text-sm font-medium mb-8 line-clamp-2 leading-relaxed">{event.description}</p>
                  
                  <div className="mt-auto space-y-3 mb-8">
                    <div className="flex items-center text-xs font-bold text-slate-300 bg-slate-900/50 px-3 py-2 rounded-xl border border-white/5">
                      <MapPin className="w-4 h-4 mr-2 text-amber-500" />
                      {event.venue || 'TBD'}
                    </div>
                    {event.timeSlot && (
                      <div className="flex items-center text-xs font-bold text-slate-300 bg-slate-900/50 px-3 py-2 rounded-xl border border-white/5">
                        <Clock className="w-4 h-4 mr-2 text-amber-500" />
                        {event.timeSlot}
                      </div>
                    )}
                    <div className="flex items-center text-xs font-bold text-slate-300 bg-slate-900/50 px-3 py-2 rounded-xl border border-white/5">
                      <Users className="w-4 h-4 mr-2 text-amber-500" />
                      Limited to {event.capacity || 100} seats
                    </div>
                  </div>

                  <div className="pt-5 border-t border-white/10 flex items-center justify-between mt-auto">
                    <span className="text-sm font-extrabold text-white group-hover:text-amber-500 transition-colors">View Details</span>
                    <div className="w-8 h-8 bg-slate-700 group-hover:bg-amber-500 text-white rounded-full flex items-center justify-center transition-all">
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>

                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {showCreateEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="create-event-title" className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-800 p-6 shadow-2xl md:p-8">
            <button type="button" onClick={() => setShowCreateEvent(false)} aria-label="Close event form" className="absolute right-5 top-5 rounded-full bg-slate-700 p-2 text-slate-300 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <h2 id="create-event-title" className="mb-1 text-2xl font-extrabold text-white">Create Event</h2>
            <p className="mb-6 text-sm text-slate-400">
              {user?.role === 'CLUB_ADMIN'
                ? `Creating for ${clubs[0]?.name || 'your assigned club'}`
                : 'Add event details and choose an available venue.'}
            </p>
            {createError && <p role="alert" className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-300">{createError}</p>}
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Event name
                <input required maxLength={150} value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm normal-case text-white outline-none focus:ring-2 focus:ring-amber-500/50" placeholder="Enter event name" />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                About the event
                <textarea required maxLength={5000} rows={4} value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm normal-case text-white outline-none focus:ring-2 focus:ring-amber-500/50" placeholder="Describe the event" />
              </label>
              {['FACULTY', 'SUPER_ADMIN'].includes(user?.role) && (
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Club
                  <select required value={createForm.clubId} onChange={(e) => setCreateForm({ ...createForm, clubId: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm normal-case text-white outline-none">
                    <option value="">Select a club</option>
                    {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
                  </select>
                </label>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Event date
                  <input required type="date" min={getLocalDate()} value={createForm.date} onChange={(e) => setCreateForm({ ...createForm, date: e.target.value, venueId: '' })} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm normal-case text-white [color-scheme:dark]" />
                </label>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Event time
                  <select required value={createForm.timeSlot} onChange={(e) => setCreateForm({ ...createForm, timeSlot: e.target.value, venueId: '' })} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm normal-case text-white">
                    <option>09:00 AM - 12:00 PM</option>
                    <option>01:00 PM - 04:00 PM</option>
                    <option>05:00 PM - 08:00 PM</option>
                  </select>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Venue availability
                  <select required value={createForm.venueId} onChange={(e) => {
                    const selectedVenue = venues.find((venue) => venue.id === e.target.value);
                    setCreateForm({
                      ...createForm,
                      venueId: e.target.value,
                      capacity: selectedVenue ? String(Math.min(Number(createForm.capacity) || selectedVenue.capacity, selectedVenue.capacity)) : createForm.capacity
                    });
                  }} disabled={venuesLoading || !venues.some((venue) => venue.available)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm normal-case text-white disabled:opacity-60">
                    <option value="">{venuesLoading ? 'Checking availability...' : venues.length ? 'Select an available venue' : 'No venues found'}</option>
                    {venues.map((venue) => (
                      <option key={venue.id} value={venue.id} disabled={!venue.available}>
                        {venue.name} — {venue.available ? `Available (capacity ${venue.capacity})` : 'Unavailable'}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Registration capacity
                  <input required type="number" min="1" max={venues.find((venue) => venue.id === createForm.venueId)?.capacity || 10000} value={createForm.capacity} onChange={(e) => setCreateForm({ ...createForm, capacity: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm normal-case text-white" />
                </label>
              </div>
              <button type="submit" disabled={creatingEvent || venuesLoading || !createForm.venueId || (['FACULTY', 'SUPER_ADMIN'].includes(user?.role) && !createForm.clubId)} className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3.5 text-sm font-extrabold text-white hover:from-amber-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-50">
                {creatingEvent ? 'Creating event...' : 'Create Event'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
