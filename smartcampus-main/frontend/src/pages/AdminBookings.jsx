import { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export default function AdminBookings() {
  const { user } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('campusToken');
      const res = await axios.get('http://localhost:5005/api/bookings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('campusToken');
      await axios.put(`http://localhost:5005/api/bookings/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchBookings();
    } catch (error) {
      alert("Failed to update status");
    }
  };

  const downloadApprovalLetter = async (id) => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.get(`http://localhost:5005/api/bookings/${id}/approval-letter`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `auditorium-approval-${id}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Failed to download booking approval letter', error);
      alert('Failed to download the approval letter.');
    }
  };

  if (user?.role !== 'HEAD' && user?.role !== 'SUPER_ADMIN') {
    return <div className="p-10 text-center text-red-500 min-h-screen bg-[#030303]">Access Denied. Head approval access only.</div>;
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white p-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Manage Booking Requests</h1>
        <p className="mb-6 text-sm text-slate-400">
          Only the Head can approve or reject requests. Approved requests include a dynamically generated permission letter.
        </p>
        
        {loading ? <p>Loading...</p> : (
          <div className="bg-secondary/20 rounded-xl overflow-hidden border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/50 text-muted-foreground">
                <tr>
                  <th className="p-4 font-medium">Auditorium</th>
                  <th className="p-4 font-medium">Club / Faculty</th>
                  <th className="p-4 font-medium">Date & Time</th>
                  <th className="p-4 font-medium">Requested By</th>
                  <th className="p-4 font-medium">Reason</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bookings.map(b => (
                  <tr key={b.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="p-4 font-medium">{b.auditorium.name}</td>
                    <td className="p-4">
                      {b.club?.name || 'Club not assigned'}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        Club Admin: {b.club?.clubAdmin?.name || 'Not assigned'}
                      </span>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        Club Faculty: {b.club?.facultyAssignments?.map(item => item.faculty.name).join(', ') || b.club?.facultyCoordinator?.name || 'Not assigned'}
                      </span>
                    </td>
                    <td className="p-4">{new Date(b.date).toLocaleDateString()} <br/><span className="text-muted-foreground">{b.timeSlot}</span></td>
                    <td className="p-4">{b.user.name} <br/><span className="text-muted-foreground text-xs">{b.user.email}</span></td>
                    <td className="p-4 max-w-xs truncate" title={b.reason}>{b.reason}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold border ${
                        b.status === 'APPROVED' ? 'bg-green-500/20 text-green-500 border-green-500/30' :
                        b.status === 'REJECTED' ? 'bg-red-500/20 text-red-500 border-red-500/30' :
                        'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-4 flex gap-2">
                      {user?.role === 'HEAD' && b.status === 'PENDING' && (
                        <>
                          <button onClick={() => updateStatus(b.id, 'APPROVED')} className="p-1.5 bg-green-500/20 text-green-500 hover:bg-green-500/40 rounded transition-colors" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                          <button onClick={() => updateStatus(b.id, 'REJECTED')} className="p-1.5 bg-red-500/20 text-red-500 hover:bg-red-500/40 rounded transition-colors" title="Reject"><XCircle className="w-4 h-4" /></button>
                        </>
                      )}
                      {b.status === 'APPROVED' && b.hasApprovalPdf && (
                        <button
                          onClick={() => downloadApprovalLetter(b.id)}
                          className="rounded bg-blue-500/20 px-2 py-1 text-xs font-bold text-blue-300 hover:bg-blue-500/40"
                        >
                          Download PDF
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bookings.length === 0 && <div className="p-10 text-center text-muted-foreground">No bookings found.</div>}
          </div>
        )}
      </div>
    </div>
  );
}






