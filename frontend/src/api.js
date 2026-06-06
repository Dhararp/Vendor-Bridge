// API Service with seamless LocalStorage fallback for Hackathon stability

const BACKEND_URL = 'http://localhost:5000/api';
let useFallback = false;

// Seed Initial LocalStorage Mock Data if empty
const seedMockData = () => {
  if (!localStorage.getItem('vb_users')) {
    localStorage.setItem('vb_users', JSON.stringify([
      { _id: 'u1', name: 'Alok Mishra', email: 'officer@vendorbridge.com', password: 'password', role: 'officer' },
      { _id: 'u2', name: 'TechnoCorp Sales', email: 'vendor@technocorp.com', password: 'password', role: 'vendor', vendorId: 'v1' },
      { _id: 'u3', name: 'Asha Sharma', email: 'manager@vendorbridge.com', password: 'password', role: 'manager' },
      { _id: 'u4', name: 'System Admin', email: 'admin@vendorbridge.com', password: 'password', role: 'admin' },
      { _id: 'u5', name: 'Global Logistics Corp Contact', email: 'info@globallogistics.com', password: 'password', role: 'vendor', vendorId: 'v2' },
      { _id: 'u6', name: 'SuperOffice Supplies Ltd Contact', email: 'orders@superoffice.com', password: 'password', role: 'vendor', vendorId: 'v3' },
      { _id: 'u7', name: 'Alpha Construction Systems Contact', email: 'contact@alphaconstruct.com', password: 'password', role: 'vendor', vendorId: 'v4' }
    ]));
  }
  if (!localStorage.getItem('vb_vendors')) {
    localStorage.setItem('vb_vendors', JSON.stringify([
      { _id: 'v1', name: 'TechnoCorp Solutions', category: 'IT & Software Development', gstNumber: '29ABCDE1234F1Z5', contactEmail: 'sales@technocorp.com', contactPhone: '+91 98765 43210', status: 'approved', rating: 4.8 },
      { _id: 'v2', name: 'Global Logistics Corp', category: 'Logistics & Shipping', gstNumber: '27GHIJK5678L2Z9', contactEmail: 'info@globallogistics.com', contactPhone: '+91 91234 56789', status: 'approved', rating: 4.2 },
      { _id: 'v3', name: 'SuperOffice Supplies Ltd', category: 'Office Stationary & Printing', gstNumber: '19MNOPQ9012M3Z7', contactEmail: 'orders@superoffice.com', contactPhone: '+91 88888 77777', status: 'pending', rating: 3.9 },
      { _id: 'v4', name: 'Alpha Construction Systems', category: 'Civil & Construction', gstNumber: '09RSTUV3456P4Z1', contactEmail: 'contact@alphaconstruct.com', contactPhone: '+91 77777 66666', status: 'approved', rating: 4.5 }
    ]));
  }
  if (!localStorage.getItem('vb_rfqs')) {
    localStorage.setItem('vb_rfqs', JSON.stringify([
      {
        _id: 'r1',
        title: 'High-End Developer Laptops Procurement',
        description: 'Procuring 15 high-performance developer laptops (Core i9, 32GB RAM, 1TB SSD) for the engineering team.',
        products: [
          { name: 'Developer Laptops (Core i9, 32GB, 1TB SSD)', quantity: 15 }
        ],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        assignedVendors: ['v1', 'v2'],
        status: 'active',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        _id: 'r2',
        title: 'Custom Office Stationary & Branding Kits',
        description: 'Supply of customized office supplies including letterheads, pens, notebook diaries, and visitor badges.',
        products: [
          { name: 'Branded Notebook Diaries', quantity: 200 },
          { name: 'Executive Engraved Pens', quantity: 200 }
        ],
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        assignedVendors: ['v3'],
        status: 'active',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]));
  }
  if (!localStorage.getItem('vb_quotations')) {
    localStorage.setItem('vb_quotations', JSON.stringify([
      {
        _id: 'q1',
        rfqId: 'r1',
        vendorId: 'v1',
        pricingDetails: [
          { productName: 'Developer Laptops (Core i9, 32GB, 1TB SSD)', price: 120000 }
        ],
        totalAmount: 1800000,
        deliveryTimeline: 10,
        notes: 'Includes 3 years extended warranty and on-site support. Can deliver within 10 days of PO receipt.',
        status: 'submitted',
        createdAt: new Date().toISOString()
      }
    ]));
  }
  if (!localStorage.getItem('vb_pos')) {
    localStorage.setItem('vb_pos', JSON.stringify([]));
  }
  if (!localStorage.getItem('vb_invoices')) {
    localStorage.setItem('vb_invoices', JSON.stringify([]));
  }
  if (!localStorage.getItem('vb_logs')) {
    localStorage.setItem('vb_logs', JSON.stringify([
      { _id: 'l1', userName: 'System', action: 'System Setup', details: 'VendorBridge ERP Platform has initialized successfully in Demo Mode.', timestamp: new Date().toISOString() }
    ]));
  }
};

// Auto seed on import
seedMockData();

// Helper to log activities in LocalStorage
const addLocalLog = (userName, action, details) => {
  const logs = JSON.parse(localStorage.getItem('vb_logs') || '[]');
  logs.unshift({
    _id: `l_${Date.now()}`,
    userName: userName || 'System',
    action,
    details,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem('vb_logs', JSON.stringify(logs));
};

// Check if backend is running
export const checkBackendHealth = async () => {
  try {
    const res = await fetch(BACKEND_URL.replace('/api', '/'), { method: 'GET', signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      useFallback = false;
      console.log('📡 Connected to backend server successfully!');
      return true;
    }
  } catch (err) {
    useFallback = true;
    console.warn('⚠️ Backend server unreachable. Falling back to client-side LocalStorage DB.');
    return false;
  }
  useFallback = true;
  return false;
};

// Initialize connection test
checkBackendHealth();

// --- API METHODS ---

// Helper to retrieve auth headers
const getHeaders = (extraHeaders = {}) => {
  const token = localStorage.getItem('vb_token');
  const headers = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Helper for fetching with unified error handling
const safeFetch = async (url, options = {}, errorMsg = 'API request failed') => {
  try {
    const res = await fetch(url, options);
    if (res.ok) return await res.json();
    
    // Server responded with error status
    let serverMsg = errorMsg;
    try {
      const errData = await res.json();
      serverMsg = errData.message || errorMsg;
    } catch (_) {}
    throw new Error(serverMsg);
  } catch (err) {
    if (err.isNetworkError) {
      throw err;
    }
    if (err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      throw { isNetworkError: true, originalError: err };
    }
    throw err;
  }
};

export const api = {
  // Check active mode
  isDemoMode: () => useFallback,

  // Auth
  login: async (email, password) => {
    if (!useFallback) {
      try {
        const res = await fetch(`${BACKEND_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            localStorage.setItem('vb_token', data.token);
          }
          return data;
        }
        const errData = await res.json();
        throw new Error(errData.message || 'Login failed');
      } catch (err) {
        if (err.name === 'TypeError' || err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
          useFallback = true;
        } else {
          throw err;
        }
      }
    }

    // LocalStorage Fallback
    const users = JSON.parse(localStorage.getItem('vb_users') || '[]');
    const user = users.find(u => u.email === email);
    if (!user) throw new Error('User not found.');
    
    try {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) throw new Error('Invalid credentials.');
    } catch {
      if (user.password !== password) throw new Error('Invalid credentials.');
    }

    const vendors = JSON.parse(localStorage.getItem('vb_vendors') || '[]');
    const vendor = user.vendorId ? vendors.find(v => v._id === user.vendorId) : null;
    
    addLocalLog(user.name, 'Login', 'Logged into the platform (Demo Mode)');
    localStorage.setItem('vb_token', 'demo_token');
    return {
      token: 'demo_token',
      user: { id: user._id, name: user.name, email: user.email, role: user.role, vendorId: vendor }
    };
  },

  signup: async (userData) => {
    if (!useFallback) {
      try {
        const res = await fetch(`${BACKEND_URL}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });
        if (res.ok) return await res.json();
        const errData = await res.json();
        throw new Error(errData.message || 'Signup failed');
      } catch (err) {
        if (err.name === 'TypeError' || err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
          useFallback = true;
        } else {
          throw err;
        }
      }
    }

    // LocalStorage Fallback
    const users = JSON.parse(localStorage.getItem('vb_users') || '[]');
    if (users.some(u => u.email === userData.email)) throw new Error('User already exists.');

    let vendorId = null;
    if (userData.role === 'vendor' && userData.vendorName) {
      const vendors = JSON.parse(localStorage.getItem('vb_vendors') || '[]');
      const newV = {
        _id: `v_${Date.now()}`,
        name: userData.vendorName,
        category: userData.vendorCategory || 'General',
        gstNumber: userData.vendorGst || 'N/A',
        contactEmail: userData.email,
        contactPhone: 'N/A',
        status: 'pending',
        rating: 5.0
      };
      vendors.push(newV);
      localStorage.setItem('vb_vendors', JSON.stringify(vendors));
      vendorId = newV._id;
    }

    const newUser = {
      _id: `u_${Date.now()}`,
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role,
      vendorId
    };
    users.push(newUser);
    localStorage.setItem('vb_users', JSON.stringify(users));
    addLocalLog(userData.name, 'Sign Up', `Registered as ${userData.role} (Demo Mode)`);
    return { message: 'Signup successful!' };
  },

  logout: () => {
    localStorage.removeItem('vb_token');
  },

  // Vendors
  getVendors: async () => {
    if (!useFallback) {
      try {
        return await safeFetch(`${BACKEND_URL}/vendors`, { headers: getHeaders() }, 'Failed to fetch vendors');
      } catch (err) {
        if (err.isNetworkError) useFallback = true;
        else throw err;
      }
    }
    return JSON.parse(localStorage.getItem('vb_vendors') || '[]');
  },

  registerVendor: async (vendorData) => {
    if (!useFallback) {
      try {
        return await safeFetch(`${BACKEND_URL}/vendors`, {
          method: 'POST',
          headers: getHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(vendorData)
        }, 'Failed to register vendor');
      } catch (err) {
        if (err.isNetworkError) useFallback = true;
        else throw err;
      }
    }

    const vendors = JSON.parse(localStorage.getItem('vb_vendors') || '[]');
    const newV = {
      _id: `v_${Date.now()}`,
      ...vendorData,
      status: 'pending',
      rating: 5.0
    };
    vendors.push(newV);
    localStorage.setItem('vb_vendors', JSON.stringify(vendors));

    // Automatically create a user for this vendor
    const users = JSON.parse(localStorage.getItem('vb_users') || '[]');
    users.push({
      _id: `u_${Date.now()}`,
      name: `${vendorData.name} Contact`,
      email: vendorData.contactEmail.toLowerCase().trim(),
      password: 'password', // mock plain-text password for fallback
      role: 'vendor',
      vendorId: newV._id
    });
    localStorage.setItem('vb_users', JSON.stringify(users));

    addLocalLog('System', 'Vendor Registered', `New Vendor: ${vendorData.name}`);
    return newV;
  },

  updateVendorStatus: async (id, status) => {
    if (!useFallback) {
      try {
        return await safeFetch(`${BACKEND_URL}/vendors/${id}/status`, {
          method: 'PATCH',
          headers: getHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ status })
        }, 'Failed to update vendor status');
      } catch (err) {
        if (err.isNetworkError) useFallback = true;
        else throw err;
      }
    }

    const vendors = JSON.parse(localStorage.getItem('vb_vendors') || '[]');
    const v = vendors.find(vend => vend._id === id);
    if (v) {
      v.status = status;
      localStorage.setItem('vb_vendors', JSON.stringify(vendors));
      addLocalLog('System', 'Vendor Status Update', `${v.name} status updated to ${status}`);
      return v;
    }
  },

  // RFQs
  getRFQs: async (currentUser = null) => {
    if (!useFallback) {
      try {
        return await safeFetch(`${BACKEND_URL}/rfqs`, { headers: getHeaders() }, 'Failed to fetch RFQs');
      } catch (err) {
        if (err.isNetworkError) useFallback = true;
        else throw err;
      }
    }
    
    // LocalStorage populated RFQs
    const rfqs = JSON.parse(localStorage.getItem('vb_rfqs') || '[]');
    const vendors = JSON.parse(localStorage.getItem('vb_vendors') || '[]');
    
    let filtered = rfqs;
    if (currentUser) {
      if (currentUser.role === 'vendor') {
        filtered = rfqs.filter(r => (r.assignedVendors || []).includes(currentUser.vendorId));
      } else if (currentUser.role === 'officer') {
        filtered = rfqs.filter(r => !r.createdBy || r.createdBy === currentUser.id || r.createdBy === currentUser._id);
      }
    }

    return filtered.map(r => ({
      ...r,
      assignedVendors: (r.assignedVendors || []).map(vid => vendors.find(v => v._id === vid)).filter(Boolean)
    }));
  },

  createRFQ: async (rfqData, userName) => {
    if (!useFallback) {
      try {
        return await safeFetch(`${BACKEND_URL}/rfqs`, {
          method: 'POST',
          headers: getHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(rfqData)
        }, 'Failed to create RFQ');
      } catch (err) {
        if (err.isNetworkError) useFallback = true;
        else throw err;
      }
    }

    const rfqs = JSON.parse(localStorage.getItem('vb_rfqs') || '[]');
    const newR = {
      _id: `r_${Date.now()}`,
      ...rfqData,
      status: 'active',
      createdBy: currentUser ? (currentUser.id || currentUser._id) : null,
      createdAt: new Date().toISOString()
    };
    rfqs.push(newR);
    localStorage.setItem('vb_rfqs', JSON.stringify(rfqs));
    addLocalLog(userName || 'Officer', 'RFQ Created', `Created RFQ: ${rfqData.title}`);
    return newR;
  },

  // Quotations
  getQuotations: async (rfqId = null, currentUser = null) => {
    if (!useFallback) {
      try {
        const url = rfqId ? `${BACKEND_URL}/quotations?rfqId=${rfqId}` : `${BACKEND_URL}/quotations`;
        return await safeFetch(url, { headers: getHeaders() }, 'Failed to fetch quotations');
      } catch (err) {
        if (err.isNetworkError) useFallback = true;
        else throw err;
      }
    }

    const quotations = JSON.parse(localStorage.getItem('vb_quotations') || '[]');
    const vendors = JSON.parse(localStorage.getItem('vb_vendors') || '[]');
    const rfqs = JSON.parse(localStorage.getItem('vb_rfqs') || '[]');
    
    let filtered = quotations;
    if (rfqId) filtered = quotations.filter(q => q.rfqId === rfqId);
    
    if (currentUser && currentUser.role === 'vendor') {
      filtered = filtered.filter(q => q.vendorId === currentUser.vendorId);
    }

    return filtered.map(q => ({
      ...q,
      vendorId: vendors.find(v => v._id === q.vendorId),
      rfqId: rfqs.find(r => r._id === q.rfqId)
    }));
  },

  submitQuotation: async (quoteData, vendorName) => {
    if (!useFallback) {
      try {
        return await safeFetch(`${BACKEND_URL}/quotations`, {
          method: 'POST',
          headers: getHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(quoteData)
        }, 'Failed to submit quotation');
      } catch (err) {
        if (err.isNetworkError) useFallback = true;
        else throw err;
      }
    }

    const quotations = JSON.parse(localStorage.getItem('vb_quotations') || '[]');
    const newQ = {
      _id: `q_${Date.now()}`,
      ...quoteData,
      status: 'submitted',
      createdAt: new Date().toISOString()
    };
    quotations.push(newQ);
    localStorage.setItem('vb_quotations', JSON.stringify(quotations));
    addLocalLog(vendorName || 'Vendor', 'Quotation Submitted', `Submitted quotation of ₹${quoteData.totalAmount}`);
    return newQ;
  },

  approveQuotation: async (id, remarks, managerName) => {
    if (!useFallback) {
      try {
        return await safeFetch(`${BACKEND_URL}/quotations/${id}/approve`, {
          method: 'POST',
          headers: getHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ remarks })
        }, 'Failed to approve quotation');
      } catch (err) {
        if (err.isNetworkError) useFallback = true;
        else throw err;
      }
    }

    const quotations = JSON.parse(localStorage.getItem('vb_quotations') || '[]');
    const rfqs = JSON.parse(localStorage.getItem('vb_rfqs') || '[]');
    
    const qIndex = quotations.findIndex(qt => qt._id === id);
    if (qIndex === -1) throw new Error('Quotation not found');

    quotations[qIndex].status = 'selected';
    const rfqId = quotations[qIndex].rfqId;

    // Reject all other quotations for same RFQ
    quotations.forEach(qt => {
      if (qt.rfqId === rfqId && qt._id !== id) {
        qt.status = 'rejected';
      }
    });

    // Update RFQ status
    const rfqIndex = rfqs.findIndex(r => r._id === rfqId);
    if (rfqIndex !== -1) {
      rfqs[rfqIndex].status = 'approved';
    }

    localStorage.setItem('vb_quotations', JSON.stringify(quotations));
    localStorage.setItem('vb_rfqs', JSON.stringify(rfqs));
    addLocalLog(managerName || 'Manager', 'Quotation Approved', `Approved Quotation: ${id}. Remarks: ${remarks || 'None'}`);
    return { message: 'Approved successfully' };
  },

  // Purchase Orders
  getPOs: async (currentUser = null) => {
    if (!useFallback) {
      try {
        return await safeFetch(`${BACKEND_URL}/purchase-orders`, { headers: getHeaders() }, 'Failed to fetch POs');
      } catch (err) {
        if (err.isNetworkError) useFallback = true;
        else throw err;
      }
    }

    const pos = JSON.parse(localStorage.getItem('vb_pos') || '[]');
    const rfqs = JSON.parse(localStorage.getItem('vb_rfqs') || '[]');
    const quotations = JSON.parse(localStorage.getItem('vb_quotations') || '[]');
    const vendors = JSON.parse(localStorage.getItem('vb_vendors') || '[]');
    const users = JSON.parse(localStorage.getItem('vb_users') || '[]');

    let filtered = pos;
    if (currentUser) {
      if (currentUser.role === 'vendor') {
        filtered = pos.filter(po => po.vendorId === currentUser.vendorId);
      } else if (currentUser.role === 'officer') {
        filtered = pos.filter(po => !po.officerId || po.officerId === currentUser.id || po.officerId === currentUser._id);
      }
    }

    return filtered.map(po => ({
      ...po,
      rfqId: rfqs.find(r => r._id === po.rfqId),
      quotationId: quotations.find(q => q._id === po.quotationId),
      vendorId: vendors.find(v => v._id === po.vendorId),
      officerId: users.find(u => u._id === po.officerId)
    }));
  },

  createPO: async (poData, officerName) => {
    if (!useFallback) {
      try {
        return await safeFetch(`${BACKEND_URL}/purchase-orders`, {
          method: 'POST',
          headers: getHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(poData)
        }, 'Failed to create purchase order');
      } catch (err) {
        if (err.isNetworkError) useFallback = true;
        else throw err;
      }
    }

    const pos = JSON.parse(localStorage.getItem('vb_pos') || '[]');
    const rfqs = JSON.parse(localStorage.getItem('vb_rfqs') || '[]');
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;

    const newPO = {
      _id: `po_${Date.now()}`,
      poNumber,
      ...poData,
      status: 'sent',
      createdAt: new Date().toISOString()
    };
    pos.push(newPO);

    // Complete RFQ
    const rfqIndex = rfqs.findIndex(r => r._id === poData.rfqId);
    if (rfqIndex !== -1) {
      rfqs[rfqIndex].status = 'completed';
    }

    localStorage.setItem('vb_pos', JSON.stringify(pos));
    localStorage.setItem('vb_rfqs', JSON.stringify(rfqs));
    addLocalLog(officerName || 'Officer', 'Purchase Order Generated', `Generated Purchase Order: ${poNumber}`);
    return newPO;
  },

  // Invoices
  getInvoices: async (currentUser = null) => {
    if (!useFallback) {
      try {
        return await safeFetch(`${BACKEND_URL}/invoices`, { headers: getHeaders() }, 'Failed to fetch invoices');
      } catch (err) {
        if (err.isNetworkError) useFallback = true;
        else throw err;
      }
    }

    const invoices = JSON.parse(localStorage.getItem('vb_invoices') || '[]');
    const pos = JSON.parse(localStorage.getItem('vb_pos') || '[]');
    const vendors = JSON.parse(localStorage.getItem('vb_vendors') || '[]');
    
    let filtered = invoices;
    if (currentUser) {
      if (currentUser.role === 'vendor') {
        filtered = invoices.filter(inv => inv.vendorId === currentUser.vendorId);
      } else if (currentUser.role === 'officer') {
        const officerPoIds = pos.filter(po => !po.officerId || po.officerId === currentUser.id || po.officerId === currentUser._id).map(po => po._id);
        filtered = invoices.filter(inv => officerPoIds.includes(inv.poId));
      }
    }

    return filtered.map(inv => ({
      ...inv,
      poId: pos.find(p => p._id === inv.poId),
      vendorId: vendors.find(v => v._id === inv.vendorId)
    }));
  },

  createInvoice: async (invData, vendorName) => {
    if (!useFallback) {
      try {
        return await safeFetch(`${BACKEND_URL}/invoices`, {
          method: 'POST',
          headers: getHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(invData)
        }, 'Failed to create invoice');
      } catch (err) {
        if (err.isNetworkError) useFallback = true;
        else throw err;
      }
    }

    const invoices = JSON.parse(localStorage.getItem('vb_invoices') || '[]');
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    const newInv = {
      _id: `inv_${Date.now()}`,
      invoiceNumber,
      ...invData,
      status: 'sent',
      createdAt: new Date().toISOString()
    };
    invoices.push(newInv);
    localStorage.setItem('vb_invoices', JSON.stringify(invoices));
    addLocalLog(vendorName || 'Vendor', 'Invoice Submitted', `Created Invoice: ${invoiceNumber}`);
    return newInv;
  },

  updateInvoiceStatus: async (id, status) => {
    if (!useFallback) {
      try {
        return await safeFetch(`${BACKEND_URL}/invoices/${id}/status`, {
          method: 'PATCH',
          headers: getHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ status })
        }, 'Failed to update invoice status');
      } catch (err) {
        if (err.isNetworkError) useFallback = true;
        else throw err;
      }
    }

    const invoices = JSON.parse(localStorage.getItem('vb_invoices') || '[]');
    const inv = invoices.find(i => i._id === id);
    if (inv) {
      inv.status = status;
      localStorage.setItem('vb_invoices', JSON.stringify(invoices));
      addLocalLog('System', 'Invoice Status Update', `${inv.invoiceNumber} status updated to ${status}`);
      return inv;
    }
  },

  // Logs
  getLogs: async () => {
    if (!useFallback) {
      try {
        return await safeFetch(`${BACKEND_URL}/logs`, { headers: getHeaders() }, 'Failed to fetch activity logs');
      } catch (err) {
        if (err.isNetworkError) useFallback = true;
        else throw err;
      }
    }
    return JSON.parse(localStorage.getItem('vb_logs') || '[]');
  },

  // Stats / Dashboard
  getStats: async () => {
    if (!useFallback) {
      try {
        return await safeFetch(`${BACKEND_URL}/analytics/dashboard`, { headers: getHeaders() }, 'Failed to fetch dashboard statistics');
      } catch (err) {
        if (err.isNetworkError) useFallback = true;
        else throw err;
      }
    }

    // Local calculate
    const vendors = JSON.parse(localStorage.getItem('vb_vendors') || '[]');
    const rfqs = JSON.parse(localStorage.getItem('vb_rfqs') || '[]');
    const pos = JSON.parse(localStorage.getItem('vb_pos') || '[]');
    const invoices = JSON.parse(localStorage.getItem('vb_invoices') || '[]');
    
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const totalSpend = paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    return {
      vendorCount: vendors.length,
      rfqCount: rfqs.length,
      poCount: pos.length,
      invoiceCount: invoices.length,
      totalSpend
    };
  }
};
