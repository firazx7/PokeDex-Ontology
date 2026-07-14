// =============================================
// useSparql.js — Query hook (SPARQL + offline fallback)
// =============================================
// Sends the game's queries to a SPARQL endpoint (Fuseki/TriplyDB)
// and returns parsed result rows.
//
//   const { query, loading, error, usingMock } = useSparql()
//   const rows = await query(someQueryString)
//   // rows[0].name.value, parseInt(rows[0].hp.value), ...
//
// OFFLINE FALLBACK:
// If the endpoint is unreachable (not configured, not running, CORS,
// offline), the hook automatically answers from bundled ontology data
// so the game stays playable. Set USE_MOCK = true to force offline mode.
// The real, intended data path is live SPARQL.

import { useState, useCallback, useRef } from 'react'
import { mockQuery } from '../mock/mockEngine'

// ⚙️ Your SPARQL endpoint. Fuseki default shown.
const SPARQL_ENDPOINT = 'http://localhost:3030/pokedex/sparql'

// ⚙️ Force offline mode (skip the network entirely) by setting this true.
const USE_MOCK = false

// Prefixes prepended to every query (so query strings stay clean).
const PREFIXES = `
PREFIX : <http://www.uni-bremen.de/akr/pokedex#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
`

export function useSparql() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [usingMock, setUsingMock] = useState(USE_MOCK)
  // Once we've decided the endpoint is unreachable, stay in mock mode
  const forcedMock = useRef(USE_MOCK)

  const query = useCallback(async (sparqlQuery) => {
    setLoading(true)
    setError(null)

    // Offline mode (forced or previously detected)
    if (forcedMock.current) {
      const rows = mockQuery(sparqlQuery)
      setLoading(false)
      return rows
    }

    try {
      const res = await fetch(SPARQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sparql-query',
          'Accept': 'application/sparql-results+json',
        },
        body: PREFIXES + sparqlQuery,
      })
      if (!res.ok) throw new Error(`Endpoint ${res.status} ${res.statusText}`)
      const json = await res.json()
      return json.results.bindings
    } catch (err) {
      // First failure → switch to offline mock for the rest of the session
      console.warn('[useSparql] Endpoint unreachable, switching to offline data.', err.message)
      forcedMock.current = true
      setUsingMock(true)
      const rows = mockQuery(sparqlQuery)
      return rows
    } finally {
      setLoading(false)
    }
  }, [])

  return { query, loading, error, usingMock }
}
