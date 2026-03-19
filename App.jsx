import React, { useState, useEffect } from 'react';
import './App.css';

const CONFIG = {
  SHEET_ID: '1fJwyS7ohuanJv1X933zsAJxd6mlt8XUnre8f6mqBASk',
  GOOGLE_APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwk_QmgSznV5ZkxScZ6J4lRGmbhjtaQmpBSRDnuwdlCOjzPENiO-kdQaaD23F6lq1eu/exec'
};

const API = {
  async call(action, params = {}) {
    try {
      const response = await fetch(CONFIG.GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action, ...params })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('API Error:', action, error);
      return { success: false, error: error.message };
    }
  }
};

// Context & Providers
const AppContext = React.createContext();

function AppProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [userProfile, setUserProfile] = useState(JSON.parse(localStorage.getItem('userProfile') || '{"name":"Agent","email":"agent@recovery.com"}'));

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const result = await API.call('getAvailableProducts');
      if (result.success && result.data && result.data.length > 0) {
        setProducts(result.data);
        setSelectedProduct(result.data[0]);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setProductsLoaded(true);
    }
  };

  const addNotification = (message, type = 'success', duration = 3000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <AppContext.Provider value={{
      products, selectedProduct, setSelectedProduct, productsLoaded,
      notifications, addNotification,
      theme, toggleTheme,
      userProfile, setUserProfile
    }}>
      {children}
    </AppContext.Provider>
  );
}

function useApp() {
  return React.useContext(AppContext);
}

// Notification System
function NotificationCenter() {
  const { notifications } = useApp();
  return (
    <div className="notification-center">
      {notifications.map(notif => (
        <div key={notif.id} className={`notification notification-${notif.type}`}>
          {notif.message}
        </div>
      ))}
    </div>
  );
}

// Edit Account Modal
function EditAccountModal({ account, onClose, onSave }) {
  const { addNotification } = useApp();
  const [formData, setFormData] = useState(account || {});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    addNotification('Account updated successfully!', 'success');
    onClose();
  };

  if (!account) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Edit Account</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-group">
              <label>Customer Name</label>
              <input type="text" name="A/C Name" value={formData['A/C Name'] || ''} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input type="tel" name="Customer Phone" value={formData['Customer Phone'] || ''} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>District</label>
              <input type="text" name="District" value={formData.District || ''} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select name="Status" value={formData.Status || ''} onChange={handleChange}>
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="PARTIAL">Partial</option>
                <option value="SETTLED">Settled</option>
                <option value="LEGAL">Legal</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3>Agent Assignment</h3>
            <div className="form-group">
              <label>Agent Name</label>
              <input type="text" name="Agent Name" value={formData['Agent Name'] || ''} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Next Follow Up</label>
              <input type="date" name="Next Follow Up" value={formData['Next Follow Up'] || ''} onChange={handleChange} />
            </div>
          </div>

          <div className="form-section">
            <h3>Notes</h3>
            <div className="form-group">
              <textarea name="Notes" value={formData.Notes || ''} onChange={handleChange} placeholder="Add notes..." rows="4"></textarea>
            </div>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary">✅ Save Changes</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Payment Modal
function AddPaymentModal({ account, onClose, onSave }) {
  const { addNotification } = useApp();
  const [payment, setPayment] = useState({
    'Customer ID': account?.['Customer ID'],
    'Payment Amount': '',
    'Payment Date': new Date().toISOString().split('T')[0],
    'Agent Name': account?.['Agent Name'],
    'Note': ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPayment(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!payment['Payment Amount']) {
      addNotification('Please enter payment amount', 'error');
      return;
    }
    onSave(payment);
    addNotification('Payment added successfully!', 'success');
    onClose();
  };

  if (!account) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💰 Add Payment</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-section">
            <div className="form-group">
              <label>Customer: {account['A/C Name']}</label>
            </div>
            <div className="form-group">
              <label>Payment Amount *</label>
              <input type="number" name="Payment Amount" value={payment['Payment Amount']} onChange={handleChange} placeholder="৳0.00" required />
            </div>
            <div className="form-group">
              <label>Payment Date</label>
              <input type="date" name="Payment Date" value={payment['Payment Date']} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Reference/Note</label>
              <textarea name="Note" value={payment['Note']} onChange={handleChange} placeholder="Payment reference..." rows="3"></textarea>
            </div>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary">✅ Add Payment</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Note Modal
function AddNoteModal({ account, onClose, onSave }) {
  const { addNotification } = useApp();
  const [note, setNote] = useState({
    content: '',
    category: 'call',
    date: new Date().toISOString().split('T')[0]
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNote(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!note.content) {
      addNotification('Please enter note content', 'error');
      return;
    }
    onSave(note);
    addNotification('Note added successfully!', 'success');
    onClose();
  };

  if (!account) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📝 Add Follow-up Note</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-section">
            <div className="form-group">
              <label>Customer: {account['A/C Name']}</label>
            </div>
            <div className="form-group">
              <label>Category</label>
              <select name="category" value={note.category} onChange={handleChange}>
                <option value="call">Call</option>
                <option value="visit">Visit</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" name="date" value={note.date} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Note Content *</label>
              <textarea name="content" value={note.content} onChange={handleChange} placeholder="Enter your note..." rows="5" required></textarea>
            </div>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary">✅ Save Note</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Call Log Modal
function CallLogModal({ account, onClose, onSave }) {
  const { addNotification } = useApp();
  const [callLog, setCallLog] = useState({
    date: new Date().toISOString().split('T')[0],
    outcome: 'no-answer',
    duration: '0',
    nextFollowUp: '',
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCallLog(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(callLog);
    addNotification('Call log saved successfully!', 'success');
    onClose();
  };

  if (!account) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📞 Call Log</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-section">
            <div className="form-group">
              <label>Customer: {account['A/C Name']}</label>
            </div>
            <div className="form-group">
              <label>Call Date</label>
              <input type="date" name="date" value={callLog.date} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Call Outcome</label>
              <select name="outcome" value={callLog.outcome} onChange={handleChange}>
                <option value="answered">Answered</option>
                <option value="no-answer">No Answer</option>
                <option value="busy">Busy</option>
                <option value="wrong-number">Wrong Number</option>
                <option value="agreed-payment">Agreed to Payment</option>
                <option value="promised">Promised to Pay</option>
                <option value="not-interested">Not Interested</option>
              </select>
            </div>
            <div className="form-group">
              <label>Duration (minutes)</label>
              <input type="number" name="duration" value={callLog.duration} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Next Follow-up Date</label>
              <input type="date" name="nextFollowUp" value={callLog.nextFollowUp} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Call Notes</label>
              <textarea name="notes" value={callLog.notes} onChange={handleChange} rows="3"></textarea>
            </div>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary">✅ Save Log</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Agent Assignment Modal
function AgentAssignmentModal({ account, onClose, onSave }) {
  const { addNotification } = useApp();
  const [assignment, setAssignment] = useState({
    agent: account?.['Agent Name'] || '',
    date: new Date().toISOString().split('T')[0],
    reason: ''
  });

  const agents = ['Shibly', 'Agent 2', 'Agent 3', 'Agent 4'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAssignment(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(assignment);
    addNotification('Agent assigned successfully!', 'success');
    onClose();
  };

  if (!account) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👤 Assign Agent</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-section">
            <div className="form-group">
              <label>Account: {account['A/C Name']}</label>
            </div>
            <div className="form-group">
              <label>Assign to Agent *</label>
              <select name="agent" value={assignment.agent} onChange={handleChange} required>
                <option value="">Select Agent</option>
                {agents.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Assignment Date</label>
              <input type="date" name="date" value={assignment.date} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Reason for Assignment</label>
              <textarea name="reason" value={assignment.reason} onChange={handleChange} rows="3"></textarea>
            </div>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary">✅ Assign</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Send SMS Modal
function SendSMSModal({ account, onClose, onSend }) {
  const { addNotification } = useApp();
  const [sms, setSMS] = useState({
    template: 'reminder',
    message: '',
    phone: account?.['Customer Phone'] || ''
  });

  const templates = {
    reminder: 'Dear {name}, this is a reminder to make your payment. Contact us for details.',
    payment: 'Thank you {name}! We received your payment of ৳{amount}. Thank you!',
    followup: 'Hi {name}, following up on your account. Please call us at your earliest convenience.',
    custom: ''
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSMS(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSend(sms);
    addNotification('SMS sent successfully!', 'success');
    onClose();
  };

  if (!account) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💬 Send SMS</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-section">
            <div className="form-group">
              <label>To: {account['A/C Name']} ({sms.phone})</label>
            </div>
            <div className="form-group">
              <label>Template</label>
              <select name="template" value={sms.template} onChange={(e) => {
                setSMS(prev => ({ ...prev, template: e.target.value, message: templates[e.target.value] }));
              }}>
                <option value="reminder">Reminder</option>
                <option value="payment">Payment Confirmation</option>
                <option value="followup">Follow-up</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="form-group">
              <label>Message</label>
              <textarea name="message" value={sms.message} onChange={handleChange} rows="4" required></textarea>
              <small>{sms.message.length}/160 characters</small>
            </div>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary">📤 Send SMS</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// WhatsApp Modal
function WhatsAppModal({ account, onClose, onSend }) {
  const { addNotification } = useApp();
  const [whatsapp, setWhatsapp] = useState({
    message: 'Hi, this is regarding your account. Please contact us for details.',
    phone: account?.['Customer Phone'] || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setWhatsapp(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const phoneNumber = whatsapp.phone.replace(/\D/g, '');
    const message = encodeURIComponent(whatsapp.message);
    window.open(`https://wa.me/${phoneNumber}?text=${message}`);
    addNotification('Opening WhatsApp...', 'info');
    onClose();
  };

  if (!account) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📲 WhatsApp Message</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-section">
            <div className="form-group">
              <label>To: {account['A/C Name']}</label>
            </div>
            <div className="form-group">
              <label>Phone Number</label>
       
