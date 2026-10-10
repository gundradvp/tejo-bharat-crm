import { supabase } from './supabase';
import type { CustomerInventoryAllocation } from './supabase';

export interface DispatchItemParams {
  customerId: string;
  tenantId: string;
  userId?: string;
  itemId?: string | null;
  itemName: string;
  category?: string;
  quantity: number;
  measuringUnit?: string;
  unitCost: number;
  serialNumbers?: string;
  dispatchDate?: string;
  challanNumber?: string;
  remarks?: string;
  syncToExpenses?: boolean;
}

export async function getCustomerInventoryAllocations(customerId: string): Promise<CustomerInventoryAllocation[]> {
  const { data, error } = await supabase
    .from('customer_inventory_allocations')
    .select('*, items(id, item_name, category, opening_stock, sales_price, measuring_unit)')
    .eq('customer_id', customerId)
    .order('dispatch_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTenantItems(tenantId: string) {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('item_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function dispatchInventoryToCustomer(params: DispatchItemParams): Promise<CustomerInventoryAllocation> {
  const totalCost = params.quantity * (params.unitCost || 0);
  let createdExpenseId: string | null = null;

  // 1. If user requested to sync to customer expenses, insert expense entry
  if (params.syncToExpenses && totalCost > 0) {
    try {
      const { data: expData, error: expError } = await supabase
        .from('customer_expenses')
        .insert({
          customer_id: params.customerId,
          expense_type: params.category?.toLowerCase() || 'materials',
          description: `Material Dispatch: ${params.quantity} ${params.measuringUnit || 'PCS'} of ${params.itemName} ${params.challanNumber ? `(DC: ${params.challanNumber})` : ''}`,
          amount: totalCost,
          base_amount: totalCost,
          gst_amount: 0,
          gst_percentage: 0,
          expense_date: params.dispatchDate || new Date().toISOString().split('T')[0],
          payment_status: 'paid',
          remarks: params.serialNumbers ? `Serials: ${params.serialNumbers}` : '',
        })
        .select('id')
        .single();

      if (!expError && expData) {
        createdExpenseId = expData.id;
      }
    } catch (e) {
      console.warn('Failed to auto-create expense for inventory dispatch:', e);
    }
  }

  // 2. Insert the allocation record
  const { data: allocation, error: allocError } = await supabase
    .from('customer_inventory_allocations')
    .insert({
      customer_id: params.customerId,
      tenant_id: params.tenantId,
      item_id: params.itemId || null,
      item_name: params.itemName,
      category: params.category || 'General',
      quantity: params.quantity,
      measuring_unit: params.measuringUnit || 'PCS',
      unit_cost: params.unitCost,
      total_cost: totalCost,
      serial_numbers: params.serialNumbers || '',
      dispatch_date: params.dispatchDate || new Date().toISOString().split('T')[0],
      challan_number: params.challanNumber || '',
      status: 'dispatched',
      remarks: params.remarks || '',
      expense_id: createdExpenseId,
      created_by: params.userId || null,
    })
    .select('*, items(id, item_name, category, opening_stock, sales_price, measuring_unit)')
    .single();

  if (allocError) throw allocError;

  // 3. Automatically reduce stock in master items catalog if linked to an item
  if (params.itemId) {
    try {
      const { data: currentItem } = await supabase
        .from('items')
        .select('opening_stock')
        .eq('id', params.itemId)
        .single();

      if (currentItem) {
        const newStock = Math.max(0, (Number(currentItem.opening_stock) || 0) - params.quantity);
        await supabase
          .from('items')
          .update({ opening_stock: newStock })
          .eq('id', params.itemId);
      }
    } catch (err) {
      console.error('Error reducing item stock:', err);
    }
  }

  return allocation;
}

export async function updateAllocationStatus(
  allocationId: string,
  newStatus: 'dispatched' | 'installed' | 'returned',
  allocation: CustomerInventoryAllocation
): Promise<void> {
  const previousStatus = allocation.status;

  const { error } = await supabase
    .from('customer_inventory_allocations')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', allocationId);

  if (error) throw error;

  // If status is changed to 'returned', restore stock back to warehouse
  if (newStatus === 'returned' && previousStatus !== 'returned' && allocation.item_id) {
    const { data: item } = await supabase
      .from('items')
      .select('opening_stock')
      .eq('id', allocation.item_id)
      .single();

    if (item) {
      await supabase
        .from('items')
        .update({ opening_stock: (Number(item.opening_stock) || 0) + allocation.quantity })
        .eq('id', allocation.item_id);
    }
  }
  // If moving out of 'returned' back to dispatched/installed, re-decrement stock
  else if (previousStatus === 'returned' && newStatus !== 'returned' && allocation.item_id) {
    const { data: item } = await supabase
      .from('items')
      .select('opening_stock')
      .eq('id', allocation.item_id)
      .single();

    if (item) {
      await supabase
        .from('items')
        .update({ opening_stock: Math.max(0, (Number(item.opening_stock) || 0) - allocation.quantity) })
        .eq('id', allocation.item_id);
    }
  }
}

export async function deleteCustomerAllocation(allocation: CustomerInventoryAllocation): Promise<void> {
  // 1. Delete allocation
  const { error } = await supabase
    .from('customer_inventory_allocations')
    .delete()
    .eq('id', allocation.id);

  if (error) throw error;

  // 2. Restore stock to items table if item was not in returned state
  if (allocation.item_id && allocation.status !== 'returned') {
    try {
      const { data: item } = await supabase
        .from('items')
        .select('opening_stock')
        .eq('id', allocation.item_id)
        .single();

      if (item) {
        await supabase
          .from('items')
          .update({ opening_stock: (Number(item.opening_stock) || 0) + allocation.quantity })
          .eq('id', allocation.item_id);
      }
    } catch (e) {
      console.error('Error restoring stock on deletion:', e);
    }
  }

  // 3. Remove linked expense if any
  if (allocation.expense_id) {
    try {
      await supabase.from('customer_expenses').delete().eq('id', allocation.expense_id);
    } catch (e) {
      console.warn('Failed to delete linked expense:', e);
    }
  }
}
