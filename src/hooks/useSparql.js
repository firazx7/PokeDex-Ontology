// =============================================
// useSparql.js — Core SPARQL Hook
// =============================================
// This hook sends queries to your Fuseki endpoint
// and returns the parsed results.
//
// HOW TO USE:
//   const { query, loading, error } = useSparql()
//   const results = await query(myQueryString)
//   // results is an array of objects
//   // e.g. results[0].name.value, results[0].hp.value
//
// NOTE: All values from SPARQL come back as strings.
// Use parseInt() or parseFloat() for numbers.

import { useState, useCallback } from 'react'

// ⚙️ CHANGE THIS to your Fuseki endpoint URL
// When running Fuseki locally: http://localhost:3030/pokedex/sparql
// When using TriplyDB: paste your TriplyDB SPARQL endpoint here
const SPARQL_ENDPOINT = 'http://localhost:3030/pokedex/sparql'

// These prefixes are added to EVERY query automatically.
// You do NOT need to add them manually in your query strings.
const PREFIXES = `
PREFIX : <http://www.uni-bremen.de/akr/pokedex#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
`

export function useSparql() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const query = useCallback(async (sparqlQuery) => {
    setLoading(true)
    setError(null)

    try {
      const fullQuery = PREFIXES + sparqlQuery

      const response = await fetch(SPARQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sparql-query',
          'Accept': 'application/sparql-results+json',
        },
        body: fullQuery,
      })

      if (!response.ok) {
        throw new Error(`SPARQL endpoint error: ${response.status} ${response.statusText}`)
      }

      const json = await response.json()
      return json.results.bindings

    } catch (err) {
      setError(err.message)
      console.error('SPARQL Query Error:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return { query, loading, error }
}
