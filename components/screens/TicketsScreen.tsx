'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Ticket {
  id: string;
  call_type: string;
  service_type: string;
  status: string;
  brand_name: string;
  model: string;
  serial: string;
  cname: string;
  mobile: string;
  city: string;
  problem: string;
  assigned_name: string;
  warranty_coverage: string;
  created_at: string;
  service_charges: number;
}

const statusBadges: Record<string, string> = {
  'Pending Allocation': 'badge-pending',
  'Assigned': 'badge-open',
  'In Progress': 'badge-open',
  'Closed': 'badge-closed',
  'Call Cancel': 'badge-cancel',
};

const callTypeBadges: Record<string, string> = {
  'Warranty': 'badge-warranty',
  'Non-Warranty': 'badge-open',
  'AMC': 'badge-warranty',
};

export default function TicketsScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setTickets(data || []);
        } catch (err) {
            console.error('Failed to fetch tickets:', err);
        } finally {
            setLoading(false);
        }
    };

  const statusOptions = [
    'Pending Allocation',
    'Assigned',
    'In Progress',
    'Pending Customer Approval',
    'Closed',
  ];

  const filteredTickets = tickets.filter((ticket) => {
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesSearch =
      ticket.cname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.mobile.includes(searchTerm) ||
      ticket.serial.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="content-section">
      <div className="section-header">
        <h2>🎫 All Tickets</h2>
        <button className="btn btn-primary">➕ New Call</button>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search by name, mobile, or serial..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1 }}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="loading">Loading tickets...</p>
      ) : filteredTickets.length === 0 ? (
        <p className="empty-message">
          {tickets.length === 0 ? 'No tickets created yet' : 'No tickets match your filters'}
        </p>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Mobile</th>
                  <th>Brand / Model</th>
                  <th>Serial No</th>
                  <th>Call Type</th>
                  <th>Service</th>
                  <th>Problem</th>
                  <th>Status</th>
                  <th>Engineer</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <strong>{ticket.id}</strong>
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <strong>{ticket.cname}</strong>
                    </td>
                    <td>
                      <span className="clickable-phone" onClick={() => {}}>
                        {ticket.mobile}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px' }}>
                        {ticket.brand_name} / {ticket.model}
                      </div>
                    </td>
                    <td style={{ fontSize: '12px' }}>{ticket.serial}</td>
                    <td>
                      <span className={`badge ${callTypeBadges[ticket.call_type] || 'badge-open'}`}>
                        {ticket.call_type}
                      </span>
                    </td>
                    <td>{ticket.service_type}</td>
                    <td style={{ fontSize: '12px', maxWidth: '150px' }}>{ticket.problem}</td>
                    <td>
                      <span className={`badge ${statusBadges[ticket.status] || 'badge-open'}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px' }}>{ticket.assigned_name || '—'}</td>
                    <td>
                      <button className="btn btn-sm btn-primary">👁 View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
        'Pending Allocation': 'pending',
        'Assigned': 'progress',
        'In Progress': 'progress',
        'Pending Approval': 'hold',
        'Closed': 'closed',
        'Cancelled': 'cancel',
    };
    return map[status] || 'pending';
}

function getCallTypeBadgeClass(callType: string): string {
    const map: Record<string, string> = {
        'Warranty': 'warranty',
        'Non-Warranty': 'cancel',
        'AMC': 'approve',
    };
    return map[callType] || 'open';
}

function getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
        'High': '#f05252',
        'Normal': '#ff9800',
        'Low': '#0e9f6e',
    };
    return colors[priority] || '#64748b';
}
