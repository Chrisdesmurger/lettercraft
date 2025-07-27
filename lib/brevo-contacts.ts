/**
 * Service de synchronisation des contacts avec Brevo
 * Gère la création, mise à jour et suppression des contacts dans Brevo
 */

import { supabase } from './supabase-client'
import { supabaseAdmin } from './supabase-admin'

// Types pour les contacts Brevo
export interface BrevoContact {
  email: string
  attributes?: {
    FIRSTNAME?: string
    LASTNAME?: string
    SMS?: string
    // Attributs personnalisés LetterCraft
    USER_ID?: string
    SUBSCRIPTION_TIER?: 'free' | 'premium'
    LANGUAGE?: string
    COUNTRY?: string
    REGISTRATION_DATE?: string
    LAST_LOGIN?: string
    LETTERS_GENERATED?: number
    PROFILE_COMPLETE?: boolean
  }
  listIds?: number[]
  updateEnabled?: boolean
}

export interface BrevoContactResponse {
  id: number
  email: string
  emailBlacklisted: boolean
  smsBlacklisted: boolean
  createdAt: string
  modifiedAt: string
  attributes: Record<string, any>
}

export interface BrevoListResponse {
  id: number
  name: string
  totalBlacklisted: number
  totalSubscribers: number
  folderId: number
  createdAt: string
  campaignStats: any[]
}

// Configuration des listes Brevo
export const BREVO_LISTS = {
  ALL_USERS: parseInt(process.env.BREVO_LIST_ALL_USERS || '1'),
  FREE_USERS: parseInt(process.env.BREVO_LIST_FREE_USERS || '2'),
  PREMIUM_USERS: parseInt(process.env.BREVO_LIST_PREMIUM_USERS || '3'),
  ACTIVE_USERS: parseInt(process.env.BREVO_LIST_ACTIVE_USERS || '4'),
  CHURNED_USERS: parseInt(process.env.BREVO_LIST_CHURNED_USERS || '5')
} as const

class BrevoContactsService {
  private readonly apiKey: string
  private readonly baseUrl = 'https://api.brevo.com/v3'

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY!
    if (!this.apiKey) {
      throw new Error('BREVO_API_KEY is required')
    }
  }

  /**
   * Headers pour les requêtes Brevo API
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'api-key': this.apiKey
    }
  }

  /**
   * Créer ou mettre à jour un contact dans Brevo
   */
  async createOrUpdateContact(contactData: BrevoContact): Promise<BrevoContactResponse | null> {
    try {
      console.log(`📧 Synchronisation contact Brevo: ${contactData.email}`)

      const response = await fetch(`${this.baseUrl}/contacts`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          email: contactData.email,
          attributes: contactData.attributes || {},
          listIds: contactData.listIds || [BREVO_LISTS.ALL_USERS],
          updateEnabled: contactData.updateEnabled !== false // true par défaut
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        
        // Si le contact existe déjà, on met à jour
        if (response.status === 400 && errorData.includes('Contact already exist')) {
          console.log(`🔄 Contact existe déjà, mise à jour: ${contactData.email}`)
          return await this.updateContact(contactData.email, contactData)
        }
        
        console.error(`❌ Erreur création contact Brevo:`, response.status, errorData)
        return null
      }

      const result = await response.json()
      console.log(`✅ Contact créé dans Brevo:`, result.id)
      return result
    } catch (error) {
      console.error('❌ Erreur inattendue lors de la création du contact:', error)
      return null
    }
  }

  /**
   * Mettre à jour un contact existant dans Brevo
   */
  async updateContact(email: string, contactData: Partial<BrevoContact>): Promise<BrevoContactResponse | null> {
    try {
      console.log(`🔄 Mise à jour contact Brevo: ${email}`)

      const updatePayload: any = {}
      
      if (contactData.attributes) {
        updatePayload.attributes = contactData.attributes
      }
      
      if (contactData.listIds) {
        updatePayload.listIds = contactData.listIds
      }

      const response = await fetch(`${this.baseUrl}/contacts/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updatePayload)
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error(`❌ Erreur mise à jour contact Brevo:`, response.status, errorData)
        return null
      }

      console.log(`✅ Contact mis à jour dans Brevo: ${email}`)
      
      // Récupérer les infos du contact mis à jour
      return await this.getContact(email)
    } catch (error) {
      console.error('❌ Erreur inattendue lors de la mise à jour du contact:', error)
      return null
    }
  }

  /**
   * Récupérer un contact depuis Brevo
   */
  async getContact(email: string): Promise<BrevoContactResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/contacts/${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: this.getHeaders()
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`📭 Contact non trouvé dans Brevo: ${email}`)
        } else {
          const errorData = await response.text()
          console.error(`❌ Erreur récupération contact Brevo:`, response.status, errorData)
        }
        return null
      }

      return await response.json()
    } catch (error) {
      console.error('❌ Erreur inattendue lors de la récupération du contact:', error)
      return null
    }
  }

  /**
   * Supprimer un contact de Brevo
   */
  async deleteContact(email: string): Promise<boolean> {
    try {
      console.log(`🗑️ Suppression contact Brevo: ${email}`)

      const response = await fetch(`${this.baseUrl}/contacts/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error(`❌ Erreur suppression contact Brevo:`, response.status, errorData)
        return false
      }

      console.log(`✅ Contact supprimé de Brevo: ${email}`)
      return true
    } catch (error) {
      console.error('❌ Erreur inattendue lors de la suppression du contact:', error)
      return false
    }
  }

  /**
   * Ajouter un contact à une liste spécifique
   */
  async addContactToList(email: string, listId: number): Promise<boolean> {
    try {
      console.log(`📋 Ajout contact à la liste ${listId}: ${email}`)

      const response = await fetch(`${this.baseUrl}/contacts/lists/${listId}/contacts/add`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          emails: [email]
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error(`❌ Erreur ajout à la liste:`, response.status, errorData)
        return false
      }

      console.log(`✅ Contact ajouté à la liste ${listId}: ${email}`)
      return true
    } catch (error) {
      console.error('❌ Erreur inattendue lors de l\'ajout à la liste:', error)
      return false
    }
  }

  /**
   * Retirer un contact d'une liste spécifique
   */
  async removeContactFromList(email: string, listId: number): Promise<boolean> {
    try {
      console.log(`📋 Suppression contact de la liste ${listId}: ${email}`)

      const response = await fetch(`${this.baseUrl}/contacts/lists/${listId}/contacts/remove`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          emails: [email]
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error(`❌ Erreur suppression de la liste:`, response.status, errorData)
        return false
      }

      console.log(`✅ Contact retiré de la liste ${listId}: ${email}`)
      return true
    } catch (error) {
      console.error('❌ Erreur inattendue lors de la suppression de la liste:', error)
      return false
    }
  }

  /**
   * Déterminer les listes appropriées pour un utilisateur
   */
  private determineUserLists(user: any): number[] {
    const listIds = [BREVO_LISTS.ALL_USERS]
    
    // Liste selon le tier d'abonnement
    if (user.subscription_tier === 'premium') {
      listIds.push(BREVO_LISTS.PREMIUM_USERS)
    } else {
      listIds.push(BREVO_LISTS.FREE_USERS)
    }

    // Liste utilisateurs actifs (ont généré au moins une lettre)
    if ((user.letters_generated || 0) > 0) {
      listIds.push(BREVO_LISTS.ACTIVE_USERS)
    }

    // Liste utilisateurs désactivés (inactifs depuis longtemps)
    if (user.last_sign_in_at) {
      const lastLogin = new Date(user.last_sign_in_at)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      if (lastLogin < thirtyDaysAgo && (user.letters_generated || 0) === 0) {
        listIds.push(BREVO_LISTS.CHURNED_USERS)
      }
    }

    return listIds
  }

  /**
   * Construire les attributs personnalisés pour un utilisateur
   */
  private buildUserAttributes(user: any): BrevoContact['attributes'] {
    const attributes: BrevoContact['attributes'] = {
      FIRSTNAME: user.first_name || '',
      LASTNAME: user.last_name || '',
      USER_ID: user.id,
      SUBSCRIPTION_TIER: user.subscription_tier || 'free',
      LANGUAGE: user.language || 'fr',
      COUNTRY: user.country || '',
      REGISTRATION_DATE: user.created_at,
      LAST_LOGIN: user.last_sign_in_at || user.created_at,
      LETTERS_GENERATED: user.letters_generated || 0,
      PROFILE_COMPLETE: !!(user.first_name && user.last_name && user.country)
    }

    // Ajouter le téléphone si disponible
    if (user.phone) {
      attributes.SMS = user.phone
    }

    return attributes
  }

  /**
   * Synchroniser un utilisateur LetterCraft avec Brevo
   */
  async syncUserToBrevo(userId: string): Promise<boolean> {
    try {
      console.log(`🔄 Synchronisation utilisateur ${userId} vers Brevo`)

      // Récupérer les données utilisateur depuis Supabase
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select(`
          user_id,
          first_name,
          last_name,
          phone,
          language,
          country,
          subscription_tier,
          created_at
        `)
        .eq('user_id', userId)
        .single()

      if (profileError || !profile) {
        console.error('❌ Profil utilisateur non trouvé:', profileError)
        return false
      }

      // Récupérer les données auth et le nombre de lettres générées
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
      if (authError || !authUser?.user?.email) {
        console.error('❌ Données auth non trouvées:', authError)
        return false
      }

      const { data: lettersData } = await supabaseAdmin
        .from('generated_letters')
        .select('id')
        .eq('user_id', userId)

      const user = {
        id: userId,
        email: authUser.user.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        language: profile.language,
        country: profile.country,
        subscription_tier: profile.subscription_tier,
        created_at: authUser.user.created_at || profile.created_at,
        last_sign_in_at: authUser.user.last_sign_in_at,
        letters_generated: lettersData?.length || 0
      }

      // Construire les attributs et listes pour l'utilisateur
      const attributes = this.buildUserAttributes(user)
      const listIds = this.determineUserLists(user)

      // Synchroniser avec Brevo
      const result = await this.createOrUpdateContact({
        email: user.email,
        attributes,
        listIds,
        updateEnabled: true
      })

      if (result) {
        console.log(`✅ Utilisateur ${userId} synchronisé avec Brevo`)
        return true
      } else {
        console.error(`❌ Échec synchronisation utilisateur ${userId}`)
        return false
      }
    } catch (error) {
      console.error('❌ Erreur inattendue lors de la synchronisation:', error)
      return false
    }
  }

  /**
   * Synchronisation en lot des utilisateurs
   */
  async bulkSyncUsers(userIds: string[]): Promise<{ success: number; failed: number }> {
    console.log(`🔄 Synchronisation en lot de ${userIds.length} utilisateurs`)
    
    let success = 0
    let failed = 0

    for (const userId of userIds) {
      try {
        const result = await this.syncUserToBrevo(userId)
        if (result) {
          success++
        } else {
          failed++
        }
        
        // Petite pause pour éviter de surcharger l'API
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`❌ Erreur sync utilisateur ${userId}:`, error)
        failed++
      }
    }

    console.log(`📊 Synchronisation terminée: ${success} succès, ${failed} échecs`)
    return { success, failed }
  }

  /**
   * Mettre à jour les listes d'un contact (ajouter/retirer selon le statut)
   */
  async updateContactLists(email: string, newListIds: number[]): Promise<boolean> {
    try {
      console.log(`📋 Mise à jour des listes pour le contact: ${email}`)
      
      // Récupérer le contact actuel pour voir ses listes actuelles
      const currentContact = await this.getContact(email)
      if (!currentContact) {
        console.log(`📭 Contact non trouvé pour mise à jour des listes: ${email}`)
        return false
      }

      // Mettre à jour le contact avec les nouvelles listes
      const result = await this.updateContact(email, {
        listIds: newListIds
      })

      if (result) {
        console.log(`✅ Listes mises à jour pour ${email}: [${newListIds.join(', ')}]`)
        return true
      } else {
        console.error(`❌ Échec mise à jour des listes pour ${email}`)
        return false
      }
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour des listes:', error)
      return false
    }
  }

  /**
   * Synchroniser tous les contacts avec les bonnes listes (maintenance)
   */
  async syncAllContactLists(): Promise<{ updated: number; failed: number }> {
    try {
      console.log('🔄 Synchronisation de toutes les listes de contacts')
      
      // Récupérer tous les utilisateurs depuis user_profiles
      const { data: profiles, error } = await supabaseAdmin
        .from('user_profiles')
        .select(`
          user_id,
          first_name,
          last_name,
          subscription_tier,
          created_at
        `)

      if (error || !profiles) {
        console.error('❌ Erreur récupération des profils:', error)
        return { updated: 0, failed: 0 }
      }

      let updated = 0
      let failed = 0

      for (const profile of profiles) {
        try {
          // Récupérer l'email depuis auth.users
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.user_id)
          if (!authUser?.user?.email) {
            console.warn(`⚠️ Email non trouvé pour l'utilisateur ${profile.user_id}`)
            failed++
            continue
          }

          // Récupérer le nombre de lettres générées
          const { data: lettersData } = await supabaseAdmin
            .from('generated_letters')
            .select('id')
            .eq('user_id', profile.user_id)

          const user = {
            id: profile.user_id,
            email: authUser.user.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            subscription_tier: profile.subscription_tier,
            created_at: profile.created_at,
            last_sign_in_at: authUser.user.last_sign_in_at,
            letters_generated: lettersData?.length || 0
          }

          const listIds = this.determineUserLists(user)
          const success = await this.updateContactLists(user.email, listIds)
          
          if (success) {
            updated++
          } else {
            failed++
          }
          
          // Petite pause pour éviter de surcharger l'API
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (error) {
          console.error(`❌ Erreur sync listes pour ${user.email}:`, error)
          failed++
        }
      }

      console.log(`📊 Synchronisation des listes terminée: ${updated} mis à jour, ${failed} échecs`)
      return { updated, failed }
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation des listes:', error)
      return { updated: 0, failed: 0 }
    }
  }

  /**
   * Créer tous les utilisateurs LetterCraft qui n'existent pas encore dans Brevo
   */
  async createMissingContacts(): Promise<{ created: number; already_exists: number; failed: number }> {
    try {
      console.log('🔄 Création des contacts manquants dans Brevo')
      
      // Récupérer tous les utilisateurs depuis user_profiles
      const { data: profiles, error } = await supabaseAdmin
        .from('user_profiles')
        .select(`
          user_id,
          first_name,
          last_name,
          phone,
          language,
          country,
          subscription_tier,
          created_at
        `)

      if (error || !profiles) {
        console.error('❌ Erreur récupération des profils:', error)
        return { created: 0, already_exists: 0, failed: 0 }
      }

      let created = 0
      let already_exists = 0
      let failed = 0

      console.log(`📊 Vérification de ${profiles.length} utilisateurs dans Brevo`)

      for (const profile of profiles) {
        try {
          // Récupérer l'email depuis auth.users
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.user_id)
          if (!authUser?.user?.email) {
            console.warn(`⚠️ Email non trouvé pour l'utilisateur ${profile.user_id}`)
            failed++
            continue
          }

          const email = authUser.user.email

          // Vérifier si le contact existe déjà dans Brevo
          const existingContact = await this.getContact(email)
          if (existingContact) {
            console.log(`✅ Contact déjà existant: ${email}`)
            already_exists++
            continue
          }

          // Récupérer le nombre de lettres générées
          const { data: lettersData } = await supabaseAdmin
            .from('generated_letters')
            .select('id')
            .eq('user_id', profile.user_id)

          const user = {
            id: profile.user_id,
            email: email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone: profile.phone,
            language: profile.language,
            country: profile.country,
            subscription_tier: profile.subscription_tier,
            created_at: authUser.user.created_at || profile.created_at,
            last_sign_in_at: authUser.user.last_sign_in_at,
            letters_generated: lettersData?.length || 0
          }

          // Construire les attributs et listes pour l'utilisateur
          const attributes = this.buildUserAttributes(user)
          const listIds = this.determineUserLists(user)

          // Créer le contact dans Brevo
          console.log(`➕ Création du contact: ${email}`)
          const result = await this.createOrUpdateContact({
            email: user.email,
            attributes,
            listIds,
            updateEnabled: false // Créer seulement, ne pas mettre à jour si existe
          })

          if (result) {
            created++
            console.log(`✅ Contact créé: ${email} (ID: ${result.id})`)
          } else {
            failed++
            console.error(`❌ Échec création contact: ${email}`)
          }
          
          // Petite pause pour éviter de surcharger l'API Brevo
          await new Promise(resolve => setTimeout(resolve, 150))
        } catch (error) {
          console.error(`❌ Erreur création contact pour ${profile.user_id}:`, error)
          failed++
        }
      }

      console.log(`📊 Création des contacts terminée:`)
      console.log(`   ➕ ${created} nouveaux contacts créés`)
      console.log(`   ✅ ${already_exists} contacts déjà existants`)
      console.log(`   ❌ ${failed} échecs`)
      
      return { created, already_exists, failed }
    } catch (error) {
      console.error('❌ Erreur lors de la création des contacts manquants:', error)
      return { created: 0, already_exists: 0, failed: 0 }
    }
  }

  /**
   * Nettoyer les contacts supprimés de LetterCraft
   */
  async cleanupDeletedUsers(): Promise<number> {
    try {
      console.log('🧹 Nettoyage des contacts supprimés de LetterCraft')
      
      // Cette fonctionnalité nécessiterait de récupérer tous les contacts de Brevo
      // et de vérifier s'ils existent encore dans LetterCraft
      // Pour l'instant, on retourne 0 (à implémenter si nécessaire)
      
      return 0
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error)
      return 0
    }
  }
}

// Instance singleton du service
export const brevoContacts = new BrevoContactsService()

// Helper pour synchroniser rapidement un utilisateur
export async function syncUserToBrevo(userId: string): Promise<boolean> {
  return await brevoContacts.syncUserToBrevo(userId)
}

// Helper pour la synchronisation en lot
export async function bulkSyncUsersToBrevo(userIds: string[]): Promise<{ success: number; failed: number }> {
  return await brevoContacts.bulkSyncUsers(userIds)
}

// Helper pour la mise à jour des listes de contacts
export async function updateContactLists(email: string, listIds: number[]): Promise<boolean> {
  return await brevoContacts.updateContactLists(email, listIds)
}

// Helper pour la synchronisation de toutes les listes
export async function syncAllContactLists(): Promise<{ updated: number; failed: number }> {
  return await brevoContacts.syncAllContactLists()
}

// Helper pour créer tous les contacts manquants
export async function createMissingContacts(): Promise<{ created: number; already_exists: number; failed: number }> {
  return await brevoContacts.createMissingContacts()
}