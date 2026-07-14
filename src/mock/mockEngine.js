// =============================================
// mockEngine.js — Offline SPARQL fallback
// =============================================
// When no SPARQL endpoint is reachable, this engine answers the
// game's 11 queries from bundled ontology data (mockData.js),
// returning results in the same shape as a real SPARQL endpoint
// (json.results.bindings). This lets anyone play instantly without
// installing Fuseki. The REAL game path still uses live SPARQL.
//
// It works by recognizing each of the game's known query shapes.

import { MOCK_DATA } from './mockData'

const P = MOCK_DATA.pokemon           // { ':Charizard': {...}, ... }
const ALL = Object.values(P)

// Wrap a plain value as a SPARQL binding cell
const cell = (v) => ({ value: String(v) })

// Build a Pokemon result row (matches getStarters/getRandomTeam/getOpponent/getLegendaryBoss/getEvolvedStats)
function pokemonRow(p) {
  const IRI = 'http://www.uni-bremen.de/akr/pokedex#' + p.iriShort.slice(1)
  return {
    pokemon: cell(IRI),
    name: cell(p.name),
    num: cell(p.num),
    hp: cell(p.hp),
    attack: cell(p.attack),
    defense: cell(p.defense),
    types: cell(p.types.map(t => 'http://www.uni-bremen.de/akr/pokedex#' + t).join(',')),
  }
}

function moveRows(p) {
  return p.moves.slice(0, 4).map(m => ({
    move: cell('http://www.uni-bremen.de/akr/pokedex#' + m.name.replace(/\s/g, '')),
    moveName: cell(m.name),
    power: cell(m.power),
    moveType: cell(m.type),
    pp: cell(m.pp),
  }))
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Extract the leading ":Name" that a specific-Pokemon query targets
function leadingIRI(q) {
  const m = q.match(/(:[A-Za-z0-9']+)\s+:(hasMove|evolvesTo)/)
  if (m) return m[1]
  // getEvolvedStats form: ":Charmeleon rdfs:label ?name"
  const m2 = q.match(/(:[A-Za-z0-9']+)\s+rdfs:label\s+\?name/)
  return m2 ? m2[1] : null
}

function isLegendary(iriShort) {
  return MOCK_DATA.legendaries.includes(iriShort)
}
function isStarter(iriShort) {
  return Object.values(MOCK_DATA.starters).flat().includes(iriShort)
}

// The main entry point — mirrors what useSparql returns (an array of bindings)
export function mockQuery(rawQuery) {
  const q = rawQuery

  // 1) Type effectiveness (BIND with isSuperEffectiveAgainst inside)
  if (q.includes('BIND(') && q.includes('isSuperEffectiveAgainst')) {
    const m = q.match(/(:[A-Za-z]+)\s+:isSuperEffectiveAgainst\s+(:[A-Za-z]+)/)
    const atk = m ? m[1].slice(1) : null
    const def = m ? m[2].slice(1) : null
    let result = 'normal'
    if (atk && def) {
      if ((MOCK_DATA.typeEffectiveness.super[atk] || []).includes(def)) result = 'super'
      else if ((MOCK_DATA.typeEffectiveness.half[atk] || []).includes(def)) result = 'half'
      else if ((MOCK_DATA.typeEffectiveness.none[atk] || []).includes(def)) result = 'none'
    }
    return [{ result: cell(result) }]
  }

  // 2) Opponent AI: super effective move
  if (q.includes(':hasMove') && q.includes('isSuperEffectiveAgainst') && !q.includes('BIND(')) {
    const iri = leadingIRI(q)
    const typeMatch = q.match(/:isSuperEffectiveAgainst\s+(:[A-Za-z]+)/)
    const playerType = typeMatch ? typeMatch[1].slice(1) : null
    const p = P[iri]
    if (!p || !playerType) return []
    // find moves whose type is super effective vs playerType
    const eff = (t) => (MOCK_DATA.typeEffectiveness.super[t] || []).includes(playerType)
    const candidates = p.moves.filter(m => eff(m.type)).sort((a, b) => b.power - a.power)
    if (!candidates.length) return []
    const best = candidates[0]
    return [{
      move: cell('http://www.uni-bremen.de/akr/pokedex#' + best.name.replace(/\s/g, '')),
      moveName: cell(best.name),
      power: cell(best.power),
    }]
  }

  // 3) getMoves / getEvolvedMoves (hasMove + pp + moveType)
  if (q.includes(':hasMove') && q.includes('?pp') && q.includes('?moveType')) {
    const iri = leadingIRI(q)
    const p = P[iri]
    return p ? moveRows(p) : []
  }

  // 4) getBestMove (hasMove + power, no pp, no moveType, no effectiveness)
  if (q.includes(':hasMove') && q.includes('?power') && !q.includes('?pp') && !q.includes('?moveType')) {
    const iri = leadingIRI(q)
    const p = P[iri]
    if (!p || !p.moves.length) return []
    const best = [...p.moves].sort((a, b) => b.power - a.power)[0]
    return [{
      move: cell('http://www.uni-bremen.de/akr/pokedex#' + best.name.replace(/\s/g, '')),
      moveName: cell(best.name),
      power: cell(best.power),
    }]
  }

  // 5) checkEvolution
  if (q.includes(':evolvesTo')) {
    const iri = leadingIRI(q)
    const p = P[iri]
    if (!p || !p.evolvesTo) return []
    const evo = P[p.evolvesTo]
    if (!evo) return []
    return [{
      evolved: cell('http://www.uni-bremen.de/akr/pokedex#' + evo.iriShort.slice(1)),
      evolvedName: cell(evo.name),
    }]
  }

  // 6) getStarters (belongsToCategory :Starter + FILTER IN)
  if (q.includes(':belongsToCategory :Starter') && q.includes('FILTER(?num IN')) {
    const m = q.match(/FILTER\(\?num IN \(([^)]+)\)/)
    const nums = m ? m[1].split(',').map(s => parseInt(s.trim(), 10)) : []
    return ALL.filter(p => nums.includes(p.num)).map(pokemonRow)
  }

  // 7) getRandomTeam (NOT EXISTS Starter, NOT EXISTS Legendary, range)
  if (q.includes('FILTER NOT EXISTS') && q.includes(':Starter')) {
    const rng = q.match(/\?num >= (\d+) && \?num <= (\d+)/)
    const lo = rng ? +rng[1] : 1, hi = rng ? +rng[2] : 386
    const pool = ALL.filter(p =>
      p.num >= lo && p.num <= hi && !isStarter(p.iriShort) && !isLegendary(p.iriShort))
    return shuffle(pool).slice(0, 5).map(pokemonRow)
  }

  // 8) getLegendaryBoss (belongsToCategory :Legendary, no NOT EXISTS)
  if (q.includes(':belongsToCategory :Legendary')) {
    const legs = MOCK_DATA.legendaries.map(i => P[i]).filter(Boolean)
    return [pokemonRow(shuffle(legs)[0])]
  }

  // 9) getOpponent (nationalNumber range + LIMIT 1)
  if (q.includes('?num >=') && q.includes('LIMIT 1')) {
    const rng = q.match(/\?num >= (\d+) && \?num <= (\d+)/)
    const lo = rng ? +rng[1] : 1, hi = rng ? +rng[2] : 130
    const pool = ALL.filter(p => p.num >= lo && p.num <= hi)
    return [pokemonRow(shuffle(pool)[0])]
  }

  // 10) getEvolvedStats (specific pokemon, baseHP, no hasMove)
  if (q.includes('?name') && q.includes('?hp') && !q.includes(':hasMove')) {
    const iri = leadingIRI(q)
    const p = P[iri]
    if (!p) return []
    const row = pokemonRow(p)
    // getEvolvedStats selects name/hp/attack/defense/num/types (no ?pokemon needed)
    return [row]
  }

  console.warn('[mockEngine] Unrecognized query, returning empty:\n', q)
  return []
}
