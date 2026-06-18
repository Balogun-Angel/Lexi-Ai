import { useCallback, useEffect, useState } from 'react'
import { fetchDocuments, mapDocument } from '../api/documents'
import type { DocumentDisplay } from '../types/document'

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentDisplay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchDocuments()
      setDocuments(data.map(mapDocument))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
      setDocuments([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  return { documents, isLoading, error, reload: loadDocuments }
}
