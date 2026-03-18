import React, { useState, useEffect } from 'react';
import './App.css';

// ============================================================================
// CONFIG
// ============================================================================

const CONFIG = {
  SHEET_ID: '16O97Xr0T95Br21fmoGF1GtbeV0q5AujbddsbADgcMnI',
  GOOGLE_APPS_SCRIPT_URL: 'https://script.google.com/macros/d/AKfycbyP0H8r9nmrohNjX8FrefKA0vwZOFeWlADDgnx6nETgwjW9ECCuKSpLPIJWV0mrXZdgvA/userweb'
};

// ============================================================================
// API HELPER
// ============================================================================

const API = {
  async call(action, params = {}) {
    try {
      const response = await fetch(CONFIG.GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action, ...params })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      return { success: false, error: error.message };
    }
  }
};

// ============================================================================
// PRODUCT CONTEXT
// ============================================================================

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

// ============================================================================
// PRODUCT SELECTOR
// ============================================================================

function ProductSelector() {
  const { products, selectedProduct, setSelectedProduct } = useProduct();

  if (!products || products.length === 0) {
    return <div className="product-selector">Loading products...</div>;
  }

  return (
    <div className="product-selector">
      <label>📦 Product:</label>
      <select 
        value={selectedProduct || ''} 
        onChange={(e) => setSelectedProduct(e.target.value)}
        className="product-select"
      >
        {products.map((product) => (
          <option key={product} value={product}>
            {product}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================================================
// DASHBOARD PAGE
// ============================================================================

function Dashboard({ onNavigate }) {
  const { selectedProduct, productsLoaded } = useProduct();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (productsLoaded && selectedProduct) {
      loadDashboard();
    }
  }, [selectedProduct, productsLoaded]);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    const result = await API.call('getDashboardSummaryByProduct', { 
      productName: selectedProduct
    });
    if (result.success && result.data) {
      setSummary(result.data);
    } else {
      setError('Failed to load dashboard data');
    }
    setLoading(false);
  };

  if (loading) return <div className="page-loading">📊 Loading dashboard...</div>;
  if (error) return <div className="page-error">❌ {error}</div>;
  if (!summary) return <div className="page-error">❌ No data available</div>;

  return (
    <div className="dashboard-page">
      <header className="app-header">
        <div>
          <h1>💼 Recovery Dashboard</h1>
          <ProductSelector />
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-summary">
          <div className="summary-card">
            <h3>📊 Total Accounts</h3>
            <p className="summary-value">{summary.totalAccounts || 0}</p>
          </div>

          <div className="summary-card">
            <h3>💰 Total Limit</h3>
            <p className="summary-value">₹{(summary.totalLimit || 0).toLocaleString('en-IN')}</p>
          </div>

          <div className="summary-card">
            <h3>✅ Total Recovery</h3>
            <p className="summary-value">₹{(summary.totalRecovery || 0).toLocaleString('en-IN')}</p>
          </div>

          <div className="summary-card">
            <h3>⏳ Remaining Payoff</h3>
            <p className="summary-value">₹{(summary.remainingPayoff || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="quick-actions">
          <button onClick={() => onNavigate('accounts')} className="btn-action">📋 View All Accounts</button>
          <button onClick={() => onNavigate('search')} className="btn-action">🔍 Search Customer</button>
          <button onClick={() => onNavigate('reports')} className="btn-action">📈 Daily Reports</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ACCOUNTS LIST PAGE
// ============================================================================

function AccountsPage({ onNavigate }) {
  const { selectedProduct, productsLoaded } = useProduct();
  const [accounts, setAccounts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (productsLoaded && selectedProduct) {
      loadAccounts();
    }
  }, [selectedProduct, productsLoaded]);

  useEffect(() => {
    applyFilters();
  }, [accounts, filterStatus]);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    const result = await API.call('getAccountsByProduct', { 
      productName: selectedProduct
    });
    if (result.success && result.data) {
      setAccounts(result.data);
    } else {
      setError('Failed to load accounts');
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let result = accounts;
    if (filterStatus !== 'ALL') {
      result = result.filter(acc => acc.Status === filterStatus);
    }
    result.sort((a, b) => (a['A/C Name'] || '').localeCompare(b['A/C Name'] || ''));
    setFiltered(result);
  };

  if (loading) return <div className="page-loading">📋 Loading accounts...</div>;
  if (error) return <div className="page-error">❌ {error}</div>;

  return (
    <div className="accounts-page">
      <header className="page-header">
        <div>
          <h1>{selectedProduct} - All Accounts</h1>
          <ProductSelector />
        </div>
        <button onClick={() => onNavigate('dashboard')} className="btn-back">← Dashboard</button>
      </header>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Filter by Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="ALL">All Status</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="PARTIAL">Partial</option>
            <option value="SETTLED">Settled</option>
            <option value="LEGAL">Legal</option>
          </select>
        </div>
        <div className="filter-info">
          Showing {filtered.length} of {accounts.length} accounts
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">No accounts found</div>
      ) : (
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
                  <span className="label">District:</span>
                  <span className="value">{account.District || 'N/A'}</span>
                </div>
                <div className="card-row">
                  <span className="label">Phone:</span>
                  <span className="value">{account['Customer Phone'] || 'N/A'}</span>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SEARCH PAGE
// ============================================================================

function SearchPage({ onNavigate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    const result = await API.call('searchAccountsAllProducts', { query });
    if (result.success && result.data) {
      setResults(result.data);
    } else {
      setError('Search failed');
    }
    setSearched(true);
    setLoading(false);
  };

  return (
    <div className="search-page">
      <header className="page-header">
        <h1>🔍 Search Customer (All Products)</h1>
        <button onClick={() => onNavigate('dashboard')} className="btn-back">← Dashboard</button>
      </header>

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone, ID..."
          autoFocus
        />
        <button type="submit" disabled={loading} className="btn-search">
          {loading ? '⏳ Searching...' : '🔍 Search'}
        </button>
      </form>

      {error && <div className="page-error">❌ {error}</div>}

      {searched && (
        <div className="search-results">
          <p className="result-count">Found {results.length} results</p>
          {results.length > 0 ? (
            <div className="accounts-grid">
              {results.map((account) => (
                <div key={account['Customer ID'] + account['_Product']} className="account-card">
                  <div className="card-header">
                    <h3>{account['A/C Name']}</h3>
                    <span className="product-tag">{account['_Product']}</span>
                  </div>
                  <div className="card-body">
                    <div className="card-row">
                      <span className="label">Phone:</span>
                      <span className="value">{account['Customer Phone'] || 'N/A'}</span>
                    </div>
                    <div className="card-row">
                      <span className="label">Remaining:</span>
                      <span className="value">₹{Math.max(0, (parseFloat(account['Pay off']) || 0) - (parseFloat(account['Paid Amount']) || 0)).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No customers found matching your search</div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// REPORTS PAGE
// ============================================================================

function ReportsPage({ onNavigate }) {
  const { selectedProduct, productsLoaded } = useProduct();
  const [report, setReport] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (productsLoaded && selectedProduct) {
      loadReports();
    }
  }, [selectedProduct, productsLoaded]);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    
    const dailyResult = await API.call('getDailyCollectionReportByProduct', { productName: selectedProduct });
    const agentResult = await API.call('getAgentPerformanceByProduct', { productName: selectedProduct });

    if (dailyResult.success && dailyResult.data) {
      setReport(dailyResult.data);
    } else {
      setError('Failed to load reports');
    }

    if (agentResult.success && agentResult.data) {
      setAgents(agentResult.data);
    }

    setLoading(false);
  };

  if (loading) return <div className="page-loading">📈 Loading reports...</div>;
  if (error) return <div className="page-error">❌ {error}</div>;

  return (
    <div className="reports-page">
      <header className="page-header">
        <div>
          <h1>📊 Reports - {selectedProduct}</h1>
          <ProductSelector />
        </div>
        <button onClick={() => onNavigate('dashboard')} className="btn-back">← Dashboard</button>
      </header>

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

      <div className="tab-content">
        {activeTab === 'daily' && report && (
          <div className="report-section">
            <div className="report-header">
              <h3>Daily Collection Report</h3>
            </div>

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

            {report.byAgent && Object.keys(report.byAgent).length > 0 ? (
              <>
                <h4>By Agent</h4>
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
              </>
            ) : (
              <div className="empty-state">No payments recorded yet</div>
            )}
          </div>
        )}

        {activeTab === 'agents' && agents && agents.length > 0 && (
          <div className="report-section">
            <div className="report-header">
              <h3>Agent Performance</h3>
            </div>

            <table className="report-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Accounts</th>
                  <th>Recovery</th>
                  <th>Avg/Account</th>
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
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  return (
    <ProductProvider>
      <div className="app">
        {currentPage === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
        {currentPage === 'accounts' && <AccountsPage onNavigate={handleNavigate} />}
        {currentPage === 'search' && <SearchPage onNavigate={handleNavigate} />}
        {currentPage === 'reports' && <ReportsPage onNavigate={handleNavigate} />}
      </div>
    </ProductProvider>
  );
}

export default App;
              
