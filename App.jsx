import React, { useState, useEffect } from 'react';
import './App.css';

// ============================================================================
// CONFIG - UPDATED WITH YOUR IDS
// ============================================================================

const CONFIG = {
  SHEET_ID: '16O97Xr0T95Br21fmoGF1GtbeV0q5AujbddsbADgcMnI',
  GOOGLE_APPS_SCRIPT_URL: 'https://script.google.com/macros/d/AKfycbyhYfA5GmUdNFlnd3pbg0h_D6DyP3vfZuJReub8V64Mxe_knGksJvGHyTs0d6IMM1--/userweb'
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
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      return { success: false, error: error.message };
    }
  }
};

// ============================================================================
// EXCEL EXPORT HELPER
// ============================================================================

const ExcelExport = {
  generateCSV(data, filename) {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    let csv = headers.join(',') + '\n';
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value).replace(/"/g, '""');
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue}"`;
        }
        return stringValue;
      });
      csv += values.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  async generateXLSX(data, filename) {
    try {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js';
      script.onload = () => {
        const XLSX = window.XLSX;
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
        XLSX.writeFile(workbook, `${filename}.xlsx`);
      };
      document.body.appendChild(script);
    } catch (error) {
      console.error('Excel export error:', error);
      this.generateCSV(data, filename);
    }
  },

  exportReport(data, filename, format = 'xlsx') {
    if (format === 'xlsx') {
      this.generateXLSX(data, filename);
    } else if (format === 'csv') {
      this.generateCSV(data, filename);
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
      if (result.success && result.data.length > 0) {
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
// LOGIN PAGE
// ============================================================================

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await API.call('login', { username, password });

    if (result.success) {
      onLogin({
        username: result.username,
        agentName: result.agentName,
        role: result.role,
        token: result.token
      });
    } else {
      setError(result.error || 'Login failed');
    }

    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Recovery App</h1>
        <p className="subtitle">Collection Management System</p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="demo-info">Demo: agent1 / 1234</p>
      </div>
    </div>
  );
}

// ============================================================================
// PRODUCT SELECTOR
// ============================================================================

function ProductSelector() {
  const { products, selectedProduct, setSelectedProduct } = useProduct();

  if (products.length === 0) {
    return <div className="product-selector">No products available</div>;
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

function Dashboard({ user, onLogout, onNavigate }) {
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
    const result = await API.call('getDashboardSummaryByProduct', { 
      productName: selectedProduct,
      agentName: user.agentName 
    });
    if (result.success) {
      setSummary(result.data);
    }
    setLoading(false);
  };

  if (loading) return <div className="page-loading">Loading dashboard...</div>;
  if (!summary) return <div className="page-error">Failed to load dashboard</div>;

  return (
    <div className="dashboard-page">
      <header className="app-header">
        <div>
          <h1>Recovery Dashboard</h1>
          <ProductSelector />
        </div>
        <div className="header-info">
          <span>Welcome, {user.agentName}</span>
          <button onClick={onLogout} className="btn-logout">Logout</button>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-summary">
          <div className="summary-card">
            <h3>Total Accounts</h3>
            <p className="summary-value">{summary.totalAccounts}</p>
          </div>

          <div className="summary-card">
            <h3>Total Limit</h3>
            <p className="summary-value">₹{summary.totalLimit.toLocaleString('en-IN')}</p>
          </div>

          <div className="summary-card">
            <h3>Total Recovery</h3>
            <p className="summary-value">₹{summary.totalRecovery.toLocaleString('en-IN')}</p>
          </div>

          <div className="summary-card">
            <h3>Remaining Payoff</h3>
            <p className="summary-value">₹{summary.remainingPayoff.toLocaleString('en-IN')}</p>
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

function AccountsPage({ user, onNavigate, onSelectAccount }) {
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
    applyFilters();
  }, [accounts, filterStatus]);

  const loadAccounts = async () => {
    const result = await API.call('getAccountsByProductAndAgent', { 
      productName: selectedProduct,
      agentName: user.agentName 
    });
    if (result.success) {
      setAccounts(result.data);
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

  if (loading) return <div className="page-loading">Loading accounts...</div>;

  return (
    <div className="accounts-page">
      <header className="page-header">
        <div>
          <h1>{selectedProduct} - My Accounts</h1>
          <ProductSelector />
        </div>
        <button onClick={() => onNavigate('dashboard')} className="btn-back">← Dashboard</button>
      </header>

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
        <div className="filter-info">
          Showing {filtered.length} of {accounts.length} accounts
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
                <span className="label">District:</span>
                <span className="value">{account.District}</span>
              </div>
              <div className="card-row">
                <span className="label">Phone:</span>
                <span className="value">{account['Customer Phone']}</span>
              </div>

              <div className="card-financials">
                <div className="financial-item">
                  <span className="label">Limit</span>
                  <span className="value">₹{parseFloat(account.Limit || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="financial-item">
                  <span className="label">Paid</span>
                  <span className="value">₹{parseFloat(account['Paid Amount'] || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="financial-item">
                  <span className="label">Remaining</span>
                  <span className="value">₹{(parseFloat(account['Pay off'] || 0) - parseFloat(account['Paid Amount'] || 0)).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="card-actions">
              <button 
                onClick={() => onSelectAccount(account['Customer ID'])}
                className="btn-open"
              >
                Open
              </button>
              <button 
                onClick={() => window.location.href = `tel:${account['Customer Phone']}`}
                className="btn-call"
              >
                📞 Call
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// SEARCH PAGE
// ============================================================================

function SearchPage({ onNavigate, onSelectAccount }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    const result = await API.call('searchAccountsAllProducts', { query });
    if (result.success) {
      setResults(result.data);
    }
    setSearched(true);
    setLoading(false);
  };

  return (
    <div className="search-page">
      <header className="page-header">
        <h1>Search Customer (All Products)</h1>
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
          {loading ? '🔍 Searching...' : '🔍 Search'}
        </button>
      </form>

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
                      <span className="value">{account['Customer Phone']}</span>
                    </div>
                    <div className="card-row">
                      <span className="label">Remaining:</span>
                      <span className="value">₹{(parseFloat(account['Pay off']) - parseFloat(account['Paid Amount'])).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button 
                      onClick={() => onSelectAccount(account['Customer ID'])}
                      className="btn-open"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No customers found</div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// REPORTS PAGE WITH EXCEL EXPORT
// ============================================================================

function ReportsPage({ onNavigate }) {
  const { selectedProduct, productsLoaded } = useProduct();
  const [dailyReport, setDailyReport] = useState(null);
  const [agentPerformance, setAgentPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily');
  const [exportFormat, setExportFormat] = useState('xlsx');

  useEffect(() => {
    if (productsLoaded && selectedProduct) {
      loadReports();
    }
  }, [selectedProduct, productsLoaded]);

  const loadReports = async () => {
    setLoading(true);
    const dailyResult = await API.call('getDailyCollectionReportByProduct', { productName: selectedProduct });
    const agentResult = await API.call('getAgentPerformanceByProduct', { productName: selectedProduct });

    if (dailyResult.success) setDailyReport(dailyResult.data);
    if (agentResult.success) setAgentPerformance(agentResult.data);

    setLoading(false);
  };

  const handleExportDaily = () => {
    if (!dailyReport) {
      alert('No data to export');
      return;
    }

    const exportData = [
      {
        'Date': dailyReport.date,
        'Product': dailyReport.product,
        'Total Payments': dailyReport.totalPayments,
        'Total Collection': `₹${dailyReport.totalCollection.toLocaleString('en-IN')}`
      },
      {},
      {
        'Agent Name': 'Agent Name',
        'Payments': 'Payments',
        'Collection Amount': 'Collection Amount'
      }
    ];

    Object.entries(dailyReport.byAgent).forEach(([agent, data]) => {
      exportData.push({
        'Agent Name': agent,
        'Payments': data.count,
        'Collection Amount': `₹${data.total.toLocaleString('en-IN')}`
      });
    });

    const filename = `Daily_Collection_${selectedProduct}_${dailyReport.date}`;
    ExcelExport.exportReport(exportData, filename, exportFormat);
  };

  const handleExportAgentPerformance = () => {
    if (!agentPerformance || agentPerformance.length === 0) {
      alert('No data to export');
      return;
    }

    const exportData = agentPerformance.map(agent => ({
      'Agent Name': agent.agentName,
      'Product': agent.product,
      'Total Accounts': agent.totalAccounts,
      'Total Recovery': `₹${agent.totalRecovery.toLocaleString('en-IN')}`,
      'Avg Per Account': `₹${parseFloat(agent.avgRecoveryPerAccount).toLocaleString('en-IN')}`,
      'Payments Today': agent.paymentsToday,
      'Follow Ups Today': agent.followUpsToday
    }));

    const filename = `Agent_Performance_${selectedProduct}_${new Date().toISOString().split('T')[0]}`;
    ExcelExport.exportReport(exportData, filename, exportFormat);
  };

  if (loading) return <div className="page-loading">Loading reports...</div>;

  return (
    <div className="reports-page">
      <header className="page-header">
        <div>
          <h1>Reports - {selectedProduct}</h1>
          <ProductSelector />
        </div>
        <button onClick={() => onNavigate('dashboard')} className="btn-back">← Dashboard</button>
      </header>

      <div className="export-controls">
        <div className="export-format">
          <label>Export Format:</label>
          <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
            <option value="xlsx">Excel (.xlsx) ⭐ Recommended</option>
            <option value="csv">CSV (.csv)</option>
          </select>
        </div>
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

      <div className="tab-content">
        {activeTab === 'daily' && dailyReport && (
          <div className="report-section">
            <div className="report-header">
              <h3>Daily Collection Report - {dailyReport.date}</h3>
              <button 
                className="btn-export"
                onClick={handleExportDaily}
              >
                📥 Download Report ({exportFormat.toUpperCase()})
              </button>
            </div>

            <div className="report-summary">
              <div className="report-card">
                <span>Total Payments</span>
                <p>{dailyReport.totalPayments}</p>
              </div>
              <div className="report-card">
                <span>Total Collection</span>
                <p>₹{dailyReport.totalCollection.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <h4>By Agent</h4>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Agent Name</th>
                  <th>Payments</th>
                  <th>Collection</th>
                  <th>Avg Per Payment</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(dailyReport.byAgent).map(([agent, data]) => (
                  <tr key={agent}>
                    <td>{agent}</td>
                    <td>{data.count}</td>
                    <td>₹{data.total.toLocaleString('en-IN')}</td>
                    <td>₹{(data.total / data.count).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'agents' && agentPerformance && (
          <div className="report-section">
            <div className="report-header">
              <h3>Agent Performance</h3>
              <button 
                className="btn-export"
                onClick={handleExportAgentPerformance}
              >
                📥 Download Report ({exportFormat.toUpperCase()})
              </button>
            </div>

            <table className="report-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Accounts</th>
                  <th>Recovery</th>
                  <th>Avg/Account</th>
                  <th>Payments Today</th>
                  <th>Follow Ups</th>
                </tr>
              </thead>
              <tbody>
                {agentPerformance.map((agent) => (
                  <tr key={agent.agentName}>
                    <td>{agent.agentName}</td>
                    <td>{agent.totalAccounts}</td>
                    <td>₹{agent.totalRecovery.toLocaleString('en-IN')}</td>
                    <td>₹{parseFloat(agent.avgRecoveryPerAccount).toLocaleString('en-IN')}</td>
                    <td>{agent.paymentsToday}</td>
                    <td>{agent.followUpsToday}</td>
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
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('dashboard');
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  const handleSelectAccount = (customerId) => {
    setSelectedCustomerId(customerId);
    setCurrentPage('profile');
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <ProductProvider>
      <div className="app">
        {currentPage === 'dashboard' && (
          <Dashboard user={currentUser} onLogout={handleLogout} onNavigate={handleNavigate} />
        )}
        {currentPage === 'accounts' && (
          <AccountsPage user={currentUser} onNavigate={handleNavigate} onSelectAccount={handleSelectAccount} />
        )}
        {currentPage === 'search' && (
          <SearchPage onNavigate={handleNavigate} onSelectAccount={handleSelectAccount} />
        )}
        {currentPage === 'reports' && (
          <ReportsPage onNavigate={handleNavigate} />
        )}
      </div>
    </ProductProvider>
  );
}

export default App;
