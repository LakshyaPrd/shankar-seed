import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { UsersController } from '../controllers/users.controller';
import { CategoriesController, ProductsController } from '../controllers/products.controller';
import { InventoryController, StockController } from '../controllers/inventory.controller';
import { CustomersController, SuppliersController } from '../controllers/customers.controller';
import { PurchaseController, DispatchController } from '../controllers/purchase.controller';
import { TransportController, EmployeesController } from '../controllers/transport.controller';
import { AttendanceController, ExpensesController } from '../controllers/expenses.controller';
import { DashboardController, ReportsController, SettingsController } from '../controllers/dashboard.controller';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware';
import { SystemRole } from '@prisma/client';
import multer from 'multer';
import path from 'path';

const router = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
});

// Auth Routes
router.post('/auth/login', AuthController.login);
router.post('/auth/refresh', AuthController.refreshToken);
router.post('/auth/forgot-password', AuthController.forgotPassword);
router.post('/auth/reset-password', AuthController.resetPassword);
router.get('/auth/me', authenticate, AuthController.me);
router.put('/auth/me', authenticate, AuthController.updateProfile);

// Users Routes
router.get('/users', authenticate, authorizeRoles(SystemRole.OWNER, SystemRole.MANAGER), UsersController.findAll);
router.get('/users/:id', authenticate, authorizeRoles(SystemRole.OWNER, SystemRole.MANAGER), UsersController.findOne);
router.post('/users', authenticate, authorizeRoles(SystemRole.OWNER), UsersController.create);
router.put('/users/:id', authenticate, authorizeRoles(SystemRole.OWNER), UsersController.update);
router.delete('/users/:id', authenticate, authorizeRoles(SystemRole.OWNER), UsersController.remove);

// Categories & Products Routes
router.get('/categories', authenticate, CategoriesController.findAll);
router.get('/categories/:id', authenticate, CategoriesController.findOne);
router.post('/categories', authenticate, CategoriesController.create);
router.put('/categories/:id', authenticate, CategoriesController.update);
router.delete('/categories/:id', authenticate, CategoriesController.remove);

router.get('/products', authenticate, ProductsController.findAll);
router.get('/products/:id', authenticate, ProductsController.findOne);
router.post('/products', authenticate, ProductsController.create);
router.put('/products/:id', authenticate, ProductsController.update);
router.delete('/products/:id', authenticate, ProductsController.remove);

// Inventory & Stock Routes
router.get('/inventory', authenticate, InventoryController.findAll);
router.get('/inventory/low-stock-alerts', authenticate, InventoryController.getLowStockAlerts);
router.post('/inventory/adjust', authenticate, InventoryController.adjustStock);
router.post('/inventory/reset', authenticate, InventoryController.resetStock);
router.put('/inventory/:id/reset', authenticate, InventoryController.resetStock);
router.post('/inventory/reset-all', authenticate, InventoryController.resetAllStock);
router.get('/stock/movements', authenticate, StockController.getMovements);

// Customers & Suppliers Routes
router.get('/customers', authenticate, CustomersController.findAll);
router.get('/customers/:id', authenticate, CustomersController.findOne);
router.get('/customers/:id/ledger', authenticate, CustomersController.getLedger);
router.post('/customers', authenticate, CustomersController.create);
router.put('/customers/:id', authenticate, CustomersController.update);
router.delete('/customers/:id', authenticate, CustomersController.remove);

router.get('/suppliers', authenticate, SuppliersController.findAll);
router.get('/suppliers/:id', authenticate, SuppliersController.findOne);
router.post('/suppliers', authenticate, SuppliersController.create);
router.put('/suppliers/:id', authenticate, SuppliersController.update);
router.delete('/suppliers/:id', authenticate, SuppliersController.remove);

// Purchase & Dispatch Routes
router.get('/purchases', authenticate, PurchaseController.findAll);
router.get('/purchases/:id', authenticate, PurchaseController.findOne);
router.post('/purchases', authenticate, PurchaseController.create);
router.delete('/purchases/:id', authenticate, PurchaseController.remove);

router.get('/dispatches', authenticate, DispatchController.findAll);
router.get('/dispatches/:id', authenticate, DispatchController.findOne);
router.post('/dispatches', authenticate, DispatchController.create);
router.delete('/dispatches/:id', authenticate, DispatchController.remove);

// Transport & Employees Routes
router.get('/transport/companies', authenticate, TransportController.findAllCompanies);
router.post('/transport/companies', authenticate, TransportController.createCompany);
router.get('/transport/drivers', authenticate, TransportController.getDrivers);
router.post('/transport/drivers', authenticate, TransportController.createDriver);
router.get('/transport/vehicles', authenticate, TransportController.getVehicles);
router.post('/transport/vehicles', authenticate, TransportController.createVehicle);

router.get('/employees', authenticate, EmployeesController.findAll);
router.get('/employees/:id', authenticate, EmployeesController.findOne);
router.post('/employees', authenticate, EmployeesController.create);
router.put('/employees/:id', authenticate, EmployeesController.update);
router.delete('/employees/:id', authenticate, EmployeesController.remove);

// Attendance & Expenses Routes
router.get('/attendance/daily', authenticate, AttendanceController.getDaily);
router.post('/attendance/mark', authenticate, AttendanceController.mark);
router.get('/attendance/monthly-summary', authenticate, AttendanceController.getMonthlySummary);

router.get('/expenses', authenticate, ExpensesController.findAll);
router.get('/expenses/category-breakdown', authenticate, ExpensesController.getCategoryBreakdown);
router.post('/expenses', authenticate, ExpensesController.create);
router.put('/expenses/:id', authenticate, ExpensesController.update);
router.delete('/expenses/:id', authenticate, ExpensesController.remove);

// Dashboard, Reports & Settings Routes
router.get('/dashboard/summary', authenticate, DashboardController.getSummary);

router.get('/reports/sales', authenticate, ReportsController.getSales);
router.get('/reports/purchases', authenticate, ReportsController.getPurchases);
router.get('/reports/expenses', authenticate, ReportsController.getExpenses);
router.get('/reports/inventory', authenticate, ReportsController.getInventory);
router.get('/reports/dispatch', authenticate, ReportsController.getSales);

router.get('/settings', authenticate, SettingsController.getSettings);
router.put('/settings', authenticate, authorizeRoles(SystemRole.OWNER), SettingsController.updateSettings);
router.post('/settings/backup', authenticate, authorizeRoles(SystemRole.OWNER), SettingsController.backup);

// File Upload Route
router.post('/uploads', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'File required' });
  return res.json({
    success: true,
    data: { url: `/uploads/${req.file.filename}`, filename: req.file.filename },
  });
});

export default router;
