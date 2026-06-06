import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, FileText, CheckSquare, FileSpreadsheet, 
  Activity, TrendingUp, LogOut, LogIn, Plus, Eye, Check, X, 
  Printer, Mail, Download, AlertCircle, ArrowRight, Clock, 
  ShieldAlert, RefreshCw, Send, CheckCircle2, ChevronRight
} from 'lucide-react';
import { api, checkBackendHealth } from './api';

export default function App() {
  // Authentication & State
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Forms & Inputs
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [signupRole, setSignupRole] = useState('officer');
  const [loginError, setLoginError] = useState('');
  
  // Vendor specific signup info
  const [vendorName, setVendorName] = useState('');
  const [vendorCategory, setVendorCategory] = useState('');
  const [vendorGst, setVendorGst] = useState('');

  // ERP Data States
  const [vendors, setVendors] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [pos, setPos] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ vendorCount: 0, rfqCount: 0, poCount: 0, invoiceCount: 0, totalSpend: 0 });
  
  // UI & Selection States
  const [loading, setLoading] = useState(false);
  const [dbMode, setDbMode] = useState('Checking Connection...');
  const [isDemo, setIsDemo] = useState(true);
  const [toast, setToast] = useState(null);
  
  // Selected Detail views
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [selectedPo, setSelectedPo] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [compareRfqId, setCompareRfqId] = useState('');
  
  // Action Modals & States
  const [showRfqModal, setShowRfqModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRegisterVendorModal, setShowRegisterVendorModal] = useState(false);
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [approvalQuoteId, setApprovalQuoteId] = useState('');

  // RFQ Form state
  const [rfqTitle, setRfqTitle] = useState('');
  const [rfqDesc, setRfqDesc] = useState('');
  const [rfqProducts, setRfqProducts] = useState([{ name: '', quantity: 1 }]);
  const [rfqDeadline, setRfqDeadline] = useState('');
  const [rfqAssignedVendors, setRfqAssignedVendors] = useState([]);

  // Quotation Form state
  const [quoteProducts, setQuoteProducts] = useState([]);
  const [quoteTimeline, setQuoteTimeline] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');

  // Vendor Register Form state
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorCat, setNewVendorCat] = useState('');
  const [newVendorGst, setNewVendorGst] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');

  // Run on mount
  useEffect(() => {
    initApp();
  }, []);

  // Sync data when user or active tab changes
  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
  }, [currentUser, activeTab]);

  const initApp = async () => {
    setLoading(true);
    const hasBackend = await checkBackendHealth();
    setIsDemo(!hasBackend);
    setDbMode(hasBackend ? 'Live Database (Atlas)' : 'Local Demo Mode');
    setLoading(false);
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const data = await api.login(emailInput, passwordInput);
      setCurrentUser(data.user);
      setIsDemo(api.isDemoMode());
      setDbMode(api.isDemoMode() ? 'Local Demo Mode' : 'Live Database (Atlas)');
      showToast(`Welcome back, ${data.user.name}!`, 'success');
      setActiveTab('dashboard');
    } catch (err) {
      const msg = err.message || 'Login failed';
      setLoginError(msg);
      // Don't show toast for login errors — we show inline instead
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.signup({
        name: nameInput,
        email: emailInput,
        password: passwordInput,
        role: signupRole,
        vendorName,
        vendorCategory,
        vendorGst
      });
      showToast('Account created! Please sign in with your new credentials.', 'success');
      setAuthMode('login');
      // Keep email pre-filled so user can just enter their password
      setPasswordInput('');
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setVendors([]);
    setRfqs([]);
    setQuotations([]);
    setPos([]);
    setInvoices([]);
    setLogs([]);
    setEmailInput('');
    setPasswordInput('');
    setLoginError('');
    showToast('Logged out successfully.', 'info');
  };

  const refreshData = async () => {
    if (!currentUser) return;
    try {
      // Vendors do not have permission to fetch the entire vendor directory.
      // We will only fetch vendors if the user is not a vendor.
      let vList = [];
      if (currentUser.role !== 'vendor') {
        vList = await api.getVendors();
      }

      const [rList, qList, pList, iList, lList] = await Promise.all([
        api.getRFQs(currentUser),
        api.getQuotations(null, currentUser),
        api.getPOs(currentUser),
        api.getInvoices(currentUser),
        api.getLogs()
      ]);

      setVendors(vList);
      setRfqs(rList);
      setQuotations(qList);
      setPos(pList);
      setInvoices(iList);
      setLogs(lList);
      
      // Update stats based on fetched data
      const statData = await api.getStats(rList, pList, iList, vList);
      setStats(statData);
    } catch (err) {
      console.error('Data loading error:', err);
    }
  };

  // Switch role function (Super useful for demo presentation)
  const handleQuickRoleSwitch = async (role) => {
    setLoading(true);
    let targetEmail = 'officer@vendorbridge.com';
    if (role === 'vendor') targetEmail = 'vendor@technocorp.com';
    else if (role === 'manager') targetEmail = 'manager@vendorbridge.com';
    else if (role === 'admin') targetEmail = 'admin@vendorbridge.com';

    try {
      const data = await api.login(targetEmail, 'password');
      setCurrentUser(data.user);
      setIsDemo(api.isDemoMode());
      showToast(`Switched view to: ${data.user.role.toUpperCase()}`, 'info');
      setActiveTab('dashboard');
    } catch (err) {
      showToast(`Could not switch role: ${err.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // RFQ CRUD methods
  const handleCreateRFQ = async (e) => {
    e.preventDefault();
    if (rfqAssignedVendors.length === 0) {
      showToast('Please assign at least one vendor.', 'warning');
      return;
    }
    try {
      await api.createRFQ({
        title: rfqTitle,
        description: rfqDesc,
        products: rfqProducts,
        deadline: newDocDeadline(),
        assignedVendors: rfqAssignedVendors
      }, currentUser.name);
      
      showToast('RFQ created and dispatched to vendors.', 'success');
      setShowRfqModal(false);
      resetRfqForm();
      refreshData();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const newDocDeadline = () => {
    return rfqDeadline ? new Date(rfqDeadline).toISOString() : new Date(Date.now() + 7*24*60*60*1000).toISOString();
  };

  const resetRfqForm = () => {
    setRfqTitle('');
    setRfqDesc('');
    setRfqProducts([{ name: '', quantity: 1 }]);
    setRfqDeadline('');
    setRfqAssignedVendors([]);
  };

  const handleAddProductRow = () => {
    setRfqProducts([...rfqProducts, { name: '', quantity: 1 }]);
  };

  const handleRemoveProductRow = (index) => {
    setRfqProducts(rfqProducts.filter((_, i) => i !== index));
  };

  const handleProductChange = (index, field, value) => {
    const updated = [...rfqProducts];
    updated[index][field] = value;
    setRfqProducts(updated);
  };

  const handleVendorSelect = (vendorId) => {
    if (rfqAssignedVendors.includes(vendorId)) {
      setRfqAssignedVendors(rfqAssignedVendors.filter(id => id !== vendorId));
    } else {
      setRfqAssignedVendors([...rfqAssignedVendors, vendorId]);
    }
  };

  // Quotation methods
  const openSubmitQuote = (rfq) => {
    setSelectedRfq(rfq);
    const initialProducts = rfq.products.map(p => ({
      productName: p.name,
      quantity: p.quantity,
      price: 0
    }));
    setQuoteProducts(initialProducts);
    setQuoteTimeline('');
    setQuoteNotes('');
    setShowQuoteModal(true);
  };

  const handleSubmitQuotation = async (e) => {
    e.preventDefault();
    const totalAmount = quoteProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    if (totalAmount <= 0) {
      showToast('Quotation total must be greater than zero.', 'warning');
      return;
    }
    try {
      await api.submitQuotation({
        rfqId: selectedRfq._id,
        vendorId: currentUser.vendorId._id || currentUser.vendorId,
        pricingDetails: quoteProducts.map(p => ({ productName: p.productName, price: Number(p.price) })),
        totalAmount,
        deliveryTimeline: Number(quoteTimeline),
        notes: quoteNotes
      }, currentUser.name);

      showToast('Quotation submitted successfully.', 'success');
      setShowQuoteModal(false);
      refreshData();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Approval methods
  const handleApproveQuotation = async () => {
    try {
      await api.approveQuotation(approvalQuoteId, approvalRemarks, currentUser.name);
      showToast('Quotation approved. RFQ has been marked as approved.', 'success');
      setShowApprovalModal(false);
      setApprovalRemarks('');
      refreshData();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // PO & Invoice methods
  const handleGeneratePO = async (rfqId, quoteId, vendorId) => {
    try {
      const po = await api.createPO({
        rfqId,
        quotationId: quoteId,
        vendorId,
        officerId: currentUser.id || currentUser._id
      }, currentUser.name);
      showToast(`Purchase Order ${po.poNumber} generated successfully!`, 'success');
      refreshData();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleGenerateInvoice = async (po) => {
    const quote = quotations.find(q => q._id === po.quotationId || q._id === po.quotationId?._id);
    if (!quote) return;
    
    const subtotal = quote.totalAmount;
    const taxAmount = Math.round(subtotal * 0.18); // 18% GST standard
    const totalAmount = subtotal + taxAmount;

    try {
      const inv = await api.createInvoice({
        poId: po._id,
        vendorId: po.vendorId?._id || po.vendorId,
        subtotal,
        taxAmount,
        totalAmount
      }, currentUser.name);
      showToast(`Invoice ${inv.invoiceNumber} created. Sent to procurement officer.`, 'success');
      refreshData();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleUpdateInvoiceStatus = async (id, status) => {
    try {
      await api.updateInvoiceStatus(id, status);
      showToast(`Invoice marked as ${status.toUpperCase()}.`, 'success');
      refreshData();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Vendor Status Update (Admin only)
  const handleUpdateVendorStatus = async (id, status) => {
    try {
      await api.updateVendorStatus(id, status);
      const label = status === 'approved' ? 'approved ✅' : status === 'blacklisted' ? 'blacklisted 🚫' : status;
      showToast(`Vendor has been ${label} successfully.`, 'success');
      refreshData();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Vendor Register methods (Admin only)
  const handleRegisterVendor = async (e) => {
    e.preventDefault();
    if (!newVendorName || !newVendorCat || !newVendorGst || !newVendorEmail) {
      showToast('Please fill all required vendor fields.', 'warning');
      return;
    }
    try {
      await api.registerVendor({
        name: newVendorName,
        category: newVendorCat,
        gstNumber: newVendorGst,
        contactEmail: newVendorEmail,
        contactPhone: newVendorPhone
      });
      showToast(`Vendor "${newVendorName}" added successfully! Status: Pending Approval.`, 'success');
      setShowRegisterVendorModal(false);
      setNewVendorName('');
      setNewVendorCat('');
      setNewVendorGst('');
      setNewVendorEmail('');
      setNewVendorPhone('');
      refreshData();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Simulation support
  const handleSimulateEmail = (invoice) => {
    showToast(`Simulation: Emailing Invoice ${invoice.invoiceNumber} to ${invoice.vendorId?.contactEmail || 'Vendor'}...`, 'info');
    setTimeout(() => {
      showToast(`Email delivered successfully to recipient!`, 'success');
    }, 2000);
  };

  // Render Helpers
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  return (
    <div className="app-container">
      {toast && (
        <div style={{
          position: 'fixed', top: '48px', right: '24px', zIndex: 9999,
          background: toast.type === 'success' ? 'var(--accent-emerald)' : toast.type === 'danger' ? 'var(--accent-rose)' : 'var(--accent-blue)',
          color: '#fff', padding: '12px 24px', borderRadius: '10px', boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600,
          animation: 'slideIn 0.3s ease'
        }}>
          <AlertCircle size={18} />
          {toast.message}
        </div>
      )}

      {/* Main Authentic View or Login */}
      {!currentUser ? (
        <div className="auth-container">
          <div className="glass-card auth-card">
            <div className="auth-header">
              <FileSpreadsheet className="auth-logo" />
              <h2>VendorBridge</h2>
              <p>Procurement & Vendor Management ERP</p>
            </div>
            
            {authMode === 'login' ? (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="your@email.com"
                    value={emailInput}
                    onChange={(e) => { setEmailInput(e.target.value); setLoginError(''); }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={(e) => { setPasswordInput(e.target.value); setLoginError(''); }}
                  />
                </div>

                {/* Inline login error with Sign Up prompt */}
                {loginError && (
                  <div style={{
                    background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.35)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    marginBottom: '12px',
                    fontSize: '0.85rem',
                    color: '#fca5a5',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <span>⚠️ {loginError}</span>
                    {loginError.toLowerCase().includes('no account') && (
                      <span style={{ color: 'var(--text-secondary)' }}>
                        First time on this device?{' '}
                        <a
                          href="#"
                          style={{ color: 'var(--accent-blue)', fontWeight: 600 }}
                          onClick={(e) => { e.preventDefault(); setAuthMode('signup'); setLoginError(''); }}
                        >
                          Create your account here →
                        </a>
                      </span>
                    )}
                  </div>
                )}

                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }} disabled={loading}>
                  <LogIn size={18} /> {loading ? 'Authenticating...' : 'Sign In'}
                </button>
                <div className="auth-footer">
                  Don't have an account? <a href="#" onClick={() => { setAuthMode('signup'); setLoginError(''); }}>Sign Up</a>
                </div>

                {/* DB mode hint */}
                <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '12px', opacity: 0.7 }}>
                  🔌 {dbMode === 'Live Database (Atlas)' ? 'Connected to shared cloud database' : 'Running in local demo mode'}
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignup}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" required className="form-input" placeholder="Alok Mishra" value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" required className="form-input" placeholder="email@company.com" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input type="password" required className="form-input" placeholder="••••••••" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">ERP System Role</label>
                  <select className="form-select" value={signupRole} onChange={(e) => setSignupRole(e.target.value)}>
                    <option value="officer">Procurement Officer</option>
                    <option value="vendor">Vendor (Organization representative)</option>
                    <option value="manager">Manager / Approver</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                {signupRole === 'vendor' && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-glass)', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase' }}>Vendor Details</h4>
                    <div className="form-group" style={{ marginBottom: '10px' }}>
                      <input type="text" placeholder="Vendor Company Name" required className="form-input" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: '10px' }}>
                      <input type="text" placeholder="Category (e.g. IT, Office)" required className="form-input" value={vendorCategory} onChange={(e) => setVendorCategory(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: '0px' }}>
                      <input type="text" placeholder="GST Number" required className="form-input" value={vendorGst} onChange={(e) => setVendorGst(e.target.value)} />
                    </div>
                  </div>
                )}

                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }} disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
                <div className="auth-footer">
                  Already have an account? <a href="#" onClick={() => setAuthMode('login')}>Sign In</a>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : (
        /* --- MAIN ERP LAYOUT --- */
        <div style={{ display: 'flex', width: '100%', marginTop: '32px' }}>
          {/* SIDEBAR NAVIGATION */}
          <aside className="sidebar">
            <div className="logo-container">
              <FileSpreadsheet className="logo-icon" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="logo-text">VendorBridge</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--accent-blue)', fontWeight: 700, textTransform: 'uppercase', tracking: '0.1em' }}>ERP Modules</span>
              </div>
            </div>

            <ul className="nav-links">
              <li>
                <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setSelectedInvoice(null); }}>
                  <LayoutDashboard className="nav-icon" /> Dashboard
                </div>
              </li>
              
              {/* Only Admin / Officer / Manager see Vendors */}
              {['officer', 'manager', 'admin'].includes(currentUser.role) && (
                <li>
                  <div className={`nav-item ${activeTab === 'vendors' ? 'active' : ''}`} onClick={() => setActiveTab('vendors')}>
                    <Users className="nav-icon" /> Vendor Directory
                  </div>
                </li>
              )}

              <li>
                <div className={`nav-item ${activeTab === 'rfqs' ? 'active' : ''}`} onClick={() => setActiveTab('rfqs')}>
                  <FileText className="nav-icon" /> RFQs & Bidding
                </div>
              </li>

              {/* Only Officer / Manager see comparison */}
              {['officer', 'manager'].includes(currentUser.role) && (
                <li>
                  <div className={`nav-item ${activeTab === 'comparison' ? 'active' : ''}`} onClick={() => setActiveTab('comparison')}>
                    <FileSpreadsheet className="nav-icon" /> Compare Quotations
                  </div>
                </li>
              )}

              {/* Manager/Officer see approvals */}
              {['officer', 'manager'].includes(currentUser.role) && (
                <li>
                  <div className={`nav-item ${activeTab === 'approvals' ? 'active' : ''}`} onClick={() => setActiveTab('approvals')}>
                    <CheckSquare className="nav-icon" /> Workflows & Approvals
                  </div>
                </li>
              )}

              <li>
                <div className={`nav-item ${activeTab === 'pos_invoices' ? 'active' : ''}`} onClick={() => setActiveTab('pos_invoices')}>
                  <FileSpreadsheet className="nav-icon" /> POs & Invoices
                </div>
              </li>

              {currentUser.role !== 'vendor' && (
                <>
                  <li>
                    <div className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
                      <TrendingUp className="nav-icon" /> Reports & Analytics
                    </div>
                  </li>

                  <li>
                    <div className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
                      <Activity className="nav-icon" /> Activity Logs
                    </div>
                  </li>
                </>
              )}
            </ul>

            <div style={{ padding: '20px', borderTop: '1px solid var(--border-glass)' }}>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogout}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          </aside>

          {/* MAIN PAGE WRAPPER */}
          <div className="main-wrapper">
            {/* HEADER */}
            <header className="header">
              <div className="header-title-section">
                <h1>{activeTab.replace('_', ' & ').toUpperCase()}</h1>
              </div>

              <div className="header-right-section">
                <div className="profile-badge">
                  <div className="profile-avatar">
                    {currentUser.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="profile-name">{currentUser.name}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                      {currentUser.role === 'officer' ? 'Procurement Officer' : currentUser.role === 'vendor' ? `Vendor: ${currentUser.vendorId?.name || 'Company'}` : currentUser.role}
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* VIEWPORT CONTENT */}
            <main className="content-area">
              
              {/* --- 1. DASHBOARD SCREEN --- */}
              {activeTab === 'dashboard' && (
                <div>
                  <div className="stats-grid">
                    {['admin', 'manager', 'officer'].includes(currentUser.role) && (
                      <div className="glass-card stat-card">
                        <div className="stat-icon-container" style={{ background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-indigo))' }}>
                          <Users size={24} />
                        </div>
                        <div className="stat-info">
                          <h4>Active Vendors</h4>
                          <p>{vendors.length}</p>
                        </div>
                      </div>
                    )}

                    <div className="glass-card stat-card">
                      <div className="stat-icon-container" style={{ background: 'linear-gradient(135deg, var(--accent-amber), #d97706)' }}>
                        <FileText size={24} />
                      </div>
                      <div className="stat-info">
                        <h4>{currentUser.role === 'vendor' ? 'Assigned RFQs' : currentUser.role === 'officer' ? 'My RFQs' : 'Total RFQs'}</h4>
                        <p>{rfqs.length}</p>
                      </div>
                    </div>

                    <div className="glass-card stat-card">
                      <div className="stat-icon-container" style={{ background: 'linear-gradient(135deg, var(--accent-indigo), #4f46e5)' }}>
                        <FileSpreadsheet size={24} />
                      </div>
                      <div className="stat-info">
                        <h4>{currentUser.role === 'vendor' ? 'My POs' : currentUser.role === 'officer' ? 'Generated POs' : 'Purchase Orders'}</h4>
                        <p>{pos.length}</p>
                      </div>
                    </div>

                    {['admin', 'manager'].includes(currentUser.role) && (
                      <div className="glass-card stat-card">
                        <div className="stat-icon-container" style={{ background: 'linear-gradient(135deg, var(--accent-emerald), #059669)' }}>
                          <TrendingUp size={24} />
                        </div>
                        <div className="stat-info">
                          <h4>ERP Total Spend</h4>
                          <p>{formatCurrency(invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0))}</p>
                        </div>
                      </div>
                    )}
                    {currentUser.role === 'vendor' && (
                      <div className="glass-card stat-card">
                        <div className="stat-icon-container" style={{ background: 'linear-gradient(135deg, var(--accent-emerald), #059669)' }}>
                          <TrendingUp size={24} />
                        </div>
                        <div className="stat-info">
                          <h4>Total Earnings</h4>
                          <p>{formatCurrency(invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0))}</p>
                        </div>
                      </div>
                    )}
                    {currentUser.role === 'officer' && (
                      <div className="glass-card stat-card">
                        <div className="stat-icon-container" style={{ background: 'linear-gradient(135deg, var(--accent-emerald), #059669)' }}>
                          <TrendingUp size={24} />
                        </div>
                        <div className="stat-info">
                          <h4>My PO Spend</h4>
                          <p>{formatCurrency(invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0))}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid-2">
                    {/* Welcome & Role Info */}
                    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Welcome to VendorBridge ERP</h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                          You are currently logged in as a <strong>{currentUser.role.toUpperCase()}</strong>. Based on your role, you can perform procurement planning, vendor management, quotation approvals, order conversions, and invoice operations.
                        </p>
                      </div>
                      
                      <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {currentUser.role === 'officer' && (
                          <>
                            <button className="btn btn-primary" onClick={() => setShowRfqModal(true)}>
                              <Plus size={16} /> New RFQ Invitation
                            </button>
                            <button className="btn btn-secondary" onClick={() => setActiveTab('vendors')}>
                              Manage Vendors
                            </button>
                          </>
                        )}
                        {currentUser.role === 'vendor' && (
                          <button className="btn btn-primary" onClick={() => setActiveTab('rfqs')}>
                            <FileText size={16} /> View Assigned RFQs
                          </button>
                        )}
                        {currentUser.role === 'manager' && (
                          <button className="btn btn-success" onClick={() => setActiveTab('approvals')}>
                            <CheckSquare size={16} /> Review Bidding Approvals
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pending Approvals or Actions */}
                    <div className="glass-card">
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>Procurement Overview</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-glass)' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{currentUser.role === 'vendor' ? 'Open Assigned RFQs' : 'Active RFQs (Open Bidding)'}</span>
                          <span className="badge badge-info">{rfqs.filter(r => r.status === 'active').length}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-glass)' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{currentUser.role === 'vendor' ? 'My Submitted Quotes' : 'Submitted Quotations'}</span>
                          <span className="badge badge-warning">{quotations.filter(q => q.status === 'submitted').length}</span>
                        </div>
                        {['officer', 'manager', 'admin'].includes(currentUser.role) && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-glass)' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Approved Orders awaiting PO</span>
                            <span className="badge badge-success">{rfqs.filter(r => r.status === 'approved').length}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Pending Invoices</span>
                          <span className="badge badge-danger">{invoices.filter(i => i.status === 'sent').length}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity Log - Hidden for vendors to protect privacy */}
                  {currentUser.role !== 'vendor' && (
                    <div className="glass-card">
                      <div className="card-header-flex">
                        <h3>Recent Audit Activity</h3>
                        <button className="btn btn-secondary" onClick={() => setActiveTab('logs')}>View Full Audit Logs</button>
                      </div>
                      <div className="table-container">
                        <table className="custom-table">
                          <thead>
                            <tr>
                              <th>Time</th>
                              <th>User</th>
                              <th>Action</th>
                              <th>Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {logs.slice(0, 4).map(log => (
                              <tr key={log._id}>
                                <td style={{ color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleTimeString()}</td>
                                <td><strong>{log.userName}</strong></td>
                                <td><span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{log.action}</span></td>
                                <td>{log.details}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* --- 2. VENDOR MANAGEMENT DIRECTORY --- */}
              {activeTab === 'vendors' && (
                <div>
                  <div className="card-header-flex">
                    <h2>Authorized Vendors</h2>
                    {currentUser.role === 'admin' && (
                      <button className="btn btn-primary" onClick={() => setShowRegisterVendorModal(true)}>
                        <Plus size={18} /> Add New Vendor Record
                      </button>
                    )}
                  </div>

                  <div className="glass-card">
                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Company Name</th>
                            <th>Category</th>
                            <th>GST Registration</th>
                            <th>Email Contact</th>
                            <th>Phone</th>
                            <th>Trust Rating</th>
                            <th>Approval Status</th>
                            {currentUser.role === 'admin' && <th>ERP Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {vendors.map(vendor => (
                            <tr key={vendor._id}>
                              <td><strong>{vendor.name}</strong></td>
                              <td>{vendor.category}</td>
                              <td><code>{vendor.gstNumber}</code></td>
                              <td>{vendor.contactEmail}</td>
                              <td>{vendor.contactPhone}</td>
                              <td style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>⭐ {vendor.rating}</td>
                              <td>
                                <span className={`badge ${
                                  vendor.status === 'approved' ? 'badge-success' : 
                                  vendor.status === 'blacklisted' ? 'badge-danger' : 'badge-warning'
                                }`}>
                                  {vendor.status}
                                </span>
                              </td>
                              {currentUser.role === 'admin' && (
                                <td>
                                  {vendor.status === 'pending' && (
                                    <button className="btn btn-success btn-icon-only" onClick={() => handleUpdateVendorStatus(vendor._id, 'approved')} title="Approve Vendor">
                                      <Check size={14} />
                                    </button>
                                  )}
                                  {vendor.status === 'approved' && (
                                    <button className="btn btn-danger btn-icon-only" onClick={() => handleUpdateVendorStatus(vendor._id, 'blacklisted')} title="Blacklist Vendor">
                                      <X size={14} />
                                    </button>
                                  )}
                                  {vendor.status === 'blacklisted' && (
                                    <button className="btn btn-secondary btn-icon-only" onClick={() => handleUpdateVendorStatus(vendor._id, 'approved')} title="Re-Authorize Vendor">
                                      <Check size={14} />
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* --- 3. RFQs & BIDDING PROCESS --- */}
              {activeTab === 'rfqs' && (
                <div>
                  <div className="card-header-flex">
                    <h2>Requests for Quotations (RFQs)</h2>
                    {currentUser.role === 'officer' && (
                      <button className="btn btn-primary" onClick={() => { resetRfqForm(); setShowRfqModal(true); }}>
                        <Plus size={18} /> Draft & Publish RFQ
                      </button>
                    )}
                  </div>

                  <div className="glass-card">
                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>RFQ ID</th>
                            <th>Request Title</th>
                            <th>Target Products/Services</th>
                            <th>Deadline Date</th>
                            <th>Bidding Status</th>
                            {currentUser.role !== 'vendor' && <th>Assigned Bidders</th>}
                            <th>Quotation Submissions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rfqs.map(rfq => {
                            // Filter assigned for vendor role
                            const isAssigned = currentUser.role !== 'vendor' || 
                              rfq.assignedVendors.some(v => v._id === currentUser.vendorId?._id || v === currentUser.vendorId?._id);

                            if (!isAssigned) return null;

                            const rfqQuotes = quotations.filter(q => {
                              const rfqIdStr = (q.rfqId?._id || q.rfqId || '').toString();
                              const targetRfqIdStr = (rfq._id || rfq || '').toString();
                              return rfqIdStr === targetRfqIdStr;
                            });
                            const vendorQuote = rfqQuotes.find(q => {
                              const vendorIdStr = (q.vendorId?._id || q.vendorId || '').toString();
                              const currentVendorIdStr = (currentUser.vendorId?._id || currentUser.vendorId || '').toString();
                              return vendorIdStr && vendorIdStr === currentVendorIdStr;
                            });

                            return (
                              <tr key={rfq._id}>
                                <td><code>{rfq._id.slice(-6).toUpperCase()}</code></td>
                                <td>
                                  <strong>{rfq.title}</strong>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    {rfq.description}
                                  </div>
                                </td>
                                <td>
                                  <ul style={{ paddingLeft: '16px', fontSize: '0.85rem' }}>
                                    {rfq.products.map((p, idx) => (
                                      <li key={idx}>{p.name} <strong>x{p.quantity}</strong></li>
                                    ))}
                                  </ul>
                                </td>
                                <td>{formatDate(rfq.deadline)}</td>
                                <td>
                                  <span className={`badge ${
                                    rfq.status === 'active' ? 'badge-info' : 
                                    rfq.status === 'approved' ? 'badge-success' : 
                                    rfq.status === 'completed' ? 'badge-muted' : 'badge-warning'
                                  }`}>
                                    {rfq.status === 'active' ? 'Open for Bids' : rfq.status}
                                  </span>
                                </td>
                                {currentUser.role !== 'vendor' && (
                                  <td>
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                      {rfq.assignedVendors.map((v, i) => (
                                        <span key={i} className="badge badge-muted" style={{ fontSize: '0.65rem' }}>{v.name || v}</span>
                                      ))}
                                    </div>
                                  </td>
                                )}
                                <td>
                                  {currentUser.role === 'vendor' ? (
                                    vendorQuote ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span className="badge badge-success">Submitted</span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{formatCurrency(vendorQuote.totalAmount)}</span>
                                      </div>
                                    ) : rfq.status === 'active' ? (
                                      <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => openSubmitQuote(rfq)}>
                                        Submit Quote
                                      </button>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Closed</span>
                                    )
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <strong>{rfqQuotes.length} Quotes</strong>
                                      {rfqQuotes.length > 0 && (
                                        <button className="btn btn-secondary btn-icon-only" onClick={() => { setCompareRfqId(rfq._id); setActiveTab('comparison'); }} title="Compare quotations">
                                          <Eye size={14} />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* --- 4. QUOTATION COMPARISON SCREEN --- */}
              {activeTab === 'comparison' && (
                <div>
                  <h2>Quotation Comparison Ledger</h2>
                  
                  <div className="glass-card" style={{ marginBottom: '24px' }}>
                    <div className="form-group" style={{ marginBottom: '0px' }}>
                      <label className="form-label">Select RFQ to Compare Quotations</label>
                      <select className="form-select" value={compareRfqId} onChange={(e) => setCompareRfqId(e.target.value)}>
                        <option value="">-- Choose an RFQ to view side-by-side bids --</option>
                        {rfqs.map(rfq => (
                          <option key={rfq._id} value={rfq._id}>{rfq.title} ({rfq.status})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {compareRfqId ? (
                    (() => {
                      const selected = rfqs.find(r => r._id === compareRfqId);
                      const quotes = quotations.filter(q => {
                        const rfqIdStr = (q.rfqId?._id || q.rfqId || '').toString();
                        const compareRfqIdStr = (compareRfqId || '').toString();
                        return rfqIdStr === compareRfqIdStr;
                      });
                      
                      if (quotes.length === 0) {
                        return (
                          <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                            <AlertCircle size={48} style={{ color: 'var(--accent-amber)', marginBottom: '16px' }} />
                            <h3>No Quotations Received</h3>
                            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Assign and request bids from vendors to compare quotations.</p>
                          </div>
                        );
                      }

                      // Find lowest quotation price
                      const lowestPrice = Math.min(...quotes.map(q => q.totalAmount));

                      return (
                        <div>
                          <div className="glass-card">
                            <h3 style={{ marginBottom: '8px' }}>RFQ Details: {selected?.title}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{selected?.description}</p>
                          </div>

                          <div className="compare-grid">
                            {quotes.map(quote => {
                              const isLowest = quote.totalAmount === lowestPrice;
                              const vendorObj = quote.vendorId;

                              return (
                                <div key={quote._id} className={`glass-card compare-card ${isLowest ? 'lowest-price' : ''}`}>
                                  <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div>
                                      <h3 style={{ fontSize: '1.2rem' }}>{vendorObj?.name || 'Unknown Vendor'}</h3>
                                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Rating: ⭐ {vendorObj?.rating}</span>
                                    </div>
                                    <span className={`badge ${
                                      quote.status === 'selected' ? 'badge-success' : 
                                      quote.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                                    }`}>
                                      {quote.status}
                                    </span>
                                  </div>

                                  <div style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: 'var(--text-secondary)' }}>Delivery Timeline:</span>
                                      <strong>{quote.deliveryTimeline} Days</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: 'var(--text-secondary)' }}>Total Bid Value:</span>
                                      <strong style={{ fontSize: '1.25rem', color: isLowest ? 'var(--accent-emerald)' : 'inherit' }}>
                                        {formatCurrency(quote.totalAmount)}
                                      </strong>
                                    </div>
                                  </div>

                                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px' }}>
                                    <strong>Vendor Terms & Remarks:</strong>
                                    <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{quote.notes || 'No notes provided.'}</p>
                                  </div>

                                  {currentUser.role === 'officer' && selected?.status === 'active' && quote.status === 'submitted' && (
                                    <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => {
                                      setApprovalQuoteId(quote._id);
                                      setShowApprovalModal(true);
                                    }}>
                                      Submit for Approvals
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                      <FileSpreadsheet size={48} style={{ color: 'var(--accent-blue)', marginBottom: '16px' }} />
                      <h3>Select an RFQ</h3>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Choose an RFQ from the drop-down menu above to review and compare quotation values side by side.</p>
                    </div>
                  )}
                </div>
              )}

              {/* --- 5. APPROVAL WORKFLOWS --- */}
              {activeTab === 'approvals' && (
                <div>
                  <h2>Procurement Workflows & Pending Approvals</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    As a Manager/Approver, reviews submitted quotation summaries and signs off to authorize purchase order generation.
                  </p>

                  <div className="glass-card">
                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Quotation ID</th>
                            <th>RFQ Request</th>
                            <th>Bidding Vendor</th>
                            <th>Quoted Amount</th>
                            <th>Delivery Time</th>
                            <th>Status State</th>
                            <th>Approver Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quotations.filter(q => q.status === 'submitted').map(quote => (
                            <tr key={quote._id}>
                              <td><code>{quote._id.slice(-6).toUpperCase()}</code></td>
                              <td><strong>{quote.rfqId?.title}</strong></td>
                              <td>{quote.vendorId?.name}</td>
                              <td><strong style={{ color: 'var(--accent-emerald)' }}>{formatCurrency(quote.totalAmount)}</strong></td>
                              <td>{quote.deliveryTimeline} Days</td>
                              <td><span className="badge badge-warning">Awaiting Approval</span></td>
                              <td>
                                {currentUser.role === 'manager' ? (
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn btn-success btn-icon-only" onClick={() => {
                                      setApprovalQuoteId(quote._id);
                                      setShowApprovalModal(true);
                                    }} title="Approve Quote">
                                      <Check size={14} /> Approve
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Officer cannot approve</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {quotations.filter(q => q.status === 'submitted').length === 0 && (
                            <tr>
                              <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                                No pending procurement requests awaiting approval.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* --- 6. POs & INVOICE MANAGEMENT --- */}
              {activeTab === 'pos_invoices' && (
                <div>
                  <h2>Purchase Orders & Invoices</h2>

                  {selectedInvoice ? (
                    /* INVOICE DETAIL & PRINT VIEW */
                    <div>
                      <div className="card-header-flex">
                        <button className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>
                          &larr; Back to List
                        </button>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary" onClick={() => window.print()}>
                            <Printer size={16} /> Print/Download PDF
                          </button>
                          <button className="btn btn-success" onClick={() => handleSimulateEmail(selectedInvoice)}>
                            <Mail size={16} /> Send Email to Vendor
                          </button>
                          {currentUser.role === 'officer' && selectedInvoice.status === 'sent' && (
                            <button className="btn btn-success" onClick={() => handleUpdateInvoiceStatus(selectedInvoice._id, 'paid')}>
                              <CheckCircle2 size={16} /> Record Payment
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Professional Invoice Layout */}
                      <div className="document-view">
                        <div className="document-header">
                          <div>
                            <div className="document-logo">VendorBridge Procurement ERP</div>
                            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '4px' }}>Automated Invoice Document</p>
                          </div>
                          <div className="document-meta">
                            <h2 style={{ fontSize: '1.5rem', color: '#111827' }}>INVOICE</h2>
                            <p style={{ fontWeight: 'bold', marginTop: '4px' }}>Invoice: {selectedInvoice.invoiceNumber}</p>
                            <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Date: {formatDate(selectedInvoice.createdAt)}</p>
                            <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Status: <span style={{ textTransform: 'uppercase', fontWeight: 'bold', color: selectedInvoice.status === 'paid' ? '#10b981' : '#f59e0b' }}>{selectedInvoice.status}</span></p>
                          </div>
                        </div>

                        <div className="document-details">
                          <div>
                            <h4>Billed To (Buyer)</h4>
                            <p><strong>VendorBridge Corp Ltd</strong></p>
                            <p>Global Procurement Division</p>
                            <p>Bangalore, Karnataka, India</p>
                            <p>GSTIN: 29AAACV5849R1Z1</p>
                          </div>
                          <div>
                            <h4>Billed By (Seller Vendor)</h4>
                            <p><strong>{selectedInvoice.vendorId?.name}</strong></p>
                            <p>{selectedInvoice.vendorId?.category}</p>
                            <p>Email: {selectedInvoice.vendorId?.contactEmail}</p>
                            <p>GSTIN: {selectedInvoice.vendorId?.gstNumber}</p>
                          </div>
                        </div>

                        <table className="doc-table">
                          <thead>
                            <tr>
                              <th>Product Description</th>
                              <th style={{ textAlign: 'right' }}>Total Quoted price (INR)</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>
                                Procurement supplies matching purchase order <strong>{selectedInvoice.poId?.poNumber}</strong>
                              </td>
                              <td style={{ textAlign: 'right' }}>{formatCurrency(selectedInvoice.subtotal)}</td>
                            </tr>
                          </tbody>
                        </table>

                        <div className="doc-total">
                          <div className="doc-total-row">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                          </div>
                          <div className="doc-total-row">
                            <span>GST (18% standard tax):</span>
                            <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                          </div>
                          <div className="doc-total-row grand">
                            <span>Total Due:</span>
                            <span>{formatCurrency(selectedInvoice.totalAmount)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* NORMAL PO / INVOICE PANELS */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                      
                      {/* PURCHASE ORDERS SECTION */}
                      <div className="glass-card">
                        <h3 style={{ marginBottom: '20px' }}>Purchase Orders</h3>
                        
                        {/* If Officer role, check if there are RFQs approved ready for PO */}
                        {currentUser.role === 'officer' && (
                          (() => {
                            const approvedRFQs = rfqs.filter(r => r.status === 'approved');
                            if (approvedRFQs.length > 0) {
                              return (
                                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                                  <h4 style={{ color: 'var(--accent-emerald)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <CheckCircle2 size={16} /> Bids Approved - Ready to Generate Purchase Orders
                                  </h4>
                                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {approvedRFQs.map(rfq => {
                                      const approvedQuote = quotations.find(q => (q.rfqId?._id === rfq._id || q.rfqId === rfq._id) && q.status === 'selected');
                                      if (!approvedQuote) return null;
                                      return (
                                        <li key={rfq._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: '10px 16px', borderRadius: '8px' }}>
                                          <div>
                                            <strong>{rfq.title}</strong> - Quote from {approvedQuote.vendorId?.name} ({formatCurrency(approvedQuote.totalAmount)})
                                          </div>
                                          <button className="btn btn-success btn-icon-only" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleGeneratePO(rfq._id, approvedQuote._id, approvedQuote.vendorId?._id || approvedQuote.vendorId)}>
                                            <Send size={12} /> Convert to PO
                                          </button>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              );
                            }
                          })()
                        )}

                        <div className="table-container">
                          <table className="custom-table">
                            <thead>
                              <tr>
                                <th>PO Number</th>
                                <th>Source RFQ</th>
                                <th>Supplier Vendor</th>
                                <th>Order Date</th>
                                <th>PO Status</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pos.map(po => {
                                const isVendorPo = currentUser.role !== 'vendor' || 
                                  (po.vendorId?._id || po.vendorId) === currentUser.vendorId?._id;
                                if (!isVendorPo) return null;

                                const hasInvoice = invoices.some(i => i.poId?._id === po._id || i.poId === po._id);

                                return (
                                  <tr key={po._id}>
                                    <td><strong>{po.poNumber}</strong></td>
                                    <td>{po.rfqId?.title}</td>
                                    <td>{po.vendorId?.name}</td>
                                    <td>{formatDate(po.createdAt)}</td>
                                    <td><span className="badge badge-success">Dispatched</span></td>
                                    <td>
                                      {currentUser.role === 'vendor' && !hasInvoice ? (
                                        <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleGenerateInvoice(po)}>
                                          Submit Invoice
                                        </button>
                                      ) : hasInvoice ? (
                                        <span className="badge badge-muted">Invoiced</span>
                                      ) : (
                                        <span className="badge badge-info">Awaiting Vendor Invoice</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                              {pos.length === 0 && (
                                <tr>
                                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                                    No purchase orders generated yet.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* INVOICES SECTION */}
                      <div className="glass-card">
                        <h3 style={{ marginBottom: '20px' }}>Invoices Ledger</h3>
                        <div className="table-container">
                          <table className="custom-table">
                            <thead>
                              <tr>
                                <th>Invoice Number</th>
                                <th>PO reference</th>
                                <th>Supplier Vendor</th>
                                <th>Subtotal</th>
                                <th>GST Tax</th>
                                <th>Grand Total</th>
                                <th>Payment Status</th>
                                <th>Audit Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invoices.map(invoice => {
                                const isVendorInv = currentUser.role !== 'vendor' || 
                                  (invoice.vendorId?._id || invoice.vendorId) === currentUser.vendorId?._id;
                                if (!isVendorInv) return null;

                                return (
                                  <tr key={invoice._id}>
                                    <td><strong>{invoice.invoiceNumber}</strong></td>
                                    <td><code>{invoice.poId?.poNumber}</code></td>
                                    <td>{invoice.vendorId?.name}</td>
                                    <td>{formatCurrency(invoice.subtotal)}</td>
                                    <td>{formatCurrency(invoice.taxAmount)}</td>
                                    <td><strong>{formatCurrency(invoice.totalAmount)}</strong></td>
                                    <td>
                                      <span className={`badge ${
                                        invoice.status === 'paid' ? 'badge-success' : 'badge-warning'
                                      }`}>
                                        {invoice.status}
                                      </span>
                                    </td>
                                    <td>
                                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setSelectedInvoice(invoice)}>
                                        <Eye size={12} /> View Invoice
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {invoices.length === 0 && (
                                <tr>
                                  <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                                    No invoices generated.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              )}

              {/* --- 7. REPORTS & ANALYTICS --- */}
              {activeTab === 'analytics' && (
                <div>
                  <h2>Procurement Statistics & Trend Reports</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    Real-time cost analysis, budget allocations, and performance evaluations.
                  </p>

                  <div className="stats-grid">
                    <div className="glass-card stat-card">
                      <div className="stat-icon-container" style={{ background: 'var(--accent-blue)' }}>
                        <TrendingUp size={24} />
                      </div>
                      <div className="stat-info">
                        <h4>Aggregate Spend</h4>
                        <p>{formatCurrency(stats.totalSpend)}</p>
                      </div>
                    </div>

                    <div className="glass-card stat-card">
                      <div className="stat-icon-container" style={{ background: 'var(--accent-emerald)' }}>
                        <CheckCircle2 size={24} />
                      </div>
                      <div className="stat-info">
                        <h4>Completed RFQs</h4>
                        <p>{rfqs.filter(r => r.status === 'completed').length}</p>
                      </div>
                    </div>

                    <div className="glass-card stat-card">
                      <div className="stat-icon-container" style={{ background: 'var(--accent-amber)' }}>
                        <Clock size={24} />
                      </div>
                      <div className="stat-info">
                        <h4>Awaiting Bids</h4>
                        <p>{rfqs.filter(r => r.status === 'active').length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid-2">
                    {/* SVG Spending distribution chart */}
                    <div className="glass-card">
                      <h3 style={{ marginBottom: '16px' }}>Monthly Spend (INR)</h3>
                      <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '20px 10px 0', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1 }}>
                          <div style={{ height: '30px', width: '24px', background: 'linear-gradient(to top, var(--accent-indigo), var(--accent-blue))', borderRadius: '4px 4px 0 0' }}></div>
                          <span style={{ fontSize: '0.75rem', marginTop: '8px', color: 'var(--text-secondary)' }}>Mar</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1 }}>
                          <div style={{ height: '60px', width: '24px', background: 'linear-gradient(to top, var(--accent-indigo), var(--accent-blue))', borderRadius: '4px 4px 0 0' }}></div>
                          <span style={{ fontSize: '0.75rem', marginTop: '8px', color: 'var(--text-secondary)' }}>Apr</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1 }}>
                          <div style={{ height: '90px', width: '24px', background: 'linear-gradient(to top, var(--accent-indigo), var(--accent-blue))', borderRadius: '4px 4px 0 0' }}></div>
                          <span style={{ fontSize: '0.75rem', marginTop: '8px', color: 'var(--text-secondary)' }}>May</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1 }}>
                          <div style={{ height: stats.totalSpend > 0 ? '140px' : '20px', width: '24px', background: 'linear-gradient(to top, var(--accent-emerald), var(--accent-blue))', borderRadius: '4px 4px 0 0' }}></div>
                          <span style={{ fontSize: '0.75rem', marginTop: '8px', color: 'var(--text-secondary)' }}>Jun</span>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '16px', textAlign: 'center' }}>
                        * June displays data reflecting recent payment transactions.
                      </p>
                    </div>

                    {/* Vendor Performance Ranking */}
                    <div className="glass-card">
                      <h3 style={{ marginBottom: '16px' }}>Vendor Quality Metrics</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {vendors.map((v, i) => (
                          <div key={v._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>#{i+1}</span>
                              <span>{v.name}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '100px', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${(v.rating / 5) * 100}%`, height: '100%', background: 'var(--accent-amber)' }}></div>
                              </div>
                              <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{v.rating} / 5.0</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- 8. ACTIVITY LOGS SCREEN --- */}
              {activeTab === 'logs' && (
                <div>
                  <h2>Enterprise Audit Logs & Activity Tracker</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    Chronological audit trails tracking every system transaction, authorization, and quotation event.
                  </p>

                  <div className="glass-card">
                    <div className="timeline">
                      {logs.map((log, index) => (
                        <div key={log._id || index} className="timeline-item">
                          <div className={`timeline-marker ${
                            log.action.includes('Approved') || log.action.includes('Payment') ? 'success' : 
                            log.action.includes('Failed') ? 'danger' : 'info'
                          }`}></div>
                          <div className="timeline-content">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong>{log.action}</strong>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>By: {log.userName}</span>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>{log.details}</p>
                            <div className="timeline-time">{new Date(log.timestamp).toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </main>
          </div>
        </div>
      )}

      {/* --- MODAL DIALOGS --- */}

      {/* 1. RFQ MODAL */}
      {showRfqModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header-flex">
              <h3>Create RFQ Invitation</h3>
              <button className="btn btn-secondary btn-icon-only" onClick={() => setShowRfqModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateRFQ}>
              <div className="form-group">
                <label className="form-label">RFQ Title</label>
                <input type="text" required className="form-input" placeholder="e.g. Server Hardware Upgrades" value={rfqTitle} onChange={(e) => setRfqTitle(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Procurement Description & Notes</label>
                <textarea className="form-textarea" rows="3" placeholder="Provide detailed requirements for vendors..." value={rfqDesc} onChange={(e) => setRfqDesc(e.target.value)}></textarea>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Required Products / Services</label>
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={handleAddProductRow}>
                    + Add Product
                  </button>
                </div>
                
                {rfqProducts.map((p, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <input type="text" required className="form-input" placeholder="Product Name / Spec" style={{ flexGrow: 1 }} value={p.name} onChange={(e) => handleProductChange(idx, 'name', e.target.value)} />
                    <input type="number" required min="1" className="form-input" placeholder="Qty" style={{ width: '80px' }} value={p.quantity} onChange={(e) => handleProductChange(idx, 'quantity', Number(e.target.value))} />
                    {rfqProducts.length > 1 && (
                      <button type="button" className="btn btn-danger btn-icon-only" onClick={() => handleRemoveProductRow(idx)}>
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">Bidding Deadline</label>
                <input type="date" required className="form-input" value={rfqDeadline} onChange={(e) => setRfqDeadline(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Assign Qualified Vendors (Minimum 1)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '120px', overflowY: 'auto', background: 'rgba(0,0,0,0.1)', padding: '10px', borderRadius: '8px' }}>
                  {vendors.filter(v => v.status === 'approved').map(v => (
                    <label key={v._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={rfqAssignedVendors.includes(v._id)} onChange={() => handleVendorSelect(v._id)} />
                      {v.name} ({v.category})
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Dispatch RFQ Bidding Invite
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. SUBMIT QUOTATION MODAL */}
      {showQuoteModal && selectedRfq && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header-flex">
              <h3>Submit Quotation</h3>
              <button className="btn btn-secondary btn-icon-only" onClick={() => setShowQuoteModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitQuotation}>
              <h4 style={{ marginBottom: '16px', color: 'var(--accent-blue)' }}>RFQ: {selectedRfq.title}</h4>
              
              <div className="form-group">
                <label className="form-label">Pricing Submissions per item (INR)</label>
                {quoteProducts.map((p, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.9rem', flexGrow: 1 }}>{p.productName} (Qty {p.quantity})</span>
                    <input type="number" required min="1" placeholder="Unit Price" className="form-input" style={{ width: '150px' }} value={p.price || ''} onChange={(e) => {
                      const updated = [...quoteProducts];
                      updated[idx].price = Number(e.target.value);
                      setQuoteProducts(updated);
                    }} />
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">Delivery Timeline (Days to deliver after PO)</label>
                <input type="number" required min="1" className="form-input" placeholder="e.g. 10" value={quoteTimeline} onChange={(e) => setQuoteTimeline(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Vendor Notes & Guarantees</label>
                <textarea className="form-textarea" rows="3" placeholder="Enter warranty terms, shipping conditions..." value={quoteNotes} onChange={(e) => setQuoteNotes(e.target.value)}></textarea>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>Estimated Total Amount:</span>
                  <span style={{ color: 'var(--accent-emerald)', fontSize: '1.2rem' }}>
                    {formatCurrency(quoteProducts.reduce((sum, p) => sum + ((p.price || 0) * p.quantity), 0))}
                  </span>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Submit Bidding Quotation
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. MANAGER APPROVAL MODAL */}
      {showApprovalModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="card-header-flex">
              <h3>Authorize Quotation</h3>
              <button className="btn btn-secondary btn-icon-only" onClick={() => setShowApprovalModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Are you sure you want to authorize this vendor quotation? By approving, this quote will be locked as the selected supplier, and other bids will be automatically rejected.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Approval Remarks & Directions</label>
              <textarea className="form-textarea" rows="3" placeholder="e.g. Lowest pricing bids accepted with standard support agreement." value={approvalRemarks} onChange={(e) => setApprovalRemarks(e.target.value)}></textarea>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flexGrow: 1, justifyContent: 'center' }} onClick={() => setShowApprovalModal(false)}>
                Cancel
              </button>
              <button className="btn btn-success" style={{ flexGrow: 1, justifyContent: 'center' }} onClick={handleApproveQuotation}>
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ADMIN REGISTER VENDOR RECORD MODAL */}
      {showRegisterVendorModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header-flex">
              <h3>🏢 Add New Vendor</h3>
              <button className="btn btn-secondary btn-icon-only" onClick={() => setShowRegisterVendorModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Info notice */}
            <div style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '18px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              ℹ️ New vendors are added with <strong>Pending</strong> status. After saving, go to the Vendors table and click the ✅ approve button to authorize them for RFQ bidding.
            </div>

            <form onSubmit={handleRegisterVendor}>
              <div className="form-group">
                <label className="form-label">Company Name <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Zenith Technologies Ltd"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Business Category <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
                <select
                  required
                  className="form-select"
                  value={newVendorCat}
                  onChange={(e) => setNewVendorCat(e.target.value)}
                >
                  <option value="">-- Select a Category --</option>
                  <option value="IT & Software Development">IT & Software Development</option>
                  <option value="Hardware & Electronics">Hardware & Electronics</option>
                  <option value="Logistics & Shipping">Logistics & Shipping</option>
                  <option value="Office Stationary & Printing">Office Stationary & Printing</option>
                  <option value="Civil & Construction">Civil & Construction</option>
                  <option value="Facility Management">Facility Management</option>
                  <option value="Marketing & Design">Marketing & Design</option>
                  <option value="Consulting & Professional Services">Consulting & Professional Services</option>
                  <option value="Manufacturing & Industrial">Manufacturing & Industrial</option>
                  <option value="General Supplies">General Supplies</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">GST Registration Number <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  maxLength={15}
                  value={newVendorGst}
                  onChange={(e) => setNewVendorGst(e.target.value.toUpperCase())}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Contact Email <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="sales@vendor.com"
                    value={newVendorEmail}
                    onChange={(e) => setNewVendorEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="+91 99999 88888"
                    value={newVendorPhone}
                    onChange={(e) => setNewVendorPhone(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" style={{ flexGrow: 1, justifyContent: 'center' }} onClick={() => setShowRegisterVendorModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 2, justifyContent: 'center' }}>
                  <Plus size={16} /> Save Vendor Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
