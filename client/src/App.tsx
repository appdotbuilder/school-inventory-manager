
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { 
  Admin, 
  InventoryItem, 
  User, 
  BorrowingRecord,
  DashboardStats,
  OverdueItem,
  ItemUsageReport,
  CreateInventoryItemInput,
  CreateUserInput,
  CreateBorrowingRecordInput,
  AdminLoginInput,
  UpdateInventoryItemInput
} from '../../server/src/schema';

// Admin Login Response type based on handler
type AdminLoginResponse = { admin: Admin; token: string } | null;

// Admin Login Component
function AdminLogin({ onLogin }: { onLogin: (admin: Admin) => void }) {
  const [formData, setFormData] = useState<AdminLoginInput>({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response: AdminLoginResponse = await trpc.adminLogin.mutate(formData);
      if (response) {
        onLogin(response.admin);
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch (error) {
      setError('Invalid credentials. Please try again.');
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">🏫 School Inventory</CardTitle>
          <CardDescription>Administrator Login</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}
            <Input
              placeholder="Username"
              value={formData.username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: AdminLoginInput) => ({ ...prev, username: e.target.value }))
              }
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: AdminLoginInput) => ({ ...prev, password: e.target.value }))
              }
              required
            />
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Dashboard Component
function Dashboard({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">📦 Total Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_items}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">📤 Currently Borrowed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.total_borrowed}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">⚠️ Overdue Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.overdue_items}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">✅ Available Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.available_items}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">👥 Active Borrowers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{stats.active_borrowers}</div>
        </CardContent>
      </Card>
    </div>
  );
}

// Inventory Management Component
function InventoryManagement() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<CreateInventoryItemInput>({
    name: '',
    description: null,
    item_type: 'digital_book',
    label_code: '',
    quantity_total: 1,
    location: null,
    purchase_date: null,
    purchase_price: null,
    condition_notes: null
  });

  const loadItems = useCallback(async () => {
    try {
      const result = await trpc.getInventoryItems.query();
      setItems(result);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingItem) {
        const updateData: UpdateInventoryItemInput = {
          id: editingItem.id,
          ...formData
        };
        await trpc.updateInventoryItem.mutate(updateData);
        setEditingItem(null);
      } else {
        await trpc.createInventoryItem.mutate(formData);
      }
      await loadItems();
      setFormData({
        name: '',
        description: null,
        item_type: 'digital_book',
        label_code: '',
        quantity_total: 1,
        location: null,
        purchase_date: null,
        purchase_price: null,
        condition_notes: null
      });
    } catch (error) {
      console.error('Failed to save item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      item_type: item.item_type,
      label_code: item.label_code,
      quantity_total: item.quantity_total,
      location: item.location,
      purchase_date: item.purchase_date,
      purchase_price: item.purchase_price,
      condition_notes: item.condition_notes
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await trpc.deleteInventoryItem.mutate({ id });
        await loadItems();
      } catch (error) {
        console.error('Failed to delete item:', error);
      }
    }
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'digital_book': return '📚';
      case 'laboratory_equipment': return '🧪';
      case 'furniture': return '🪑';
      case 'it_asset': return '💻';
      default: return '📦';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingItem ? 'Edit Item' : 'Add New Inventory Item'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Item name"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateInventoryItemInput) => ({ ...prev, name: e.target.value }))
              }
              required
            />
            <Input
              placeholder="Label code (e.g., LAB001)"
              value={formData.label_code}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateInventoryItemInput) => ({ ...prev, label_code: e.target.value }))
              }
              required
            />
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={formData.item_type}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setFormData((prev: CreateInventoryItemInput) => ({ 
                  ...prev, 
                  item_type: e.target.value as 'digital_book' | 'laboratory_equipment' | 'furniture' | 'it_asset'
                }))
              }
            >
              <option value="digital_book">📚 Digital Book</option>
              <option value="laboratory_equipment">🧪 Laboratory Equipment</option>
              <option value="furniture">🪑 Furniture</option>
              <option value="it_asset">💻 IT Asset</option>
            </select>
            <Input
              type="number"
              placeholder="Total quantity"
              value={formData.quantity_total}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateInventoryItemInput) => ({ 
                  ...prev, 
                  quantity_total: parseInt(e.target.value) || 1 
                }))
              }
              min="1"
              required
            />
            <Input
              placeholder="Location (optional)"
              value={formData.location || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateInventoryItemInput) => ({ 
                  ...prev, 
                  location: e.target.value || null 
                }))
              }
            />
            <Input
              type="number"
              placeholder="Purchase price (optional)"
              value={formData.purchase_price || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateInventoryItemInput) => ({ 
                  ...prev, 
                  purchase_price: parseFloat(e.target.value) || null 
                }))
              }
              step="0.01"
              min="0"
            />
            <div className="md:col-span-2">
              <Input
                placeholder="Description (optional)"
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateInventoryItemInput) => ({ 
                    ...prev, 
                    description: e.target.value || null 
                  }))
                }
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
              </Button>
              {editingItem && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setEditingItem(null);
                    setFormData({
                      name: '',
                      description: null,
                      item_type: 'digital_book',
                      label_code: '',
                      quantity_total: 1,
                      location: null,
                      purchase_date: null,
                      purchase_price: null,
                      condition_notes: null
                    });
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No inventory items yet. Add one above! 📦
            </CardContent>
          </Card>
        ) : (
          items.map((item: InventoryItem) => (
            <Card key={item.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getItemTypeIcon(item.item_type)}</span>
                      <h3 className="text-lg font-semibold">{item.name}</h3>
                      <Badge variant="outline" className="ml-2">
                        {item.label_code}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-gray-600 mb-2">{item.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>📦 Total: {item.quantity_total}</span>
                      <span>✅ Available: {item.quantity_available}</span>
                      {item.location && <span>📍 {item.location}</span>}
                      {item.purchase_price && <span>💰 ${item.purchase_price.toFixed(2)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// User Management Component
function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateUserInput>({
    name: '',
    email: '',
    role: 'student',
    student_id: null,
    department: null
  });

  const loadUsers = useCallback(async () => {
    try {
      const result = await trpc.getUsers.query();
      setUsers(result);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.createUser.mutate(formData);
      await loadUsers();
      setFormData({
        name: '',
        email: '',
        role: 'student',
        student_id: null,
        department: null
      });
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Full name"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateUserInput) => ({ ...prev, name: e.target.value }))
              }
              required
            />
            <Input
              type="email"
              placeholder="Email address"
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
              }
              required
            />
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={formData.role}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setFormData((prev: CreateUserInput) => ({ 
                  ...prev, 
                  role: e.target.value as 'teacher' | 'student' 
                }))
              }
            >
              <option value="student">👨‍🎓 Student</option>
              <option value="teacher">👩‍🏫 Teacher</option>
            </select>
            {formData.role === 'student' ? (
              <Input
                placeholder="Student ID"
                value={formData.student_id || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateUserInput) => ({ 
                    ...prev, 
                    student_id: e.target.value || null 
                  }))
                }
              />
            ) : (
              <Input
                placeholder="Department"
                value={formData.department || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateUserInput) => ({ 
                    ...prev, 
                    department: e.target.value || null 
                  }))
                }
              />
            )}
            <div className="md:col-span-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add User'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {users.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No users yet. Add one above! 👥
            </CardContent>
          </Card>
        ) : (
          users.map((user: User) => (
            <Card key={user.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span>{user.role === 'teacher' ? '👩‍🏫' : '👨‍🎓'}</span>
                      <h3 className="font-semibold">{user.name}</h3>
                      <Badge variant={user.role === 'teacher' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    {user.student_id && (
                      <p className="text-sm text-gray-500">Student ID: {user.student_id}</p>
                    )}
                    {user.department && (
                      <p className="text-sm text-gray-500">Department: {user.department}</p>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    Joined: {user.created_at.toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// Borrowing Management Component
function BorrowingManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [activeBorrowings, setActiveBorrowings] = useState<BorrowingRecord[]>([]);
  const [overdueItems, setOverdueItems] = useState<OverdueItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchLabel, setSearchLabel] = useState('');
  const [foundItems, setFoundItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<CreateBorrowingRecordInput>({
    item_id: 0,
    user_id: 0,
    quantity_borrowed: 1,
    borrowing_duration_days: 7,
    notes: null
  });

  const loadData = useCallback(async () => {
    try {
      const [usersResult, borrowingsResult, overdueResult] = await Promise.all([
        trpc.getUsers.query(),
        trpc.getActiveBorrowings.query(),
        trpc.getOverdueItems.query()
      ]);
      setUsers(usersResult);
      setActiveBorrowings(borrowingsResult);
      setOverdueItems(overdueResult);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLabelSearch = async () => {
    if (!searchLabel.trim()) return;
    try {
      const result = await trpc.searchItemsByLabel.query({ labelCode: searchLabel });
      setFoundItems(result);
      if (result.length > 0) {
        const firstItem = result[0];
        setSelectedItem(firstItem);
        setFormData((prev: CreateBorrowingRecordInput) => ({ ...prev, item_id: firstItem.id }));
      } else {
        setSelectedItem(null);
      }
    } catch (error) {
      console.error('Item not found:', error);
      setFoundItems([]);
      setSelectedItem(null);
    }
  };

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.createBorrowingRecord.mutate(formData);
      await loadData();
      setFormData({
        item_id: 0,
        user_id: 0,
        quantity_borrowed: 1,
        borrowing_duration_days: 7,
        notes: null
      });
      setSelectedItem(null);
      setFoundItems([]);
      setSearchLabel('');
    } catch (error) {
      console.error('Failed to create borrowing record:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturn = async (borrowingRecordId: number) => {
    try {
      await trpc.returnItem.mutate({ 
        borrowing_record_id: borrowingRecordId, 
        notes: null 
      });
      await loadData();
    } catch (error) {
      console.error('Failed to return item:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="borrow" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="borrow">📤 New Borrowing</TabsTrigger>
          <TabsTrigger value="active">📋 Active Borrowings</TabsTrigger>
          <TabsTrigger value="overdue">⚠️ Overdue Items</TabsTrigger>
        </TabsList>

        <TabsContent value="borrow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Borrowing Record</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter item label code (e.g., LAB001)"
                    value={searchLabel}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchLabel(e.target.value)}
                  />
                  <Button type="button" onClick={handleLabelSearch}>
                    🔍 Search
                  </Button>
                </div>

                {foundItems.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-green-700">Found Items:</h4>
                    {foundItems.map((item: InventoryItem) => (
                      <Alert key={item.id} className="border-green-200 bg-green-50">
                        <AlertDescription className="text-green-700">
                          {item.name} ({item.label_code}) - Available: {item.quantity_available}
                          {selectedItem?.id === item.id && <span className="ml-2 font-medium">✓ Selected</span>}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}

                <form onSubmit={handleBorrow} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={formData.user_id}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setFormData((prev: CreateBorrowingRecordInput) => ({ 
                        ...prev, 
                        user_id: parseInt(e.target.value) 
                      }))
                    }
                    required
                  >
                    <option value={0}>Select user...</option>
                    {users.map((user: User) => (
                      <option key={user.id} value={user.id}>
                        {user.role === 'teacher' ? '👩‍🏫' : '👨‍🎓'} {user.name} ({user.email})
                      </option>
                    ))}
                  </select>

                  <Input
                    type="number"
                    placeholder="Quantity to borrow"
                    value={formData.quantity_borrowed}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateBorrowingRecordInput) => ({ 
                        ...prev, 
                        quantity_borrowed: parseInt(e.target.value) || 1 
                      }))
                    }
                    min="1"
                    max={selectedItem?.quantity_available || 1}
                    required
                  />

                  <Input
                    type="number"
                    placeholder="Borrowing duration (days)"
                    value={formData.borrowing_duration_days}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateBorrowingRecordInput) => ({ 
                        ...prev, 
                        borrowing_duration_days: parseInt(e.target.value) || 7 
                      }))
                    }
                    min="1"
                    required
                  />

                  <Input
                    placeholder="Notes (optional)"
                    value={formData.notes || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateBorrowingRecordInput) => ({ 
                        ...prev, 
                        notes: e.target.value || null 
                      }))
                    }
                  />

                  <div className="md:col-span-2">
                    <Button 
                      type="submit" 
                      disabled={isLoading || !selectedItem || formData.user_id === 0}
                    >
                      {isLoading ? 'Processing...' : 'Create Borrowing Record'}
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeBorrowings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No active borrowings. 📋
              </CardContent>
            </Card>
          ) : (
            activeBorrowings.map((borrowing: BorrowingRecord) => (
              <Card key={borrowing.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={borrowing.status === 'overdue' ? 'destructive' : 'default'}>
                          {borrowing.status}
                        </Badge>
                        <span className="font-medium">Item ID: {borrowing.item_id}</span>
                        <span className="text-gray-500">Qty: {borrowing.quantity_borrowed}</span>
                      </div>
                      <p className="text-sm text-gray-600">User ID: {borrowing.user_id}</p>
                      <p className="text-sm text-gray-500">
                        Borrowed: {borrowing.borrowed_date.toLocaleDateString()} | 
                        Due: {borrowing.due_date.toLocaleDateString()}
                      </p>
                      {borrowing.notes && (
                        <p className="text-sm text-gray-400">Notes: {borrowing.notes}</p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => handleReturn(borrowing.id)}
                    >
                      Mark as Returned
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          {overdueItems.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-green-600">
                No overdue items! Great job! ✅
              </CardContent>
            </Card>
          ) : (
            overdueItems.map((overdue: OverdueItem) => (
              <Card key={overdue.borrowing_record_id} className="border-red-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="destructive">
                          {overdue.days_overdue} days overdue
                        </Badge>
                        <span className="font-medium">{overdue.item_name}</span>
                        <span className="text-gray-500">({overdue.label_code})</span>
                      </div>
                      <p className="text-sm text-gray-600">{overdue.user_name} ({overdue.user_email})</p>
                      <p className="text-sm text-gray-500">
                        Due: {overdue.due_date.toLocaleDateString()}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => handleReturn(overdue.borrowing_record_id)}
                    >
                      Mark as Returned
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Reports Component
function Reports() {
  const [usageReport, setUsageReport] = useState<ItemUsageReport[]>([]);

  const loadUsageReport = useCallback(async () => {
    try {
      const result = await trpc.getItemUsageReport.query();
      setUsageReport(result);
    } catch (error) {
      console.error('Failed to load usage report:', error);
    }
  }, []);

  useEffect(() => {
    loadUsageReport();
  }, [loadUsageReport]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>📊 Item Usage Report</CardTitle>
          <CardDescription>Usage statistics for all inventory items</CardDescription>
        </CardHeader>
        <CardContent>
          {usageReport.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No usage data available yet.</p>
          ) : (
            <div className="grid gap-4">
              {usageReport.map((item: ItemUsageReport) => (
                <div key={item.item_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{item.item_name}</h3>
                    <Badge variant="outline">{item.label_code}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Total Borrows:</span> {item.total_borrows}
                    </div>
                    <div>
                      <span className="font-medium">Currently Borrowed:</span> {item.current_borrowed}
                    </div>
                    <div>
                      <span className="font-medium">Last Borrowed:</span>{' '}
                      {item.last_borrowed_date ? item.last_borrowed_date.toLocaleDateString() : 'Never'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Main App Component
function App() {
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const loadDashboardStats = useCallback(async () => {
    try {
      const stats = await trpc.getDashboardStats.query();
      setDashboardStats(stats);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  }, []);

  useEffect(() => {
    if (currentAdmin) {
      loadDashboardStats();
    }
  }, [currentAdmin, loadDashboardStats]);

  const handleLogout = () => {
    setCurrentAdmin(null);
    setDashboardStats(null);
    setActiveTab('dashboard');
  };

  if (!currentAdmin) {
    return <AdminLogin onLogin={setCurrentAdmin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🏫 School Inventory Management</h1>
            <p className="text-sm text-gray-600">Welcome back, {currentAdmin.username}!</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {dashboardStats && <Dashboard stats={dashboardStats} />}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
            <TabsTrigger value="inventory">📦 Inventory</TabsTrigger>
            <TabsTrigger value="users">👥 Users</TabsTrigger>
            <TabsTrigger value="borrowing">📤 Borrowing</TabsTrigger>
            <TabsTrigger value="reports">📈 Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <Card>
              <CardContent className="py-8 text-center">
                <h2 className="text-xl font-semibold mb-4">📊 Dashboard Overview</h2>
                <p className="text-gray-600">
                  Use the tabs above to navigate between different sections of the inventory management system.
                  Monitor your inventory, manage users, track borrowings, and generate reports.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="mt-6">
            <InventoryManagement />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="borrowing" className="mt-6">
            <BorrowingManagement />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <Reports />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
