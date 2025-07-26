/**
 * Brevo List Management System
 * Handles dynamic list creation and contact assignment
 */

import { getBrevoClient, BrevoClient } from './client';
import { db, supabase } from '@/lib/supabase-client';

export interface ListCriteria {
  conditions: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains';
    value: any;
  }>;
  logic?: 'AND' | 'OR';
}

export interface ManagedList {
  id: string;
  brevo_list_id: number;
  name: string;
  type: 'manual' | 'dynamic';
  criteria: ListCriteria | null;
  contact_count: number;
  is_active: boolean;
}

export class BrevoListManager {
  private brevoClient: BrevoClient;

  constructor() {
    this.brevoClient = getBrevoClient();
  }

  /**
   * Initialize default lists in Brevo
   */
  async initializeDefaultLists(): Promise<void> {
    const defaultLists = [
      { name: 'All Users', type: 'dynamic', criteria: this.getAllUsersCriteria() },
      { name: 'Free Users', type: 'dynamic', criteria: this.getFreeUsersCriteria() },
      { name: 'Premium Users', type: 'dynamic', criteria: this.getPremiumUsersCriteria() },
      { name: 'Active Users', type: 'dynamic', criteria: this.getActiveUsersCriteria() },
      { name: 'Inactive Users', type: 'dynamic', criteria: this.getInactiveUsersCriteria() },
      { name: 'High Usage Users', type: 'dynamic', criteria: this.getHighUsageCriteria() },
      { name: 'Low Usage Users', type: 'dynamic', criteria: this.getLowUsageCriteria() },
      { name: 'Quota Warning', type: 'dynamic', criteria: this.getQuotaWarningCriteria() },
      { name: 'Quota Reached', type: 'dynamic', criteria: this.getQuotaReachedCriteria() },
    ];

    for (const listConfig of defaultLists) {
      await this.createOrUpdateDynamicList(
        listConfig.name,
        listConfig.criteria as ListCriteria
      );
    }
  }

  /**
   * Create or update a dynamic list
   */
  async createOrUpdateDynamicList(
    name: string,
    criteria: ListCriteria
  ): Promise<ManagedList> {
    // Check if list already exists in our database
    const { data: existingList } = await db.brevoLists()
      .select('*')
      .eq('name', name)
      .single();

    let brevoListId: number;

    if (existingList) {
      // Update existing list
      brevoListId = existingList.brevo_list_id;
      await this.brevoClient.updateList(brevoListId, name);
      
      // Update criteria in database
      await db.brevoLists()
        .update({
          criteria: criteria as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingList.id);
    } else {
      // Create new list in Brevo
      const brevoList = await this.brevoClient.createList(name);
      brevoListId = brevoList.id;

      // Store in our database
      await db.brevoLists().insert({
        brevo_list_id: brevoListId,
        name,
        type: 'dynamic',
        criteria: criteria as any,
        contact_count: 0,
        is_active: true,
      });
    }

    // Refresh list membership
    await this.refreshDynamicList(name);

    // Get updated list data
    const { data: updatedList } = await db.brevoLists()
      .select('*')
      .eq('name', name)
      .single();

    return updatedList!;
  }

  /**
   * Refresh dynamic list membership
   */
  async refreshDynamicList(listNameOrId: string | number): Promise<void> {
    // Get list configuration
    const { data: listConfig } = await db.brevoLists()
      .select('*')
      .or(
        typeof listNameOrId === 'string'
          ? `name.eq.${listNameOrId}`
          : `brevo_list_id.eq.${listNameOrId}`
      )
      .single();

    if (!listConfig || listConfig.type !== 'dynamic' || !listConfig.criteria) {
      throw new Error('Invalid or non-dynamic list');
    }

    // Get users matching criteria
    const matchingUserIds = await this.getUsersMatchingCriteria(listConfig.criteria);

    // Get contacts that should be in this list
    const { data: contactsToAdd } = await db.brevoContactsSync()
      .select('brevo_contact_id, user_id')
      .in('user_id', matchingUserIds)
      .eq('sync_status', 'synced')
      .not('brevo_contact_id', 'is', null);

    if (!contactsToAdd || contactsToAdd.length === 0) {
      console.log(`No contacts to add to list ${listConfig.name}`);
      return;
    }

    // Get current list members
    const { data: currentMembers } = await db.brevoContactLists()
      .select('contact_sync_id')
      .eq('list_id', listConfig.id);

    const currentMemberContactIds = new Set(
      currentMembers?.map(m => m.contact_sync_id) || []
    );

    // Determine contacts to add and remove
    const contactsToAddToBrevo = contactsToAdd.filter(contact => {
      const syncRecord = currentMembers?.find(m => 
        m.contact_sync_id === contact.user_id
      );
      return !syncRecord;
    });

    // Add contacts to Brevo list
    if (contactsToAddToBrevo.length > 0) {
      const brevoContactIds = contactsToAddToBrevo
        .map(c => c.brevo_contact_id)
        .filter(id => id !== null) as number[];

      if (brevoContactIds.length > 0) {
        try {
          await this.brevoClient.addContactsToList(
            listConfig.brevo_list_id,
            brevoContactIds
          );

          // Update our tracking
          const contactListRecords = contactsToAddToBrevo.map(contact => ({
            contact_sync_id: contact.user_id,
            list_id: listConfig.id,
          }));

          await db.brevoContactLists().insert(contactListRecords);
        } catch (error) {
          console.error(`Failed to add contacts to list ${listConfig.name}:`, error);
        }
      }
    }

    // Remove contacts that no longer match criteria
    const contactsToRemove = currentMembers?.filter(member => {
      return !matchingUserIds.includes(member.contact_sync_id);
    }) || [];

    if (contactsToRemove.length > 0) {
      const { data: contactsToRemoveFromBrevo } = await db.brevoContactsSync()
        .select('brevo_contact_id')
        .in('user_id', contactsToRemove.map(c => c.contact_sync_id))
        .not('brevo_contact_id', 'is', null);

      if (contactsToRemoveFromBrevo && contactsToRemoveFromBrevo.length > 0) {
        const brevoContactIds = contactsToRemoveFromBrevo
          .map(c => c.brevo_contact_id)
          .filter(id => id !== null) as number[];

        try {
          await this.brevoClient.removeContactsFromList(
            listConfig.brevo_list_id,
            brevoContactIds
          );

          // Remove from our tracking
          await db.brevoContactLists()
            .delete()
            .eq('list_id', listConfig.id)
            .in('contact_sync_id', contactsToRemove.map(c => c.contact_sync_id));
        } catch (error) {
          console.error(`Failed to remove contacts from list ${listConfig.name}:`, error);
        }
      }
    }

    // Update contact count
    const { data: finalCount } = await db.brevoContactLists()
      .select('id', { count: 'exact' })
      .eq('list_id', listConfig.id);

    await db.brevoLists()
      .update({
        contact_count: finalCount?.length || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listConfig.id);
  }

  /**
   * Get users matching specific criteria
   */
  private async getUsersMatchingCriteria(criteria: ListCriteria): Promise<string[]> {
    // This is a simplified implementation - in a real system,
    // you'd want more sophisticated query building
    const userIds: string[] = [];

    for (const condition of criteria.conditions) {
      const conditionUserIds = await this.getUsersMatchingCondition(condition);
      
      if (criteria.logic === 'OR') {
        // Add unique user IDs
        conditionUserIds.forEach(id => {
          if (!userIds.includes(id)) {
            userIds.push(id);
          }
        });
      } else {
        // AND logic - intersect with existing results
        if (userIds.length === 0) {
          userIds.push(...conditionUserIds);
        } else {
          const intersection = userIds.filter(id => conditionUserIds.includes(id));
          userIds.length = 0;
          userIds.push(...intersection);
        }
      }
    }

    return userIds;
  }

  /**
   * Get users matching a single condition
   */
  private async getUsersMatchingCondition(condition: {
    field: string;
    operator: string;
    value: any;
  }): Promise<string[]> {
    switch (condition.field) {
      case 'SUBSCRIPTION_TYPE':
        return this.getUsersBySubscriptionType(condition.operator, condition.value);
      
      case 'LETTERS_GENERATED':
        return this.getUsersByLettersGenerated(condition.operator, condition.value);
      
      case 'QUOTA_REMAINING':
        return this.getUsersByQuotaRemaining(condition.operator, condition.value);
      
      case 'LAST_LOGIN':
        return this.getUsersByLastLogin(condition.operator, condition.value);
      
      case 'COUNTRY':
        return this.getUsersByCountry(condition.operator, condition.value);
      
      default:
        console.warn(`Unknown condition field: ${condition.field}`);
        return [];
    }
  }

  // Condition-specific query methods
  private async getUsersBySubscriptionType(operator: string, value: string): Promise<string[]> {
    let query = db.userProfiles().select('user_id');
    
    if (operator === 'equals') {
      query = query.eq('subscription_tier', value);
    } else if (operator === 'not_equals') {
      query = query.neq('subscription_tier', value);
    }
    
    const { data } = await query;
    return data?.map(u => u.user_id) || [];
  }

  private async getUsersByLettersGenerated(operator: string, value: number): Promise<string[]> {
    // Get letter counts by user
    const { data: letterCounts } = await db.generatedLetters()
      .select('user_id')
      .then(async ({ data }) => {
        if (!data) return { data: [] };
        
        const counts = data.reduce((acc, letter) => {
          acc[letter.user_id] = (acc[letter.user_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        return { 
          data: Object.entries(counts).map(([user_id, count]) => ({ user_id, count }))
        };
      });

    if (!letterCounts) return [];

    return letterCounts
      .filter(({ count }) => {
        switch (operator) {
          case 'greater_than': return count > value;
          case 'less_than': return count < value;
          case 'equals': return count === value;
          default: return false;
        }
      })
      .map(({ user_id }) => user_id);
  }

  private async getUsersByQuotaRemaining(operator: string, value: number | number[]): Promise<string[]> {
    const { data: quotas } = await db.userQuotas()
      .select('user_id, letters_generated, max_letters');

    if (!quotas) return [];

    return quotas
      .filter(quota => {
        const remaining = quota.max_letters - quota.letters_generated;
        
        switch (operator) {
          case 'equals': return remaining === value;
          case 'greater_than': return typeof value === 'number' && remaining > value;
          case 'less_than': return typeof value === 'number' && remaining < value;
          case 'between': 
            return Array.isArray(value) && remaining >= value[0] && remaining <= value[1];
          default: return false;
        }
      })
      .map(quota => quota.user_id);
  }

  private async getUsersByLastLogin(operator: string, value: string): Promise<string[]> {
    // This would need to be implemented based on how you track last login
    // For now, return all users as a placeholder
    const { data: users } = await db.userProfiles().select('user_id');
    return users?.map(u => u.user_id) || [];
  }

  private async getUsersByCountry(operator: string, value: string): Promise<string[]> {
    let query = db.userProfiles().select('user_id');
    
    if (operator === 'equals') {
      query = query.eq('country', value);
    } else if (operator === 'not_equals') {
      query = query.neq('country', value);
    }
    
    const { data } = await query;
    return data?.map(u => u.user_id) || [];
  }

  // Predefined criteria for common lists
  private getAllUsersCriteria(): ListCriteria {
    return {
      conditions: [
        { field: 'status', operator: 'equals', value: 'active' }
      ]
    };
  }

  private getFreeUsersCriteria(): ListCriteria {
    return {
      conditions: [
        { field: 'SUBSCRIPTION_TYPE', operator: 'equals', value: 'free' }
      ]
    };
  }

  private getPremiumUsersCriteria(): ListCriteria {
    return {
      conditions: [
        { field: 'SUBSCRIPTION_TYPE', operator: 'equals', value: 'premium' }
      ]
    };
  }

  private getActiveUsersCriteria(): ListCriteria {
    return {
      conditions: [
        { field: 'LAST_LOGIN', operator: 'greater_than', value: '30_days_ago' }
      ]
    };
  }

  private getInactiveUsersCriteria(): ListCriteria {
    return {
      conditions: [
        { field: 'LAST_LOGIN', operator: 'less_than', value: '30_days_ago' }
      ]
    };
  }

  private getHighUsageCriteria(): ListCriteria {
    return {
      conditions: [
        { field: 'LETTERS_GENERATED', operator: 'greater_than', value: 5 }
      ]
    };
  }

  private getLowUsageCriteria(): ListCriteria {
    return {
      conditions: [
        { field: 'LETTERS_GENERATED', operator: 'less_than', value: 2 }
      ]
    };
  }

  private getQuotaWarningCriteria(): ListCriteria {
    return {
      conditions: [
        { field: 'QUOTA_REMAINING', operator: 'between', value: [1, 2] }
      ]
    };
  }

  private getQuotaReachedCriteria(): ListCriteria {
    return {
      conditions: [
        { field: 'QUOTA_REMAINING', operator: 'equals', value: 0 }
      ]
    };
  }

  /**
   * Get all managed lists
   */
  async getAllLists(): Promise<ManagedList[]> {
    const { data } = await db.brevoLists()
      .select('*')
      .eq('is_active', true)
      .order('name');

    return data || [];
  }

  /**
   * Refresh all dynamic lists
   */
  async refreshAllDynamicLists(): Promise<void> {
    const { data: dynamicLists } = await db.brevoLists()
      .select('name')
      .eq('type', 'dynamic')
      .eq('is_active', true);

    if (!dynamicLists) return;

    for (const list of dynamicLists) {
      try {
        await this.refreshDynamicList(list.name);
        console.log(`Refreshed list: ${list.name}`);
      } catch (error) {
        console.error(`Failed to refresh list ${list.name}:`, error);
      }
    }
  }
}

// Singleton instance
let listManager: BrevoListManager | null = null;

export function getListManager(): BrevoListManager {
  if (!listManager) {
    listManager = new BrevoListManager();
  }
  return listManager;
}