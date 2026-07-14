// =============================================
// queries.js — All SPARQL Queries
// =============================================
// All queries are tested and working against
// akr_ontology_kilic_rajput_v8.ttl
//
// IMPORTANT: Prefixes are added automatically
// by useSparql.js — do NOT add them here again.
//
// HOW TO USE:
//   import { QUERIES } from './queries'
//   const results = await query(QUERIES.getStarters(1))

export const QUERIES = {

  // ─────────────────────────────────────────
  // Q1: Load 3 starters for a generation
  // Returns: pokemon, name, hp, attack, defense, num, types
  // ─────────────────────────────────────────
  getStarters: (generation) => {
    // Starter national numbers per generation
    const starterNumbers = {
      1: '(1, 4, 7)',      // Bulbasaur, Charmander, Squirtle
      2: '(152, 155, 158)', // Chikorita, Cyndaquil, Totodile
      3: '(252, 255, 258)', // Treecko, Torchic, Mudkip
    }
    const nums = starterNumbers[generation]
    return `
      SELECT DISTINCT ?pokemon ?name ?hp ?attack ?defense ?num
             (GROUP_CONCAT(DISTINCT ?type; separator=",") AS ?types)
      WHERE {
        ?pokemon a :Pokemon ;
                 :belongsToCategory :Starter ;
                 :nationalNumber ?num ;
                 rdfs:label ?name ;
                 :hasType ?type ;
                 :baseHP ?hp ;
                 :baseAttack ?attack ;
                 :baseDefense ?defense .
        FILTER(?num IN ${nums})
      }
      GROUP BY ?pokemon ?name ?hp ?attack ?defense ?num
    `
  },

  // ─────────────────────────────────────────
  // Q2: Load 5 random team Pokemon (non-starters)
  // Returns: pokemon, name, hp, attack, defense, num, types
  // ─────────────────────────────────────────
  getRandomTeam: (generation) => {
    const ranges = {
      1: '?num >= 1 && ?num <= 151',
      2: '?num >= 152 && ?num <= 251',
      3: '?num >= 252 && ?num <= 386',
    }
    const range = ranges[generation]
    return `
      SELECT DISTINCT ?pokemon ?name ?hp ?attack ?defense ?num
             (GROUP_CONCAT(DISTINCT ?type; separator=",") AS ?types)
      WHERE {
        ?pokemon a :Pokemon ;
                 :nationalNumber ?num ;
                 rdfs:label ?name ;
                 :hasType ?type ;
                 :baseHP ?hp ;
                 :baseAttack ?attack ;
                 :baseDefense ?defense .
        FILTER(${range})
        FILTER NOT EXISTS { ?pokemon :belongsToCategory :Starter }
        FILTER NOT EXISTS { ?pokemon :belongsToCategory :Legendary }
      }
      GROUP BY ?pokemon ?name ?hp ?attack ?defense ?num
      ORDER BY RAND()
      LIMIT 5
    `
  },

  // ─────────────────────────────────────────
  // Q3: Draw random opponent by difficulty
  // difficulty: 'easy' | 'medium' | 'hard'
  // Returns: pokemon, name, hp, attack, defense, num, types
  // ─────────────────────────────────────────
  getOpponent: (difficulty) => {
    const ranges = {
      easy:   '?num >= 1   && ?num <= 130',
      medium: '?num >= 131 && ?num <= 250',
      hard:   '?num >= 251 && ?num <= 386',
    }
    const range = ranges[difficulty]
    return `
      SELECT DISTINCT ?pokemon ?name ?hp ?attack ?defense ?num
             (GROUP_CONCAT(DISTINCT ?type; separator=",") AS ?types)
      WHERE {
        ?pokemon a :Pokemon ;
                 :nationalNumber ?num ;
                 rdfs:label ?name ;
                 :hasType ?type ;
                 :baseHP ?hp ;
                 :baseAttack ?attack ;
                 :baseDefense ?defense .
        FILTER(${range})
      }
      GROUP BY ?pokemon ?name ?hp ?attack ?defense ?num
      ORDER BY RAND()
      LIMIT 1
    `
  },

  // ─────────────────────────────────────────
  // Q4: Draw random Legendary boss (Round 10)
  // Returns: pokemon, name, hp, attack, defense, num, types
  // ─────────────────────────────────────────
  getLegendaryBoss: () => `
    SELECT DISTINCT ?pokemon ?name ?hp ?attack ?defense ?num
           (GROUP_CONCAT(DISTINCT ?type; separator=",") AS ?types)
    WHERE {
      ?pokemon a :Pokemon ;
               :belongsToCategory :Legendary ;
               :nationalNumber ?num ;
               rdfs:label ?name ;
               :hasType ?type ;
               :baseHP ?hp ;
               :baseAttack ?attack ;
               :baseDefense ?defense .
    }
    GROUP BY ?pokemon ?name ?hp ?attack ?defense ?num
    ORDER BY RAND()
    LIMIT 1
  `,

  // ─────────────────────────────────────────
  // Q5: Load all moves for a Pokemon (with power only)
  // pokemonIRI: e.g. ':Charizard'
  // Returns: move, moveName, power, moveType, pp
  // Status moves (no power) are automatically excluded.
  // ─────────────────────────────────────────
  getMoves: (pokemonIRI) => `
    SELECT ?move ?moveName ?power ?moveType ?pp WHERE {
      ${pokemonIRI} :hasMove ?move .
      ?move rdfs:label ?moveName ;
            :hasMoveType ?typeEntity ;
            :pp ?pp ;
            :power ?power .
      ?typeEntity rdfs:label ?moveType .
    }
    ORDER BY DESC(?power)
    LIMIT 4
  `,

  // ─────────────────────────────────────────
  // Q6: Type effectiveness check
  // attackType: e.g. ':Water'
  // defenseType: e.g. ':Fire'
  // Returns: result = "super" | "half" | "none" | "normal"
  // ─────────────────────────────────────────
  getTypeEffectiveness: (attackType, defenseType) => `
    SELECT ?result WHERE {
      BIND(
        IF(EXISTS { ${attackType} :isSuperEffectiveAgainst ${defenseType} }, "super",
        IF(EXISTS { ${attackType} :isNotVeryEffectiveAgainst ${defenseType} }, "half",
        IF(EXISTS { ${attackType} :hasNoEffectOn ${defenseType} }, "none",
        "normal"))) AS ?result
      )
    }
  `,

  // ─────────────────────────────────────────
  // Q7: AI — best super effective move against player type
  // opponentIRI: e.g. ':Blastoise'
  // playerType: e.g. ':Grass'
  // Returns: move, moveName, power (or empty if none exists)
  // If empty: use Q8 (getBestMove) as fallback
  // ─────────────────────────────────────────
  getSuperEffectiveMove: (opponentIRI, playerType) => `
    SELECT ?move ?moveName ?power WHERE {
      ${opponentIRI} :hasMove ?move .
      ?move rdfs:label ?moveName ;
            :hasMoveType ?typeEntity ;
            :power ?power .
      ?typeEntity :isSuperEffectiveAgainst ${playerType} .
    }
    ORDER BY DESC(?power)
    LIMIT 1
  `,

  // ─────────────────────────────────────────
  // Q8: AI — fallback: strongest move regardless of type
  // opponentIRI: e.g. ':Blastoise'
  // Returns: move, moveName, power
  // ─────────────────────────────────────────
  getBestMove: (opponentIRI) => `
    SELECT ?move ?moveName ?power WHERE {
      ${opponentIRI} :hasMove ?move .
      ?move rdfs:label ?moveName ;
            :power ?power .
    }
    ORDER BY DESC(?power)
    LIMIT 1
  `,

  // ─────────────────────────────────────────
  // Q9: Check if a Pokemon can evolve
  // pokemonIRI: e.g. ':Charmander'
  // Returns: evolved (IRI), evolvedName (or empty if no evolution)
  // ─────────────────────────────────────────
  checkEvolution: (pokemonIRI) => `
    SELECT ?evolved ?evolvedName WHERE {
      ${pokemonIRI} :evolvesTo ?evolved .
      ?evolved rdfs:label ?evolvedName .
    }
  `,

  // ─────────────────────────────────────────
  // Q10: Load evolved Pokemon full stats
  // evolvedIRI: e.g. ':Charmeleon'
  // Returns: name, hp, attack, defense, num, types
  // ─────────────────────────────────────────
  getEvolvedStats: (evolvedIRI) => `
    SELECT DISTINCT ?name ?hp ?attack ?defense ?num
           (GROUP_CONCAT(DISTINCT ?type; separator=",") AS ?types)
    WHERE {
      ${evolvedIRI} rdfs:label ?name ;
                    :baseHP ?hp ;
                    :baseAttack ?attack ;
                    :baseDefense ?defense ;
                    :hasType ?type ;
                    :nationalNumber ?num .
    }
    GROUP BY ?name ?hp ?attack ?defense ?num
  `,

  // ─────────────────────────────────────────
  // Q11: Load evolved Pokemon moves
  // evolvedIRI: e.g. ':Charmeleon'
  // Returns: move, moveName, power, moveType, pp
  // ─────────────────────────────────────────
  getEvolvedMoves: (evolvedIRI) => `
    SELECT ?move ?moveName ?power ?moveType ?pp WHERE {
      ${evolvedIRI} :hasMove ?move .
      ?move rdfs:label ?moveName ;
            :hasMoveType ?typeEntity ;
            :pp ?pp ;
            :power ?power .
      ?typeEntity rdfs:label ?moveType .
    }
    ORDER BY DESC(?power)
    LIMIT 4
  `,
}
