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

const ProductContext = React.createContext();

function ProductProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productsLoaded, setProductsLoaded] = useState(false);

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

  return (
    <ProductContext.Provider value={{ products, selectedProduct, setSelectedProduct, productsLoaded }}>
      {children}
    </ProductContext.Provider>
  );
}

function useProduct() {
  return React.useContext(ProductContext);
}

// Account Details Modal
function AccountDetailsModal({ account, onClose }) {
  if (!account) return null;

  const remaining = Math.max(0, (parseFloat(account['Pay off']) || 0) - (parseFloat(account['Paid Amount']) || 0));
  const recoveryPercent = (parseFloat(account['Pay off']) || 0) > 0 
    ? ((parseFloat(account['Paid Amount']) || 0) / (parseFloat(account['Pay off']) || 0) * 100).toFixed(1)
    : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{account['A/C Name']}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="section">
            <h3>Account Information</h3>
            <div className="detail-row">
              <span className="label">A/C Number:</span>
              <span className="value">{account['A/C Number'] || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Customer ID:</span>
              <span className="value">{account['Customer ID'] || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="label">District:</span>
              <span className="value">{account.District || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Status:</span>
              <span className="value status-badge" style={{ display: 'inline-block' }}>
                {account.Status || 'NEW'}
              </span>
            </div>
          </div>

          <div className="section">
            <h3>Contact Details</h3>
            <div className="detail-row">
              <span className="label">Phone:</span>
              <span className="value">{account['Customer Phone'] || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Agent:</span>
              <span className="value">{account['Agent Name'] || 'N/A'}</span>
            </div>
          </div>

          <div className="section">
            <h3>Financial Summary</h3>
            <div className="detail-row">
              <span className="label">Credit Limit:</span>
              <span className="value">₹{(parseFloat(account.Limit) || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="detail-row">
              <span className="label">Total Payoff:</span>
              <span className="value">₹{(parseFloat(account['Pay off']) || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="detail-row">
              <span className="label">Paid Amount:</span>
              <span className="value" style={{ color: '#10b981' }}>₹{(parseFloat(account['Paid Amount']) || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="detail-row">
              <span className="label">Remaining:</span>
              <span className="value" style={{ color: '#ef4444', fontWeight: '700' }}>₹{remaining.toLocaleString('en-IN')}</span>
            </div>
            <div className="detail-row">
              <span className="label">Recovery %:</span>
              <span className="value">{recoveryPercent}%</span>
            </div>
          </div>

          <div className="section">
            <h3>Additional Information</h3>
            <div className="detail-row">
              <span className="label">Last Update:</span>
              <span className="value">{account['Last Update'] || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Next Follow Up:</span>
              <span className="value">{account['Next Follow Up'] || 'N/A'}</span>
            </div>
            {account.Notes && (
              <div className="detail-row">
                <span className="label">Notes:</span>
                <span className="value">{account.Notes}</span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-call" onClick={() => window.location.href = `tel:${account['Customer Phone']}`}>
            📞 Call Customer
          </button>
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// Dashboard
function Dashboard({ onNavigate }) {
  const { selectedProduct, productsLoaded } = useProduct();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (productsLoaded && selectedProduct) {
      loadDashboard();
    }
  }, [selectedProduct, productsLoaded]);

  const loadDashboard = async () => {
    setLoading(true);
    const result = await API.call('getDashboardSummaryByProduct', { productName: selectedProduct });
    if (result.success && result.data) setSummary(result.data);
    setLoading(false);
  };

  if (loading) return <div className="screen active"><div style={{ textAlign: 'center', padding: '2rem' }}>⏳ Loading...</div></div>;
  if (!summary) return <div className="screen active"><div style={{ textAlign: 'center', padding: '2rem' }}>❌ No data</div></div>;

  return (
    <div className="screen active">
      <div className="dashboard-header">
        <div>
          <h1>Recovery Dashboard</h1>
          <div className="welcome-text">Welcome back! Here's your recovery status</div>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <h3>Total Accounts</h3>
          <div className="summary-value">{summary.totalAccounts}</div>
          <div className="summary-detail">Active accounts</div>
        </div>

        <div className="summary-card">
          <h3>Total Limit</h3>
          <div className="summary-value">₹{(summary.totalLimit / 100000).toFixed(1)}L</div>
          <div className="summary-detail">Credit limit</div>
        </div>

        <div className="summary-card">
          <h3>Total Recovery</h3>
          <div className="summary-value">₹{(summary.totalRecovery / 100000).toFixed(1)}L</div>
          <div className="summary-detail">Recovered</div>
        </div>

        <div className="summary-card">
          <h3>Remaining</h3>
          <div className="summary-value">₹{(summary.remainingPayoff / 100000).toFixed(1)}L</div>
          <div className="summary-detail">Outstanding</div>
        </div>
      </div>

      <div className="quick-actions">
        <button className="quick-btn" onClick={() => onNavigate('accounts')}>📋 View Accounts</button>
        <button className="quick-btn" onClick={() => onNavigate('search')}>🔍 Search</button>
        <button className="quick-btn" onClick={() => onNavigate('reports')}>📊 Reports</button>
      </div>
    </div>
  );
}

// Accounts Page
function AccountsPage({ onNavigate }) {
  const { selectedProduct, productsLoaded } = useProduct();
  const [accounts, setAccounts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedAccount, setSelectedAccount] = useState(null);

  useEffect(() => {
    if (productsLoaded && selectedProduct) {
      loadAccounts();
    }
  }, [selectedProduct, productsLoaded]);

  useEffect(() => {
    let result = accounts;
    if (filterStatus !== 'ALL') {
      result = result.filter(acc => acc.Status === filterStatus);
    }
    result.sort((a, b) => (a['A/C Name'] || '').localeCompare(b['A/C Name'] || ''));
    setFiltered(result);
  }, [accounts, filterStatus]);

  const loadAccounts = async () => {
    setLoading(true);
    const result = await API.call('getAccountsByProduct', { productName: selectedProduct });
    if (result.success && result.data) setAccounts(result.data);
    setLoading(false);
  };

  if (loading) return <div className="screen active"><div style={{ textAlign: 'center', padding: '2rem' }}>⏳ Loading...</div></div>;

  return (
    <div className="screen active">
      <div className="dashboard-header">
        <h1>{selectedProduct} Accounts</h1>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="ALL">All</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="PARTIAL">Partial</option>
            <option value="SETTLED">Settled</option>
            <option value="LEGAL">Legal</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#6b7280' }}>
          {filtered.length} of {accounts.length}
        </div>
      </div>

      <div className="accounts-grid">
        {filtered.map((account) => {
          const remaining = Math.max(0, (parseFloat(account['Pay off']) || 0) - (parseFloat(account['Paid Amount']) || 0));
          return (
            <div key={account['Customer ID']} className="account-card">
              <div className="card-header">
                <h3>{account['A/C Name'] || 'Unknown'}</h3>
                <span className={`status-badge status-${(account.Status || 'new').toLowerCase()}`}>
                  {account.Status || 'NEW'}
                </span>
              </div>

              <div className="card-body">
                <div className="card-row">
                  <span className="label">Phone:</span>
                  <span className="value">{account['Customer Phone'] || 'N/A'}</span>
                </div>
                <div className="card-row">
                  <span className="label">District:</span>
                  <span className="value">{account.District || 'N/A'}</span>
                </div>
                <div className="card-row">
                  <span className="label">Agent:</span>
                  <span className="value">{account['Agent Name'] || 'N/A'}</span>
                </div>

                <div className="card-financials">
                  <div className="financial-item">
                    <span className="label">Limit</span>
                    <span className="value">₹{(parseFloat(account.Limit) || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="financial-item">
                    <span className="label">Paid</span>
                    <span className="value">₹{(parseFloat(account['Paid Amount']) || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="financial-item">
                    <span className="label">Remaining</span>
                    <span className="value">₹{remaining.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="card-actions">
                <button className="btn-open" onClick={() => setSelectedAccount(account)}>
                  📋 Details
                </button>
                <button className="btn-call" onClick={() => window.location.href = `tel:${account['Customer Phone']}`}>
                  📞 Call
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedAccount && (
        <AccountDetailsModal account={selectedAccount} onClose={() => setSelectedAccount(null)} />
      )}
    </div>
  );
}

// Search Page
function SearchPage({ onNavigate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    const result = await API.call('searchAccountsAllProducts', { query });
    if (result.success && result.data) setResults(result.data);
    setSearched(true);
    setSearching(false);
  };

  return (
    <div className="screen active">
      <div className="dashboard-header">
        <h1>🔍 Search Customers</h1>
      </div>

      <form className="search-form" onSubmit={handleSearch}>
        <input 
          type="text" 
          value={query} 
          onChange={(e) => setQuery(e.target.value)} 
          placeholder="Search by name, phone, ID..." 
          autoFocus
        />
        <button type="submit" className="btn-search">{searching ? '⏳...' : '🔍'}</button>
      </form>

      {searched && (
        <div>
          <p style={{ marginBottom: '1rem', color: '#6b7280' }}>Found {results.length} results</p>
          {results.length > 0 ? (
            <div className="accounts-grid">
              {results.map((account) => {
                const remaining = Math.max(0, (parseFloat(account['Pay off']) || 0) - (parseFloat(account['Paid Amount']) || 0));
                return (
                  <div key={account['Customer ID']} className="account-card">
                    <div className="card-header">
                      <h3>{account['A/C Name']}</h3>
                      <span style={{ fontSize: '12px', background: '#dbeafe', color: '#1e40af', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                        {account['_Product']}
                      </span>
                    </div>
                    <div className="card-body">
                      <div className="card-row">
                        <span className="label">Phone:</span>
                        <span className="value">{account['Customer Phone']}</span>
                      </div>
                      <div className="card-financials">
                        <div className="financial-item">
                          <span className="label">Limit</span>
                          <span className="value">₹{(parseFloat(account.Limit) || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="financial-item">
                          <span className="label">Paid</span>
                          <span className="value">₹{(parseFloat(account['Paid Amount']) || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="financial-item">
                          <span className="label">Remaining</span>
                          <span className="value">₹{remaining.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="card-actions">
                      <button className="btn-open" onClick={() => setSelectedAccount(account)}>Details</button>
                      <button className="btn-call" onClick={() => window.location.href = `tel:${account['Customer Phone']}`}>Call</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">No customers found</div>
          )}
        </div>
      )}

      {selectedAccount && (
        <AccountDetailsModal account={selectedAccount} onClose={() => setSelectedAccount(null)} />
      )}
    </div>
  );
}

// Reports Page
function ReportsPage({ onNavigate }) {
  const { selectedProduct, productsLoaded } = useProduct();
  const [report, setReport] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily');

  useEffect(() => {
    if (productsLoaded && selectedProduct) {
      loadReports();
    }
  }, [selectedProduct, productsLoaded]);

  const loadReports = async () => {
    setLoading(true);
    const dailyResult = await API.call('getDailyCollectionReportByProduct', { productName: selectedProduct });
    const agentResult = await API.call('getAgentPerformanceByProduct', { productName: selectedProduct });
    
    if (dailyResult.success && dailyResult.data) setReport(dailyResult.data);
    if (agentResult.success && agentResult.data) setAgents(agentResult.data);
    setLoading(false);
  };

  if (loading) return <div className="screen active"><div style={{ textAlign: 'center', padding: '2rem' }}>⏳ Loading...</div></div>;

  return (
    <div className="screen active">
      <div className="dashboard-header">
        <h1>📊 Reports - {selectedProduct}</h1>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          Daily Collection
        </button>
        <button 
          className={`tab ${activeTab === 'agents' ? 'active' : ''}`}
          onClick={() => setActiveTab('agents')}
        >
          Agent Performance
        </button>
      </div>

      {activeTab === 'daily' && report && (
        <div>
          <div className="report-summary">
            <div className="report-card">
              <span>Total Payments</span>
              <p>{report.totalPayments || 0}</p>
            </div>
            <div className="report-card">
              <span>Total Collection</span>
              <p>₹{(report.totalCollection || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>

          {report.byAgent && Object.keys(report.byAgent).length > 0 && (
            <div className="tab-content">
              <h3>By Agent</h3>
              <div className="table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Agent Name</th>
                      <th>Payments</th>
                      <th>Collection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.byAgent).map(([agent, data]) => (
                      <tr key={agent}>
                        <td>{agent}</td>
                        <td>{data.count}</td>
                        <td>₹{data.total.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'agents' && agents && agents.length > 0 && (
        <div className="tab-content">
          <h3>Agent Performance</h3>
          <div className="table-wrapper">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Accounts</th>
                  <th>Recovery</th>
                  <th>Avg</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.agentName}>
                    <td>{agent.agentName}</td>
                    <td>{agent.totalAccounts}</td>
                    <td>₹{agent.totalRecovery.toLocaleString('en-IN')}</td>
                    <td>₹{parseFloat(agent.avgRecoveryPerAccount).toLocaleString('en-IN')}</td>
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

// Main App
function App() {
  const { selectedProduct, products } = useProduct();
  const [currentPage, setCurrentPage] = useState('dashboard');

  return (
    <div className="app-container">
      <div className="nav-tabs">
        <div className="nav-content">
          <select 
            value={selectedProduct || ''} 
            onChange={(e) => {}} 
            className="product-selector"
            style={{ marginRight: 'auto' }}
          >
            {products.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          
          <button className={`nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('dashboard')}>
            📊 Dashboard
          </button>
          <button className={`nav-btn ${currentPage === 'accounts' ? 'active' : ''}`} onClick={() => setCurrentPage('accounts')}>
            📋 Accounts
          </button>
          <button className={`nav-btn ${currentPage === 'search' ? 'active' : ''}`} onClick={() => setCurrentPage('search')}>
            🔍 Search
          </button>
          <button className={`nav-btn ${currentPage === 'reports' ? 'active' : ''}`} onClick={() => setCurrentPage('reports')}>
            📊 Reports
          </button>
        </div>
      </div>

      <div className="content-wrapper">
        {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} />}
        {currentPage === 'accounts' && <AccountsPage onNavigate={setCurrentPage} />}
        {currentPage === 'search' && <SearchPage onNavigate={setCurrentPage} />}
        {currentPage === 'reports' && <ReportsPage onNavigate={setCurrentPage} />}
      </div>
    </div>
  );
}

export default function AppWithProvider() {
  return (
    <ProductProvider>
      <App />
    </ProductProvider>
  );
}
