export type Role = 'OWNER' | 'MANAGER' | 'ACCOUNTANT' | 'WAREHOUSE_STAFF' | 'WORKER';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  _count?: { products: number };
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  categoryId: string;
  category?: Category;
  hsn: string;
  unit: string;
  minimumStock: number;
  description?: string;
  image?: string;
  barcode?: string;
  status: 'ACTIVE' | 'INACTIVE';
  totalStock?: number;
  isLowStock?: boolean;
}

export interface Inventory {
  id: string;
  productId: string;
  product: Product;
  warehouse: string;
  batchNumber: string;
  expiryDate?: string;
  currentStock: number;
  incoming: number;
  outgoing: number;
}

export interface Customer {
  id: string;
  partyName: string;
  gst?: string;
  phone: string;
  email?: string;
  address: string;
  outstandingBalance: number;
}

export interface Supplier {
  id: string;
  supplierName: string;
  gst?: string;
  phone: string;
  email?: string;
  address: string;
}

export interface PurchaseItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  rate: number;
  gstPercent: number;
  amount: number;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplier: Supplier;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  gstAmount: number;
  transportCharge: number;
  grandTotal: number;
  notes?: string;
  status: 'RECEIVED' | 'PENDING' | 'CANCELLED';
  items: PurchaseItem[];
}

export interface DispatchItem {
  id: string;
  productId: string;
  product: Product;
  batchNumber?: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Dispatch {
  id: string;
  billNumber: string;
  date: string;
  partyName: string;
  transportName: string;
  driverName: string;
  vehicleNumber: string;
  mobileNumber: string;
  destination: string;
  goodsDescription?: string;
  totalQuantity: number;
  totalAmount: number;
  remarks?: string;
  status: 'PENDING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  items: DispatchItem[];
}

export interface Employee {
  id: string;
  name: string;
  photo?: string;
  phone: string;
  salary: number;
  joiningDate: string;
  designation: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Expense {
  id: string;
  category: 'FUEL' | 'LOADING' | 'UNLOADING' | 'TEA' | 'OFFICE' | 'ELECTRICITY' | 'MISC';
  title: string;
  amount: number;
  date: string;
  paymentMode: string;
  receiptImage?: string;
  remarks?: string;
}

export interface TransportCompany {
  id: string;
  companyName: string;
  phone: string;
  email?: string;
  address: string;
  drivers?: Array<{ id: string; driverName: string; phone: string; licenseNumber: string }>;
  vehicles?: Array<{ id: string; vehicleNumber: string; vehicleType: string; capacity: string }>;
}
