// =============================================
// EvolutionScreen.jsx (FULLY BUILT)
// =============================================
// RULE: only ONE Pokemon may evolve per round.
// Once a Pokemon has evolved, all other evolve buttons are locked
// for this round. Evolving restores that Pokemon to full HP.

import { useEffect, useState } from 'react'
import { PHASES, parsePokemon, parseMove } from '../state/gameState'
import { useSparql } from '../hooks/useSparql'
import { QUERIES } from '../hooks/queries'
import PokemonCard from '../components/PokemonCard'

export default function EvolutionScreen({ gameState, setGameState }) {
  const { query } = useSparql()
  const [team, setTeam] = useState(gameState.team)
  const [evoData, setEvoData] = useState({})
  const [loading, setLoading] = useState(true)
  const [evolving, setEvolving] = useState(null)
  // Once set, the player has used up this round's single evolution.
  const [evolvedThisRound, setEvolvedThisRound] = useState(null) // stores the name
  const [evolvedIndex, setEvolvedIndex] = useState(null)          // which slot evolved

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const data = {}
      for (let i = 0; i < team.length; i++) {
        if (team[i].fainted) continue
        const rows = await query(QUERIES.checkEvolution(team[i].iriShort))
        if (rows.length > 0) {
          data[i] = { evolvedIRI: rows[0].evolved.value, evolvedName: rows[0].evolvedName.value }
        }
      }
      if (!cancelled) { setEvoData(data); setLoading(false) }
    }
    check()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const evolve = async (index) => {
    const evo = evoData[index]
    // Blocked if: no evolution, one already in progress, or one already used this round
    if (!evo || evolving !== null || evolvedThisRound) return

    setEvolving(index)
    const fromName = team[index].name
    const shortIRI = `:${evo.evolvedIRI.split('#')[1]}`
    const statRows = await query(QUERIES.getEvolvedStats(shortIRI))
    const evolved = parsePokemon(statRows[0], evo.evolvedIRI)
    const moveRows = await query(QUERIES.getEvolvedMoves(shortIRI))
    evolved.moves = moveRows.map(parseMove)   // full HP already set by parsePokemon
    setTeam(prev => prev.map((p, i) => i === index ? evolved : p))
    setEvolvedThisRound(`${fromName} → ${evolved.name}`)
    setEvolvedIndex(index)
    setEvolving(null)
  }

  const cont = () => {
    if (gameState.round >= 10) {
      setGameState(prev => ({ ...prev, team, phase: PHASES.WIN }))
    } else {
      setGameState(prev => ({
        ...prev, team, round: prev.round + 1,
        currentOpponent: null, activeIndex: null, phase: PHASES.BATTLE,
      }))
    }
  }

  if (loading) {
    return <div className="screen"><p className="blink pixel" style={{ fontSize: 11, color: '#cdd7ee' }}>checking evolutions...</p></div>
  }

  const any = Object.keys(evoData).length > 0

  // Headline text depends on state
  let headline, headColor
  if (evolvedThisRound) {
    headline = `${evolvedThisRound} — healed to full HP!`
    headColor = '#58d858'
  } else if (any) {
    headline = 'Choose ONE Pokemon to evolve — it heals to full HP.'
    headColor = '#58d858'
  } else {
    headline = 'No evolutions available right now.'
    headColor = '#8fb4e8'
  }

  return (
    <div className="screen gap16">
      <h2 className="game-title" style={{ fontSize: 16 }}>EVOLUTION</h2>
      <p className="mono" style={{ fontSize: 22, color: headColor }}>{headline}</p>
      {any && !evolvedThisRound && (
        <p className="pixel" style={{ fontSize: 9, color: '#ffcb05' }}>ONE EVOLUTION PER ROUND</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', maxWidth: 720 }}>
        {team.map((p, i) => {
          const canEvolve = !!evoData[i]
          const locked = !!evolvedThisRound
          return (
            <div key={p.iri + i} className="stack gap8">
              <PokemonCard pokemon={p} />
              {canEvolve && !locked ? (
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 9, padding: '10px 6px' }}
                  disabled={evolving !== null}
                  onClick={() => evolve(i)}
                >
                  {evolving === i ? 'EVOLVING...' : `▶ ${evoData[i].evolvedName.toUpperCase()}`}
                </button>
              ) : (
                <div className="mono" style={{ fontSize: 16, color: evolvedIndex === i ? '#58d858' : '#5a6b8a', textAlign: 'center', padding: '8px' }}>
                  {p.fainted
                    ? 'fainted'
                    : evolvedIndex === i
                      ? '\u2713 evolved!'
                      : canEvolve && locked
                        ? 'locked this round'
                        : 'no evolution'}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button className="btn btn-primary" style={{ fontSize: 12, padding: '16px 30px' }} onClick={cont}>
        {gameState.round >= 10 ? 'FINISH THE RUN' : `CONTINUE — ROUND ${gameState.round + 1}`}
      </button>
    </div>
  )
}
