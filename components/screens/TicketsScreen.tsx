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
  state?: string;
  pin?: string;
  area?: string;
  labor?: number;
  se_call_id?: string;
  visit_date?: string;
  rerepair?: boolean;
  rerepair_foc?: boolean;
  final_charges?: number;
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
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [formData, setFormData] = useState({
    cname: '',
    mobile: '',
    city: '',
    state: '',
    pin: '',
    area: '',
    call_type: 'Warranty',
    service_type: 'Repair',
    brand_name: '',
    model: '',
    serial: '',
    problem: '',
    warranty_coverage: 'Yes',
    status: 'Pending Allocation',
    service_charges: 0,
    labor: 0,
    final_charges: 0,
    se_call_id: '',
    visit_date: '',
    rerepair: false,
    rerepair_foc: false,
    assigned_name: '',
  });

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

  const handleAddClick = () => {
    setModalMode('add');
    setFormData({
      cname: '',
      mobile: '',
      city: '',
      state: '',
      pin: '',
      area: '',
      call_type: 'Warranty',
      service_type: 'Repair',
      brand_name: '',
      model: '',
      serial: '',
      problem: '',
      warranty_coverage: 'Yes',
      status: 'Pending Allocation',
      service_charges: 0,
      labor: 0,
      final_charges: 0,
      se_call_id: '',
      visit_date: '',
      rerepair: false,
      rerepair_foc: false,
      assigned_name: '',
    });
    setModalOpen(true);
  };

  const handleViewTicket = (ticket: Ticket) => {
    setModalMode('view');
    setFormData({
      cname: ticket.cname,
      mobile: ticket.mobile,
      city: ticket.city,
      state: ticket.state || '',
      pin: ticket.pin || '',
      area: ticket.area || '',
      call_type: ticket.call_type,
      service_type: ticket.service_type,
      brand_name: ticket.brand_name,
      model: ticket.model,
      serial: ticket.serial,
      problem: ticket.problem,
      warranty_coverage: ticket.warranty_coverage,
      status: ticket.status,
      service_charges: ticket.service_charges || 0,
      labor: ticket.labor || 0,
      final_charges: ticket.final_charges || 0,
      se_call_id: ticket.se_call_id || '',
      visit_date: ticket.visit_date || '',
      rerepair: ticket.rerepair || false,
      rerepair_foc: ticket.rerepair_foc || false,
      assigned_name: ticket.assigned_name || '',
    });
    setModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    const numFields = ['service_charges', 'labor', 'final_charges', 'pin'];
    const boolFields = ['rerepair', 'rerepair_foc'];

    setFormData(prev => ({
      ...prev,
      [name]: numFields.includes(name)
        ? (value === '' ? 0 : Number(value) || 0)
        : boolFields.includes(name)
          ? value === 'true'
          : value || '',
    }));
  };

  const handleAddTicket = async () => {
    if (!formData.cname || !formData.mobile || !formData.serial) {
      alert('Please fill in required fields: Customer Name, Mobile, Serial No');
      return;
    }

    try {
      const { data: lastTickets } = await supabase
        .from('tickets')
        .select('id')
        .like('id', 'BEA-%')
        .order('id', { ascending: false })
        .limit(1);

      let newId = 'BEA-2026-001';
      if (lastTickets && lastTickets.length > 0) {
        const lastId = lastTickets[0].id;
        const lastNum = parseInt(lastId.split('-')[2]) || 0;
        const nextNum = String(lastNum + 1).padStart(3, '0');
        const year = new Date().getFullYear();
        newId = `BEA-${year}-${nextNum}`;
      }

      const { error } = await supabase.from('tickets').insert([
        {
          id: newId,
          cname: formData.cname,
          mobile: formData.mobile,
          city: formData.city,
          state: formData.state,
          pin: formData.pin,
          area: formData.area,
          call_type: formData.call_type,
          service_type: formData.service_type,
          brand_name: formData.brand_name,
          model: formData.model,
          serial: formData.serial,
          problem: formData.problem,
          warranty_coverage: formData.warranty_coverage,
          status: formData.status,
          service_charges: formData.service_charges || 0,
          labor: formData.labor || 0,
          final_charges: formData.final_charges || 0,
          se_call_id: formData.se_call_id,
          visit_date: formData.visit_date,
          rerepair: formData.rerepair,
          rerepair_foc: formData.rerepair_foc,
          assigned_name: formData.assigned_name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ]);

      if (error) {
        console.error('Insert error:', error);
        alert(`Error adding ticket: ${error.message}`);
        return;
      }

      alert('Ticket added successfully!');
      setModalOpen(false);
      fetchTickets();
    } catch (err) {
      console.error('Failed to add ticket:', err);
      alert('Failed to add ticket');
    }
  };

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
        <button className="btn btn-primary" onClick={handleAddClick}>➕ New Call</button>
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
                      <span className="clickable-phone" onClick={() => { }}>
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
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleViewTicket(ticket)}
                      >
                        👁 View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Add/Edit/View */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => !['add', 'edit'].includes(modalMode) && setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalMode === 'add' ? '➕ New Ticket' : modalMode === 'edit' ? '✏️ Edit Ticket' : '👁 View Ticket'}</h3>
              <button className="close-btn" onClick={() => setModalOpen(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Customer Details Section */}
              <div style={{ marginBottom: '20px', borderBottom: '2px solid #1a56db', paddingBottom: '10px' }}>
                <h4 style={{ color: '#1a56db', marginBottom: '10px' }}>👤 Customer Details</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Customer Name *</label>
                    <input
                      type="text"
                      name="cname"
                      value={formData.cname}
                      onChange={handleFormChange}
                      disabled={modalMode === 'view'}
                    />
                  </div>
                  <div className="form-group">
                    <label>Mobile *</label>
                    <input
                      type="text"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleFormChange}
                      disabled={modalMode === 'view'}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleFormChange}
                      disabled={modalMode === 'view'}
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleFormChange}
                      disabled={modalMode === 'view'}
                    />
                  </div>
                  <div className="form-group">
                    <label>PIN</label>
                    <input
                      type="number"
                      name="pin"
                      value={formData.pin}
                      onChange={handleFormChange}
                      disabled={modalMode === 'view'}
                    />
                  </div>
                </div>
              </div>

              {/* Product Details Section */}
              <div style={{ marginBottom: '20px', borderBottom: '2px solid #0e9f6e', paddingBottom: '10px' }}>
                <h4 style={{ color: '#0e9f6e', marginBottom: '10px' }}>🏭 Product Details</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Brand Name</label>
                    <input
                      type="text"
                      name="brand_name"
                      value={formData.brand_name}
                      onChange={handleFormChange}
                      disabled={modalMode === 'view'}
                    />
                  </div>
                  <div className="form-group">
                    <label>Model</label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleFormChange}
                      disabled={modalMode === 'view'}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Serial No *</label>
                    <input
                      type="text"
                      name="serial"
                      value={formData.serial}
                      onChange={handleFormChange}
                      disabled={modalMode === 'view'}
                    />
                  </div>
                  <div className="form-group">
                    <label>Problem</label>
                    <textarea
                      name="problem"
                      value={formData.problem}
                      onChange={handleFormChange}
                      disabled={modalMode === 'view'}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Service Details Section */}
              <div style={{ marginBottom: '20px', borderBottom: '2px solid #ff9800', paddingBottom: '10px' }}>
                <h4 style={{ color: '#ff9800', marginBottom: '10px' }}>🔧 Service Details</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Call Type</label>
                    <select
                      name="call_type"
                      value={formData.call_type}
                      onChange={handleFormChange}
                      disabled={modalMode === 'view'}
                    >
                      <option>Warranty</option>
                      <option>Non-Warranty</option>
                      <option>AMC</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Service Type</label>
                    <select
                      name="service_type"
                      value={formData.service_type}
                      onChange={handleFormChange}
                      disabled={modalMode === 'view'}
                    >
                      <option>Repair</option>
                      <option>Installation</option>
                      <option>Maintenance</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Warranty Coverage</label>
                    <select
                      name="warranty_coverage"
                      value={formData.warranty_coverage}
                      onChange={handleFormChange}
                      disabled={modalMode === 'view'}
                    >
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                      disabled={modalMode === 'view'}
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Service Charges</label>
                    <input
                      type="number"
                      name="service_charges"
                      value={formData.service_charges}
                      onChange={handleFormChange}
                      disabled={modalMode === 'view'}
                    />
                  </div>
                  <div className="form-group">
                    <label>Labor Charges</label>
                    <input
                      type="number"
                      name="labor"
                      value={formData.labor}
                      onChange={handleFormChange}
                      disabled={modalMode === 'view'}
                    />
                  </div>
                  <div className="form-group">
                    <label>Final Charges</label>
                    <input
                      type="number"
                      name="final_charges"
                      value={formData.final_charges}
                      onChange={handleFormChange}
                      disabled={modalMode === 'view'}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {modalMode === 'view' ? (
                <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Close</button>
              ) : (
                <>
                  <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleAddTicket}>💾 Save Ticket</button>
                </>
              )}
            </div>
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
