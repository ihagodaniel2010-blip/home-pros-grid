import { useState, useEffect } from 'react';
import { getLeads } from './leads';
import { getEstimates } from './estimates';
import { getClientPayments } from './client-payments';
import { getExpenses } from './expenses';

export type NotificationType = 'new_lead' | 'estimate_approved' | 'payment_received' | 'public_receipt_viewed' | 'expense_missing_file' | 'reimbursement_pending' | 'client_reimbursable_pending' | 'tax_needs_review';
export type NotificationSeverity = 'info' | 'warning' | 'success' | 'error';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  severity: NotificationSeverity;
  created_at: string;
  isRead: boolean;
  isDismissed: boolean;
}

const getLocalState = (): Record<string, { read?: boolean, dismissed?: boolean }> => {
  try {
    return JSON.parse(localStorage.getItem('ha_construction_notifications') || '{}');
  } catch {
    return {};
  }
};

const saveLocalState = (state: Record<string, { read?: boolean, dismissed?: boolean }>) => {
  localStorage.setItem('ha_construction_notifications', JSON.stringify(state));
};

let globalState = {
  notifications: [] as AppNotification[],
  unreadCount: 0,
  isLoading: false,
};

const listeners = new Set<(state: typeof globalState) => void>();

const setGlobalState = (partial: Partial<typeof globalState>) => {
  globalState = { ...globalState, ...partial };
  listeners.forEach(listener => listener(globalState));
};

export const useNotifications = () => {
  const [state, setState] = useState(globalState);

  useEffect(() => {
    listeners.add(setState);
    return () => { listeners.delete(setState); };
  }, []);

  const loadNotifications = async (organizationId: string) => {
    setGlobalState({ isLoading: true });
    try {
      const [leads, estimates, payments, expenses] = await Promise.all([
        getLeads(),
        getEstimates(),
        getClientPayments(organizationId),
        getExpenses(organizationId)
      ]);

      const localState = getLocalState();
      const notifs: AppNotification[] = [];

      // 1. New Lead
      leads.filter(l => l.status === 'New').forEach(l => {
        const id = `lead_${l.id}`;
        notifs.push({
          id,
          type: 'new_lead',
          title: 'New Lead Received',
          message: `Lead ${l.fullName} is awaiting contact.`,
          link: `/admin/leads/${l.id}`,
          severity: 'info',
          created_at: l.createdAt,
          isRead: localState[id]?.read || false,
          isDismissed: localState[id]?.dismissed || false
        });
      });

      // 2. Estimate Approved
      estimates.filter(e => e.status === 'Approved').forEach(e => {
        const id = `estimate_approved_${e.id}`;
        notifs.push({
          id,
          type: 'estimate_approved',
          title: 'Estimate Approved',
          message: `Estimate for ${e.client_name} was approved.`,
          link: `/admin/estimates/${e.id}`,
          severity: 'success',
          created_at: e.updated_at || e.created_at,
          isRead: localState[id]?.read || false,
          isDismissed: localState[id]?.dismissed || false
        });
      });

      // 3. Payment Received & 4. Public Receipt Viewed
      payments.forEach(p => {
        if (p.status === 'received') {
          const id = `payment_${p.id}`;
          notifs.push({
            id,
            type: 'payment_received',
            title: 'Payment Received',
            message: `Received $${p.amount} from ${p.customer_name || 'Client'}.`,
            link: '/admin/client-receipts',
            severity: 'success',
            created_at: p.payment_date,
            isRead: localState[id]?.read || false,
            isDismissed: localState[id]?.dismissed || false
          });
        }
        if (p.viewed_at) {
          const id = `payment_viewed_${p.id}`;
          notifs.push({
            id,
            type: 'public_receipt_viewed',
            title: 'Receipt Viewed',
            message: `Customer viewed receipt for $${p.amount}.`,
            link: '/admin/client-receipts',
            severity: 'info',
            created_at: p.viewed_at,
            isRead: localState[id]?.read || false,
            isDismissed: localState[id]?.dismissed || false
          });
        }
      });

      // Expenses related alerts
      expenses.forEach(e => {
        if (e.status === 'active' && (!e.receipt_files || e.receipt_files.length === 0)) {
          const id = `expense_missing_file_${e.id}`;
          notifs.push({
            id,
            type: 'expense_missing_file',
            title: 'Missing Receipt File',
            message: `Expense for ${e.vendor} ($${e.amount}) is missing a physical receipt.`,
            link: '/admin/expenses',
            severity: 'warning',
            created_at: e.receipt_date,
            isRead: localState[id]?.read || false,
            isDismissed: localState[id]?.dismissed || false
          });
        }

        if ((e.reimbursable_to_owner || e.expense_category === 'owner_reimbursable' || e.expense_category === 'partner_reimbursable') && 
            (e.reimbursement_status === 'pending' || e.reimbursement_status === 'pending_reimbursement')) {
          const id = `reimb_pending_${e.id}`;
          notifs.push({
            id,
            type: 'reimbursement_pending',
            title: 'Owner Reimbursement Pending',
            message: `$${e.amount} owed to ${e.paid_by_name || 'Owner'}.`,
            link: '/admin/reimbursements',
            severity: 'warning',
            created_at: e.receipt_date,
            isRead: localState[id]?.read || false,
            isDismissed: localState[id]?.dismissed || false
          });
        }

        if ((e.bill_to_client || e.expense_category === 'client_reimbursable') && 
            (e.client_reimbursement_status === 'pending' || e.client_reimbursement_status === 'invoiced')) {
          const id = `client_reimb_pending_${e.id}`;
          notifs.push({
            id,
            type: 'client_reimbursable_pending',
            title: 'Client Reimbursable Pending',
            message: `Pending charge to client: $${e.amount} at ${e.vendor}.`,
            link: '/admin/reimbursements',
            severity: 'info',
            created_at: e.receipt_date,
            isRead: localState[id]?.read || false,
            isDismissed: localState[id]?.dismissed || false
          });
        }

        if (e.status === 'active' && (e.expense_category === 'needs_review' || !e.tax_category)) {
          const id = `tax_needs_review_${e.id}`;
          notifs.push({
            id,
            type: 'tax_needs_review',
            title: 'Tax Needs Review',
            message: `Expense for ${e.vendor} needs tax categorization.`,
            link: '/admin/tax-center',
            severity: 'error',
            created_at: e.receipt_date,
            isRead: localState[id]?.read || false,
            isDismissed: localState[id]?.dismissed || false
          });
        }
      });

      const activeNotifs = notifs
        .filter(n => !n.isDismissed)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const unreadCount = activeNotifs.filter(n => !n.isRead).length;

      setGlobalState({ notifications: activeNotifs, unreadCount, isLoading: false });
    } catch (error) {
      console.error("Failed to load notifications", error);
      setGlobalState({ isLoading: false });
    }
  };

  const markAsRead = (id: string) => {
    const local = getLocalState();
    local[id] = { ...local[id], read: true };
    saveLocalState(local);
    
    const updated = globalState.notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    setGlobalState({
      notifications: updated,
      unreadCount: updated.filter(n => !n.isRead).length
    });
  };

  const markAllAsRead = () => {
    const local = getLocalState();
    globalState.notifications.forEach(n => {
      local[n.id] = { ...local[n.id], read: true };
    });
    saveLocalState(local);
    
    setGlobalState({
      notifications: globalState.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0
    });
  };

  const dismiss = (id: string) => {
    const local = getLocalState();
    local[id] = { ...local[id], dismissed: true, read: true };
    saveLocalState(local);
    
    const updated = globalState.notifications.filter(n => n.id !== id);
    setGlobalState({
      notifications: updated,
      unreadCount: updated.filter(n => !n.isRead).length
    });
  };

  return {
    ...state,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    dismiss
  };
};
