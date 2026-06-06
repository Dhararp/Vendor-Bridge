import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User, Vendor, RFQ, Quotation, PurchaseOrder, Invoice, ActivityLog } from '../models/Schemas.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'vendorbridge_super_secret_jwt_key';

// Check if mongoose is connected
const isDbConnected = () => mongoose.connection.readyState === 1;

// --- IN-MEMORY DATABASE FALLBACK FOR HACKATHON STABILITY ---
let mockUsers = [
  { _id: 'u1', name: 'Alok Mishra', email: 'officer@vendorbridge.com', password: 'password', role: 'officer' },
  { _id: 'u2', name: 'TechnoCorp Sales', email: 'vendor@technocorp.com', password: 'password', role: 'vendor', vendorId: 'v1' },
  { _id: 'u3', name: 'Asha Sharma', email: 'manager@vendorbridge.com', password: 'password', role: 'manager' },
  { _id: 'u4', name: 'System Admin', email: 'admin@vendorbridge.com', password: 'password', role: 'admin' }
];

let mockVendors = [
  { _id: 'v1', name: 'TechnoCorp Solutions', category: 'IT & Software Development', gstNumber: '29ABCDE1234F1Z5', contactEmail: 'sales@technocorp.com', contactPhone: '+91 98765 43210', status: 'approved', rating: 4.8 },
  { _id: 'v2', name: 'Global Logistics Corp', category: 'Logistics & Shipping', gstNumber: '27GHIJK5678L2Z9', contactEmail: 'info@globallogistics.com', contactPhone: '+91 91234 56789', status: 'approved', rating: 4.2 },
  { _id: 'v3', name: 'SuperOffice Supplies Ltd', category: 'Office Stationary & Printing', gstNumber: '19MNOPQ9012M3Z7', contactEmail: 'orders@superoffice.com', contactPhone: '+91 88888 77777', status: 'pending', rating: 3.9 },
  { _id: 'v4', name: 'Alpha Construction Systems', category: 'Civil & Construction', gstNumber: '09RSTUV3456P4Z1', contactEmail: 'contact@alphaconstruct.com', contactPhone: '+91 77777 66666', status: 'approved', rating: 4.5 }
];

// Seed database to ensure default users and vendors are available in MongoDB for demo switching
const seedDatabaseIfEmpty = async () => {
  try {
    // 1. Seed vendors individually if missing
    let seededVendors = [];
    for (let v of mockVendors) {
      let existing = await Vendor.findOne({ name: v.name });
      if (!existing) {
        console.log(`Seeding vendor: ${v.name}`);
        existing = await new Vendor({
          name: v.name,
          category: v.category,
          gstNumber: v.gstNumber,
          contactEmail: v.contactEmail,
          contactPhone: v.contactPhone,
          status: v.status,
          rating: v.rating
        }).save();
      }
      seededVendors.push(existing);

      // Ensure a User account exists for EVERY vendor seeded
      const userEmail = v.contactEmail.toLowerCase().trim();
      let vendorUser = await User.findOne({ email: userEmail });
      const defaultPassword = await bcrypt.hash('password', 10);
      if (!vendorUser) {
        console.log(`Seeding vendor user: ${userEmail}`);
        await new User({
          name: `${v.name} Contact`,
          email: userEmail,
          password: defaultPassword,
          role: 'vendor',
          vendorId: existing._id
        }).save();
      } else {
        vendorUser.password = defaultPassword;
        vendorUser.vendorId = existing._id;
        vendorUser.role = 'vendor';
        await vendorUser.save();
      }
    }

    // 2. Seed default users only — only update password, never overwrite user-created data
    for (let u of mockUsers) {
      let correctHash = u.password;
      if (!correctHash.startsWith('$2a$') && !correctHash.startsWith('$2b$')) {
        correctHash = await bcrypt.hash(u.password, 10);
      }

      const existing = await User.findOne({ email: u.email.toLowerCase() });
      let vendorId = null;
      if (u.role === 'vendor' && u.email === 'vendor@technocorp.com') {
        const techCorp = seededVendors.find(v => v.name.includes('TechnoCorp'));
        vendorId = techCorp ? techCorp._id : null;
      }

      if (!existing) {
        console.log(`Seeding default user: ${u.email}`);
        await new User({
          name: u.name,
          email: u.email.toLowerCase(),
          password: correctHash,
          role: u.role,
          vendorId
        }).save();
      } else {
        // Only fix the password — never overwrite the user's own data
        existing.password = correctHash;
        if (vendorId) existing.vendorId = vendorId; // only set vendorId if we found one
        await existing.save();
      }
    }
    console.log('✅ Default user seeding complete.');
  } catch (err) {
    console.error('Failed to seed database:', err.message);
  }
};

// Run seed whenever connection is established, or immediately if already connected
if (mongoose.connection.readyState === 1) {
  seedDatabaseIfEmpty();
} else {
  mongoose.connection.once('open', seedDatabaseIfEmpty);
}


let mockRFQs = [
  {
    _id: 'r1',
    title: 'High-End Developer Laptops Procurement',
    description: 'Procuring 15 high-performance developer laptops (Core i9, 32GB RAM, 1TB SSD) for the engineering team.',
    products: [
      { name: 'Developer Laptops (Core i9, 32GB, 1TB SSD)', quantity: 15 }
    ],
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    assignedVendors: ['v1', 'v2'],
    status: 'active',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    _id: 'r2',
    title: 'Custom Office Stationary & Branding Kits',
    description: 'Supply of customized office supplies including letterheads, pens, notebook diaries, and visitor badges.',
    products: [
      { name: 'Branded Notebook Diaries', quantity: 200 },
      { name: 'Executive Engraved Pens', quantity: 200 }
    ],
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    assignedVendors: ['v3'],
    status: 'active',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  }
];

let mockQuotations = [
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
    createdAt: new Date()
  }
];

let mockPOs = [];
let mockInvoices = [];
let mockLogs = [
  { _id: 'l1', userName: 'System', action: 'System Setup', details: 'VendorBridge ERP Platform has initialized successfully.', timestamp: new Date() }
];

// Seed encrypted passwords for mock users to avoid plaintext comparisons
const initializeMockPasswords = async () => {
  for (let u of mockUsers) {
    if (!u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
      u.password = await bcrypt.hash(u.password, 10);
    }
  }
};
initializeMockPasswords();

// Middleware: Authenticate Request via JWT
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required. Missing token.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user payload
    req.user = decoded; // { id, role, vendorId, name }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired authentication token.' });
  }
};

// Middleware: Authorize specific Roles
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = (req.user?.role || '').toLowerCase().trim();
    const allowedLower = allowedRoles.map(r => r.toLowerCase().trim());
    if (!req.user || !allowedLower.includes(userRole)) {
      return res.status(403).json({ message: `Forbidden. You do not have permission to perform this action. (Your role: ${req.user?.role}, Allowed: ${allowedLower.join(', ')})` });
    }
    next();
  };
};

// Helper to log activities
const logActivity = async (userId, userName, action, details) => {
  const logData = { userId, userName: userName || 'System', action, details, timestamp: new Date() };
  if (isDbConnected()) {
    try {
      await new ActivityLog(logData).save();
    } catch (err) {
      console.error('Failed to save activity log in DB:', err);
    }
  } else {
    mockLogs.unshift({ _id: `l_${Date.now()}`, ...logData });
  }
};

router.get('/debug-db', async (req, res) => {
  try {
    const users = await User.find().populate('vendorId');
    const vendors = await Vendor.find();
    const rfqs = await RFQ.find().populate('assignedVendors');
    const quotations = await Quotation.find().populate('vendorId').populate('rfqId');
    const pos = await PurchaseOrder.find();
    const invoices = await Invoice.find();
    res.json({
      isDbConnected: isDbConnected(),
      users,
      vendors,
      rfqs,
      quotations,
      pos,
      invoices
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AUTHENTICATION ROUTES ---

router.post('/auth/signup', async (req, res) => {
  const { name, email, password, role, vendorName, vendorCategory, vendorGst } = req.body;
  const normalizedEmail = (email || '').toLowerCase().trim();
  
  // Basic Input Validation
  if (!name || !normalizedEmail || !password || !role) {
    return res.status(400).json({ message: 'Required fields are missing.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    if (isDbConnected()) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) return res.status(400).json({ message: 'An account with this email already exists. Please login.' });

      let vendorId = null;
      if (role === 'vendor' && vendorName) {
        const newVendor = new Vendor({
          name: vendorName,
          category: vendorCategory || 'General',
          gstNumber: vendorGst || 'N/A',
          contactEmail: normalizedEmail,
          contactPhone: 'N/A',
          status: 'pending'
        });
        const savedVendor = await newVendor.save();
        vendorId = savedVendor._id;
      }

      const newUser = new User({ name, email: normalizedEmail, password: hashedPassword, role, vendorId });
      await newUser.save();

      await logActivity(newUser._id, name, 'Sign Up', `Registered as a ${role}`);
      res.status(201).json({ message: 'Account created successfully. Please sign in.' });
    } else {
      // In-Memory Signup
      const normalizedEmailFallback = (email || '').toLowerCase().trim();
      const existing = mockUsers.find(u => u.email === normalizedEmailFallback);
      if (existing) return res.status(400).json({ message: 'An account with this email already exists. Please login.' });

      let vendorId = null;
      if (role === 'vendor' && vendorName) {
        const newV = {
          _id: `v_${Date.now()}`,
          name: vendorName,
          category: vendorCategory || 'General',
          gstNumber: vendorGst || 'N/A',
          contactEmail: normalizedEmailFallback,
          contactPhone: 'N/A',
          status: 'pending',
          rating: 5.0
        };
        mockVendors.push(newV);
        vendorId = newV._id;
      }

      const newUser = {
        _id: `u_${Date.now()}`,
        name,
        email: normalizedEmailFallback,
        password: hashedPassword,
        role,
        vendorId
      };
      mockUsers.push(newUser);
      await logActivity(newUser._id, name, 'Sign Up', `Registered as a ${role} (In-Memory)`);
      res.status(201).json({ message: 'Account created successfully. Please sign in.' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = (email || '').toLowerCase().trim();

  if (!normalizedEmail || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    if (isDbConnected()) {
      const user = await User.findOne({ email: normalizedEmail }).populate('vendorId');
      if (!user) return res.status(404).json({ message: 'No account found with this email. Please check and try again, or Sign Up.' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

      const tokenPayload = { id: user._id, role: user.role, vendorId: user.vendorId?._id || null, name: user.name };
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });
      await logActivity(user._id, user.name, 'Login', 'Logged into the platform');
      res.json({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, vendorId: user.vendorId }
      });
    } else {
      // In-Memory Login
      const user = mockUsers.find(u => u.email === normalizedEmail);
      if (!user) return res.status(404).json({ message: 'No account found with this email. Please check and try again, or Sign Up.' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

      const vendor = user.vendorId ? mockVendors.find(v => v._id === user.vendorId) : null;
      
      const tokenPayload = { id: user._id, role: user.role, vendorId: vendor?._id || user.vendorId || null, name: user.name };
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

      await logActivity(user._id, user.name, 'Login', 'Logged in (In-Memory Mode)');
      res.json({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, vendorId: vendor }
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// --- VENDOR ROUTES ---

// Officer, Manager, and Admin can access the vendor directory
router.get('/vendors', authenticate, requireRole(['officer', 'manager', 'admin']), async (req, res) => {
  try {
    if (isDbConnected()) {
      const list = await Vendor.find();
      res.json(list);
    } else {
      res.json(mockVendors);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin only: Register new vendor record
router.post('/vendors', authenticate, requireRole(['admin']), async (req, res) => {
  const { name, category, gstNumber, contactEmail, contactPhone } = req.body;
  if (!name || !category || !gstNumber || !contactEmail) {
    return res.status(400).json({ message: 'Missing required vendor fields.' });
  }

  try {
    if (isDbConnected()) {
      const newV = new Vendor({ name, category, gstNumber, contactEmail, contactPhone: contactPhone || 'N/A' });
      const saved = await newV.save();

      // Automatically create a user account for this new vendor so they can log in
      const defaultPassword = await bcrypt.hash('password', 10);
      await new User({
        name: `${name} Contact`,
        email: contactEmail.toLowerCase().trim(),
        password: defaultPassword,
        role: 'vendor',
        vendorId: saved._id
      }).save();

      await logActivity(req.user.id, req.user.name, 'Vendor Registered', `New Vendor: ${name}`);
      res.status(201).json(saved);
    } else {
      const newV = {
        _id: `v_${Date.now()}`,
        name, category, gstNumber, contactEmail, contactPhone: contactPhone || 'N/A',
        status: 'pending',
        rating: 5.0
      };
      mockVendors.push(newV);

      // Create a mock user for this vendor
      const defaultPassword = await bcrypt.hash('password', 10);
      mockUsers.push({
        _id: `u_${Date.now()}`,
        name: `${name} Contact`,
        email: contactEmail.toLowerCase().trim(),
        password: defaultPassword,
        role: 'vendor',
        vendorId: newV._id
      });

      await logActivity(req.user.id, req.user.name, 'Vendor Registered', `New Vendor (In-Memory): ${name}`);
      res.status(201).json(newV);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin only: Update vendor status
router.patch('/vendors/:id/status', authenticate, requireRole(['admin']), async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'approved', 'blacklisted'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }

  try {
    if (isDbConnected()) {
      const updated = await Vendor.findByIdAndUpdate(req.params.id, { status }, { new: true });
      if (!updated) return res.status(404).json({ message: 'Vendor not found.' });
      await logActivity(req.user.id, req.user.name, 'Vendor Status Update', `${updated.name} updated to ${status}`);
      res.json(updated);
    } else {
      const v = mockVendors.find(vend => vend._id === req.params.id);
      if (!v) return res.status(404).json({ message: 'Vendor not found' });
      v.status = status;
      await logActivity(req.user.id, req.user.name, 'Vendor Status Update', `${v.name} updated to ${status} (In-Memory)`);
      res.json(v);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- RFQ ROUTES ---

// Authenticated users get RFQs, filtered by role and user
router.get('/rfqs', authenticate, async (req, res) => {
  try {
    if (isDbConnected()) {
      let query = {};
      if (req.user.role === 'vendor') {
        // Vendors only see RFQs they are assigned to
        query = { assignedVendors: req.user.vendorId };
      } else if (req.user.role === 'officer') {
        // Officers only see RFQs they created
        query = { createdBy: req.user.id };
      }
      // Managers and Admins see all RFQs (no filter)
      const list = await RFQ.find(query).populate('assignedVendors').populate('createdBy', 'name email');
      res.json(list);
    } else {
      const filtered = mockRFQs.filter(r => {
        if (req.user.role === 'vendor') {
          return r.assignedVendors.includes(req.user.vendorId);
        }
        if (req.user.role === 'officer') {
          // Show RFQs created by this officer, or with no createdBy (seed data)
          return !r.createdBy || r.createdBy === req.user.id;
        }
        return true; // managers, admins see all
      });

      const populated = filtered.map(r => ({
        ...r,
        assignedVendors: r.assignedVendors.map(vid => mockVendors.find(v => v._id === vid)).filter(Boolean)
      }));
      res.json(populated);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Officer only: Create/Publish RFQs
router.post('/rfqs', authenticate, requireRole(['officer']), async (req, res) => {
  const { title, description, products, deadline, assignedVendors } = req.body;
  if (!title || !products || !Array.isArray(products) || products.length === 0 || !deadline) {
    return res.status(400).json({ message: 'Missing required RFQ fields.' });
  }

  // Validate quantities
  for (let p of products) {
    if (!p.name || typeof p.quantity !== 'number' || p.quantity <= 0) {
      return res.status(400).json({ message: 'Product name is required and quantity must be greater than zero.' });
    }
  }

  try {
    if (isDbConnected()) {
      const newRFQ = new RFQ({ title, description, products, deadline, assignedVendors, createdBy: req.user.id });
      const saved = await newRFQ.save();
      await logActivity(req.user.id, req.user.name, 'RFQ Created', `Created RFQ: ${title}`);
      res.status(201).json(saved);
    } else {
      const newR = {
        _id: `r_${Date.now()}`,
        title, description, products,
        deadline: new Date(deadline),
        assignedVendors: assignedVendors || [],
        status: 'active',
        createdBy: req.user.id, // store who created it
        createdAt: new Date()
      };
      mockRFQs.push(newR);
      await logActivity(req.user.id, req.user.name, 'RFQ Created', `Created RFQ (In-Memory): ${title}`);
      res.status(201).json(newR);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- QUOTATION ROUTES ---

// Authenticated users get quotations. Vendors only see their own bids.
// Officers/Managers can filter by RFQ.
router.get('/quotations', authenticate, async (req, res) => {
  const { rfqId } = req.query;
  try {
    if (isDbConnected()) {
      let query = {};
      if (req.user.role === 'vendor') {
        query.vendorId = req.user.vendorId;
      }
      if (rfqId) {
        query.rfqId = rfqId;
      }
      const list = await Quotation.find(query).populate('vendorId').populate('rfqId');
      res.json(list);
    } else {
      let filtered = mockQuotations;
      if (req.user.role === 'vendor') {
        filtered = mockQuotations.filter(q => q.vendorId === req.user.vendorId);
      }
      if (rfqId) {
        filtered = filtered.filter(q => q.rfqId === rfqId);
      }
      const populated = filtered.map(q => ({
        ...q,
        vendorId: mockVendors.find(v => v._id === q.vendorId),
        rfqId: mockRFQs.find(r => r._id === q.rfqId)
      }));
      res.json(populated);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Vendors only: Submit Quotation
router.post('/quotations', authenticate, requireRole(['vendor']), async (req, res) => {
  const { rfqId, pricingDetails, deliveryTimeline, notes } = req.body;
  const vendorId = req.user.vendorId;

  if (!vendorId) {
    return res.status(403).json({ message: 'Only approved vendors are allowed to submit bidding quotes (No vendor profile associated with your user).' });
  }

  if (!rfqId || !pricingDetails || !Array.isArray(pricingDetails) || pricingDetails.length === 0 || !deliveryTimeline) {
    return res.status(400).json({ message: 'Missing required quotation details.' });
  }

  try {
    // 1. Verify Vendor exists and is Approved
    let vendorObj;
    if (isDbConnected()) {
      vendorObj = await Vendor.findById(vendorId);
    } else {
      vendorObj = mockVendors.find(v => v._id === vendorId);
    }

    if (!vendorObj || vendorObj.status !== 'approved') {
      return res.status(403).json({ message: 'Only approved vendors are allowed to submit bidding quotes.' });
    }

    // 2. Verify RFQ exists, is active, is assigned to this vendor, and deadline is not passed
    let rfqObj;
    if (isDbConnected()) {
      rfqObj = await RFQ.findById(rfqId);
    } else {
      rfqObj = mockRFQs.find(r => r._id === rfqId);
    }

    if (!rfqObj) return res.status(404).json({ message: 'RFQ not found.' });
    if (rfqObj.status !== 'active') return res.status(400).json({ message: 'This RFQ is no longer open for bidding.' });
    
    // Check assigned
    const assignedIds = rfqObj.assignedVendors.map(v => v ? (v._id || v).toString() : '').filter(Boolean);
    if (!assignedIds.includes(vendorId.toString())) {
      return res.status(403).json({ message: 'You are not assigned/authorized to bid on this RFQ.' });
    }

    // Check deadline
    if (new Date(rfqObj.deadline) < new Date()) {
      return res.status(400).json({ message: 'The deadline for bidding on this RFQ has expired.' });
    }

    // 3. Compute and Validate totalAmount and pricing entries
    let computedTotal = 0;
    for (let item of pricingDetails) {
      if (!item.productName || typeof item.price !== 'number' || item.price <= 0) {
        return res.status(400).json({ message: 'Pricing must be a positive number.' });
      }
      
      // Resolve quantity from RFQ spec
      const rfqItem = rfqObj.products.find(p => p.name === item.productName);
      const quantity = rfqItem ? rfqItem.quantity : 1;
      computedTotal += item.price * quantity;
    }

    if (computedTotal <= 0) {
      return res.status(400).json({ message: 'Computed total must be greater than zero.' });
    }

    if (isDbConnected()) {
      const newQ = new Quotation({
        rfqId,
        vendorId,
        pricingDetails,
        totalAmount: computedTotal,
        deliveryTimeline: Number(deliveryTimeline),
        notes
      });
      const saved = await newQ.save();
      await logActivity(req.user.id, vendorObj.name, 'Quotation Submitted', `Submitted quote of ₹${computedTotal} for RFQ`);
      res.status(201).json(saved);
    } else {
      const newQ = {
        _id: `q_${Date.now()}`,
        rfqId,
        vendorId,
        pricingDetails,
        totalAmount: computedTotal,
        deliveryTimeline: Number(deliveryTimeline),
        notes,
        status: 'submitted',
        createdAt: new Date()
      };
      mockQuotations.push(newQ);
      await logActivity(req.user.id, vendorObj.name, 'Quotation Submitted', `Submitted quote of ₹${computedTotal} (In-Memory)`);
      res.status(201).json(newQ);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manager only: Approve quotation & reject all other bids
router.post('/quotations/:id/approve', authenticate, requireRole(['manager']), async (req, res) => {
  const { remarks } = req.body;
  try {
    if (isDbConnected()) {
      const q = await Quotation.findById(req.params.id);
      if (!q) return res.status(404).json({ message: 'Quotation not found' });
      
      // Update quote status
      q.status = 'selected';
      await q.save();

      // Reject all other quotations for the same RFQ
      await Quotation.updateMany(
        { rfqId: q.rfqId, _id: { $ne: q._id } },
        { status: 'rejected' }
      );

      // Update RFQ status
      await RFQ.findByIdAndUpdate(q.rfqId, { status: 'approved' });

      await logActivity(req.user.id, req.user.name, 'Quotation Approved', `Approved Quotation ID: ${q._id}. Remarks: ${remarks || 'None'}`);
      res.json({ message: 'Quotation approved successfully and RFQ closed for other bidding.' });
    } else {
      const qIndex = mockQuotations.findIndex(qt => qt._id === req.params.id);
      if (qIndex === -1) return res.status(404).json({ message: 'Quotation not found' });
      
      mockQuotations[qIndex].status = 'selected';
      const rfqId = mockQuotations[qIndex].rfqId;
      
      // Reject others
      mockQuotations.forEach(qt => {
        if (qt.rfqId === rfqId && qt._id !== req.params.id) {
          qt.status = 'rejected';
        }
      });

      // Update RFQ
      const rfq = mockRFQs.find(r => r._id === rfqId);
      if (rfq) rfq.status = 'approved';

      await logActivity(req.user.id, req.user.name, 'Quotation Approved', `Approved Quotation ID: ${req.params.id} (In-Memory). Remarks: ${remarks || 'None'}`);
      res.json({ message: 'Quotation approved successfully.' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- PURCHASE ORDER ROUTES ---

// Authenticated users get POs. Vendors see their own. Officers see only their own POs.
router.get('/purchase-orders', authenticate, async (req, res) => {
  try {
    if (isDbConnected()) {
      let query = {};
      if (req.user.role === 'vendor') {
        query.vendorId = req.user.vendorId;
      } else if (req.user.role === 'officer') {
        // Officers only see POs they generated
        query.officerId = req.user.id;
      }
      // Managers and Admins see all POs
      const list = await PurchaseOrder.find(query)
        .populate('rfqId')
        .populate('quotationId')
        .populate('vendorId')
        .populate('officerId');
      res.json(list);
    } else {
      const filtered = mockPOs.filter(po => {
        if (req.user.role === 'vendor') {
          return po.vendorId === req.user.vendorId;
        }
        if (req.user.role === 'officer') {
          return po.officerId === req.user.id;
        }
        return true; // managers, admins
      });
      const populated = filtered.map(po => ({
        ...po,
        rfqId: mockRFQs.find(r => r._id === po.rfqId),
        quotationId: mockQuotations.find(q => q._id === po.quotationId),
        vendorId: mockVendors.find(v => v._id === po.vendorId),
        officerId: mockUsers.find(u => u._id === po.officerId)
      }));
      res.json(populated);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Officer only: Generate Purchase Order
router.post('/purchase-orders', authenticate, requireRole(['officer']), async (req, res) => {
  const { rfqId, quotationId, vendorId } = req.body;
  const officerId = req.user.id;
  const poNumber = `PO-${Date.now().toString().slice(-6)}`;

  if (!rfqId || !quotationId || !vendorId) {
    return res.status(400).json({ message: 'Missing required PO generation fields.' });
  }

  try {
    // Verify RFQ status is approved
    let rfqObj;
    if (isDbConnected()) {
      rfqObj = await RFQ.findById(rfqId);
    } else {
      rfqObj = mockRFQs.find(r => r._id === rfqId);
    }

    if (!rfqObj) return res.status(404).json({ message: 'RFQ not found.' });
    if (rfqObj.status !== 'approved') {
      return res.status(400).json({ message: 'Cannot generate PO for an RFQ that is not approved.' });
    }

    if (isDbConnected()) {
      const newPO = new PurchaseOrder({ poNumber, rfqId, quotationId, vendorId, officerId, status: 'sent' });
      const saved = await newPO.save();

      // Update RFQ to completed
      await RFQ.findByIdAndUpdate(rfqId, { status: 'completed' });

      await logActivity(officerId, req.user.name, 'Purchase Order Generated', `Generated Purchase Order: ${poNumber}`);
      res.status(201).json(saved);
    } else {
      const newPO = {
        _id: `po_${Date.now()}`,
        poNumber, rfqId, quotationId, vendorId, officerId,
        status: 'sent',
        createdAt: new Date()
      };
      mockPOs.push(newPO);

      const rfq = mockRFQs.find(r => r._id === rfqId);
      if (rfq) rfq.status = 'completed';

      await logActivity(officerId, req.user.name, 'Purchase Order Generated', `Generated PO: ${poNumber} (In-Memory)`);
      res.status(201).json(newPO);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- INVOICE ROUTES ---

// Authenticated users get Invoices. Vendors see their own. Officers see only invoices tied to their POs.
router.get('/invoices', authenticate, async (req, res) => {
  try {
    if (isDbConnected()) {
      let query = {};
      if (req.user.role === 'vendor') {
        query.vendorId = req.user.vendorId;
      } else if (req.user.role === 'officer') {
        // Find all POs this officer generated, then return invoices for those POs only
        const officerPOs = await PurchaseOrder.find({ officerId: req.user.id }, '_id');
        const poIds = officerPOs.map(p => p._id);
        query.poId = { $in: poIds };
      }
      // Managers and Admins see all
      const list = await Invoice.find(query).populate('poId').populate('vendorId');
      res.json(list);
    } else {
      // In-memory: get officer's PO ids first
      let officerPoIds = null;
      if (req.user.role === 'officer') {
        officerPoIds = mockPOs.filter(po => po.officerId === req.user.id).map(po => po._id);
      }

      const filtered = mockInvoices.filter(inv => {
        if (req.user.role === 'vendor') {
          return inv.vendorId === req.user.vendorId;
        }
        if (req.user.role === 'officer' && officerPoIds) {
          return officerPoIds.includes(inv.poId);
        }
        return true; // managers, admins
      });
      const populated = filtered.map(inv => ({
        ...inv,
        poId: mockPOs.find(p => p._id === inv.poId),
        vendorId: mockVendors.find(v => v._id === inv.vendorId)
      }));
      res.json(populated);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Vendors only: Create Invoice
router.post('/invoices', authenticate, requireRole(['vendor']), async (req, res) => {
  const { poId } = req.body;
  const vendorId = req.user.vendorId;
  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

  if (!poId) {
    return res.status(400).json({ message: 'Purchase Order ID (poId) is required.' });
  }

  try {
    // 1. Fetch the PO and verify it belongs to this vendor
    let poObj;
    if (isDbConnected()) {
      poObj = await PurchaseOrder.findById(poId).populate('quotationId');
    } else {
      poObj = mockPOs.find(p => p._id === poId);
    }

    if (!poObj) return res.status(404).json({ message: 'Purchase Order not found.' });
    
    const poVendorId = poObj.vendorId?._id || poObj.vendorId;
    if (poVendorId.toString() !== vendorId.toString()) {
      return res.status(403).json({ message: 'You are not authorized to invoice this purchase order.' });
    }

    // 2. Resolve subtotal from quotation details on the backend
    let subtotal = 0;
    if (isDbConnected()) {
      subtotal = poObj.quotationId.totalAmount;
    } else {
      const quoteObj = mockQuotations.find(q => q._id === poObj.quotationId);
      subtotal = quoteObj ? quoteObj.totalAmount : 0;
    }

    if (subtotal <= 0) {
      return res.status(400).json({ message: 'Invalid order amount.' });
    }

    // Calculate tax & total
    const taxAmount = Math.round(subtotal * 0.18); // 18% standard GST
    const totalAmount = subtotal + taxAmount;

    // Fetch vendor name for activity logging
    let vendorName = req.user.name || 'Vendor';

    if (isDbConnected()) {
      const newInv = new Invoice({ invoiceNumber, poId, vendorId, subtotal, taxAmount, totalAmount, status: 'sent' });
      const saved = await newInv.save();
      await logActivity(req.user.id, vendorName, 'Invoice Submitted', `Created Invoice ${invoiceNumber}`);
      res.status(201).json(saved);
    } else {
      const newInv = {
        _id: `inv_${Date.now()}`,
        invoiceNumber, poId, vendorId, subtotal, taxAmount, totalAmount,
        status: 'sent',
        createdAt: new Date()
      };
      mockInvoices.push(newInv);
      await logActivity(req.user.id, vendorName, 'Invoice Submitted', `Created Invoice ${invoiceNumber} (In-Memory)`);
      res.status(201).json(newInv);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Officer only: Update invoice status (e.g. mark paid)
router.patch('/invoices/:id/status', authenticate, requireRole(['officer']), async (req, res) => {
  const { status } = req.body;
  if (!['draft', 'sent', 'paid'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }

  try {
    if (isDbConnected()) {
      const updated = await Invoice.findByIdAndUpdate(req.params.id, { status }, { new: true });
      if (!updated) return res.status(404).json({ message: 'Invoice not found.' });
      await logActivity(req.user.id, req.user.name, 'Invoice Status Updated', `${updated.invoiceNumber} status: ${status}`);
      res.json(updated);
    } else {
      const inv = mockInvoices.find(i => i._id === req.params.id);
      if (!inv) return res.status(404).json({ message: 'Invoice not found' });
      inv.status = status;
      await logActivity(req.user.id, req.user.name, 'Invoice Status Updated', `${inv.invoiceNumber} status: ${status} (In-Memory)`);
      res.json(inv);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- ACTIVITY LOGS ROUTE ---

// Authenticated users only
router.get('/logs', authenticate, async (req, res) => {
  try {
    if (isDbConnected()) {
      const logs = await ActivityLog.find().sort({ timestamp: -1 }).limit(100);
      res.json(logs);
    } else {
      res.json(mockLogs);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- ANALYTICS / STATS ROUTE ---

// Authenticated users only
router.get('/analytics/dashboard', authenticate, async (req, res) => {
  try {
    if (isDbConnected()) {
      const vendorCount = await Vendor.countDocuments();
      const rfqCount = await RFQ.countDocuments();
      const poCount = await PurchaseOrder.countDocuments();
      const invoiceCount = await Invoice.countDocuments();

      const invoices = await Invoice.find({ status: 'paid' });
      const totalSpend = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0);

      res.json({ vendorCount, rfqCount, poCount, invoiceCount, totalSpend });
    } else {
      // In-Memory Stats
      const vendorCount = mockVendors.length;
      const rfqCount = mockRFQs.length;
      const poCount = mockPOs.length;
      const invoiceCount = mockInvoices.length;
      const totalSpend = mockInvoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.totalAmount, 0);

      res.json({ vendorCount, rfqCount, poCount, invoiceCount, totalSpend });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
