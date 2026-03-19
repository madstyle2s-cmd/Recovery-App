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

  if (loading) return <div className="screen active"><div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div></div>;
  if (!summary) return <div className="screen active"><div style={{ textAlign: 'center', padding: '2rem' }}>No data</div></div>;

  return (
    <div className="screen active">
      <div className="dashboard-header">
        <div>
          <h1>Recovery Dashboard</h1>
          <div className="welcome-text">Welcome back! Here's your recovery status</div>
        </div>
        <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '2px solid #1e40af' }}>
          {[selectedProduct].map(p => <option key={p}>{p}</option>)}
        </select>
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
          <div className="summary-detail">Recovered amount</div>
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

function AccountsPage({ onNavigate }) {
  const { selectedProduct, productsLoaded } = useProduct();
  const [accounts, setAccounts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

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

  if (loading) return <div className="screen active"><div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div></div>;

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
          </select>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#6b7280' }}>
          {filtered.length} of {accounts.length}
        </div>
      </div>

      <div className="accounts-grid">
        {filtered.map((account) => (
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
                  <span className="value">₹{Math.max(0, (parseFloat(account['Pay off']) || 0) - (parseFloat(account['Paid Amount']) || 0)).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="card-actions">
              <button className="btn-open">View Details</button>
              <button className="btn-call">Contact</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchPage({ onNavigate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

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
        <h1>Search Customers</h1>
      </div>

      <form className="search-form" onSubmit={handleSearch}>
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, phone, ID..." />
        <button type="submit" className="btn-search">{searching ? 'Searching...' : 'Search'}</button>
      </form>

      {searched && (
        <div>
          <p style={{ marginBottom: '1rem', color: '#6b7280' }}>Found {results.length} results</p>
          <div className="accounts-grid">
            {results.map((account) => (
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsPage({ onNavigate }) {
  const { selectedProduct, productsLoaded } = useProduct();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (productsLoaded && selectedProduct) {
      loadReport();
    }
  }, [selectedProduct, productsLoaded]);

  const loadReport = async () => {
    setLoading(true);
    const result = await API.call('getDailyCollectionReportByProduct', { productName: selectedProduct });
    if (result.success && result.data) setReport(result.data);
    setLoading(false);
  };

  if (loading) return <div className="screen active"><div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div></div>;

  return (
    <div className="screen active">
      <div className="dashboard-header">
        <h1>Reports - {selectedProduct}</h1>
      </div>

      {report && (
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
          )}
        </div>
      )}
    </div>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  return (
    <ProductProvider>
      <div>
        <div className="nav-tabs">
          <button className={currentPage === 'dashboard' ? 'active' : ''} onClick={() => setCurrentPage('dashboard')}>
            Dashboard
          </button>
          <button className={currentPage === 'accounts' ? 'active' : ''} onClick={() => setCurrentPage('accounts')}>
            Accounts
          </button>
          <button className={currentPage === 'search' ? 'active' : ''} onClick={() => setCurrentPage('search')}>
            Search
          </button>
          <button className={currentPage === 'reports' ? 'active' : ''} onClick={() => setCurrentPage('reports')}>
            Reports
          </button>
        </div>

        {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} />}
        {currentPage === 'accounts' && <AccountsPage onNavigate={setCurrentPage} />}
        {currentPage === 'search' && <SearchPage onNavigate={setCurrentPage} />}
        {currentPage === 'reports' && <ReportsPage onNavigate={setCurrentPage} />}
      </div>
    </ProductProvider>
  );
}

export default App;
