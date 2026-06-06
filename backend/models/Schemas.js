import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['officer', 'vendor', 'manager', 'admin'], default: 'officer' },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null }
}, { timestamps: true });

// Vendor Schema
const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  gstNumber: { type: String, required: true },
  contactEmail: { type: String, required: true },
  contactPhone: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'blacklisted'], default: 'pending' },
  rating: { type: Number, default: 5 }
}, { timestamps: true });

// RFQ Schema
const rfqSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  products: [{
    name: { type: String, required: true },
    quantity: { type: Number, required: true }
  }],
  deadline: { type: Date, required: true },
  assignedVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
  status: { type: String, enum: ['active', 'closed', 'approved', 'completed'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null } // officer who created
}, { timestamps: true });

// Quotation Schema
const quotationSchema = new mongoose.Schema({
  rfqId: { type: mongoose.Schema.Types.ObjectId, ref: 'RFQ', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  pricingDetails: [{
    productName: { type: String, required: true },
    price: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  deliveryTimeline: { type: Number, required: true }, // in days
  notes: { type: String },
  status: { type: String, enum: ['submitted', 'selected', 'rejected'], default: 'submitted' }
}, { timestamps: true });

// Purchase Order Schema
const poSchema = new mongoose.Schema({
  poNumber: { type: String, required: true, unique: true },
  rfqId: { type: mongoose.Schema.Types.ObjectId, ref: 'RFQ', required: true },
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  officerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['draft', 'sent', 'accepted'], default: 'draft' }
}, { timestamps: true });

// Invoice Schema
const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  poId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  subtotal: { type: Number, required: true },
  taxAmount: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'sent', 'paid'], default: 'draft' }
}, { timestamps: true });

// Activity Log Schema
const activityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userName: { type: String, default: 'System' },
  action: { type: String, required: true },
  details: { type: String },
  timestamp: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
export const Vendor = mongoose.model('Vendor', vendorSchema);
export const RFQ = mongoose.model('RFQ', rfqSchema);
export const Quotation = mongoose.model('Quotation', quotationSchema);
export const PurchaseOrder = mongoose.model('PurchaseOrder', poSchema);
export const Invoice = mongoose.model('Invoice', invoiceSchema);
export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
