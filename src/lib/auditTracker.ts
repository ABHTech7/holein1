import { supabase } from "@/integrations/supabase/client";

interface AuditLogOptions {
  entityType: 'club' | 'player' | 'competition' | 'payment';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  userId?: string;
  description: string;
}

export const logAuditEvent = async ({
  entityType,
  entityId,
  action,
  oldValues,
  newValues,
  userId,
  description
}: AuditLogOptions) => {
  try {
    // Insert into audit_events table
    const { error: auditError } = await supabase
      .from('audit_events')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        action,
        old_values: oldValues || null,
        new_values: newValues || null,
        user_id: userId || null
      });

    if (auditError) {
      console.error('Error logging audit event:', auditError);
    }

    return {
      id: Date.now().toString(),
      content: description,
      created_at: new Date().toISOString(),
      created_by: `System Audit - ${new Date().toLocaleString()}`,
      immutable: true
    };
  } catch (error) {
    console.error('Error in audit tracking:', error);
    return null;
  }
};

export const trackPlayerChanges = async (
  playerId: string, 
  oldData: any, 
  newData: any, 
  userId?: string
): Promise<any> => {
  const changes: string[] = [];
  
  if (oldData.first_name !== newData.first_name) {
    changes.push(`first name from "${oldData.first_name || 'empty'}" to "${newData.first_name || 'empty'}"`);
  }
  if (oldData.last_name !== newData.last_name) {
    changes.push(`last name from "${oldData.last_name || 'empty'}" to "${newData.last_name || 'empty'}"`);
  }
  if (oldData.email !== newData.email) {
    changes.push(`email from "${oldData.email}" to "${newData.email}"`);
  }
  if (oldData.phone !== newData.phone) {
    changes.push(`phone from "${oldData.phone || 'empty'}" to "${newData.phone || 'empty'}"`);
  }

  if (changes.length > 0) {
    const description = `Player details updated: ${changes.join(', ')}`;
    return await logAuditEvent({
      entityType: 'player',
      entityId: playerId,
      action: 'update',
      oldValues: oldData,
      newValues: newData,
      userId,
      description
    });
  }

  return null;
};

export const trackClubChanges = async (
  clubId: string, 
  oldData: any, 
  newData: any, 
  userId?: string
): Promise<any> => {
  const changes: string[] = [];
  
  if (oldData.name !== newData.name) {
    changes.push(`name from "${oldData.name}" to "${newData.name}"`);
  }
  if (oldData.address !== newData.address) {
    changes.push(`address updated`);
  }
  if (oldData.email !== newData.email) {
    changes.push(`email updated`);
  }
  if (oldData.phone !== newData.phone) {
    changes.push(`phone updated`);
  }
  if (oldData.website !== newData.website) {
    changes.push(`website updated`);
  }
  if (oldData.active !== newData.active) {
    changes.push(`status changed to ${newData.active ? 'active' : 'inactive'}`);
  }
  if (oldData.logo_url !== newData.logo_url) {
    if (!oldData.logo_url && newData.logo_url) {
      changes.push(`logo uploaded`);
    } else if (oldData.logo_url && !newData.logo_url) {
      changes.push(`logo removed`);
    } else if (oldData.logo_url !== newData.logo_url) {
      changes.push(`logo updated`);
    }
  }
  // Handle special commission change tracking
  if (oldData.commission_change && newData.commission_change) {
    changes.push(`commission rate changed: ${newData.commission_change}`);
  }

  if (changes.length > 0) {
    const description = `Club details updated: ${changes.join(', ')}`;
    return await logAuditEvent({
      entityType: 'club',
      entityId: clubId,
      action: 'update',
      oldValues: oldData,
      newValues: newData,
      userId,
      description
    });
  }

  return null;
};

export const trackPaymentAction = async (
  paymentId: string,
  action: 'create' | 'update' | 'delete',
  paymentData: any,
  userId?: string,
  oldData?: any
): Promise<any> => {
  let description = '';
  
  switch (action) {
    case 'create':
      description = `Commission payment created: £${paymentData.amount} for period ${paymentData.period_start} to ${paymentData.period_end}`;
      break;
    case 'update':
      description = `Commission payment updated: £${paymentData.amount} for period ${paymentData.period_start} to ${paymentData.period_end}`;
      break;
    case 'delete':
      description = `Commission payment deleted: £${oldData.amount} for period ${oldData.period_start} to ${oldData.period_end}`;
      break;
  }

  return await logAuditEvent({
    entityType: 'payment',
    entityId: paymentId,
    action,
    oldValues: oldData || null,
    newValues: action === 'delete' ? null : paymentData,
    userId,
    description
  });
};