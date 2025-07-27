import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'

export interface Country {
  code: string
  name: string
}

export function useCountries() {
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCountries() {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('countries')
          .select('code, name')
          .order('name')

        if (fetchError) {
          throw fetchError
        }

        setCountries(data || [])
      } catch (err) {
        console.error('Error fetching countries:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch countries')
        
        // Fallback: utiliser quelques pays de base en cas d'erreur
        setCountries([
          { code: 'FR', name: 'France' },
          { code: 'US', name: 'United States of America' },
          { code: 'GB', name: 'United Kingdom of Great Britain and Northern Ireland' },
          { code: 'DE', name: 'Germany' },
          { code: 'ES', name: 'Spain' },
          { code: 'IT', name: 'Italy' },
          { code: 'CA', name: 'Canada' },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchCountries()
  }, [])

  return { countries, loading, error }
}