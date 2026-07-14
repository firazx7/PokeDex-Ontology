// =============================================
// RoundSummaryScreen.jsx (FULLY BUILT)
// =============================================
import { PHASES, getSpriteUrl } from '../state/gameState'
import PokemonCard from '../components/PokemonCard'

export default function RoundSummaryScreen({ gameState, setGameState }) {
  const s = gameState.roundSummary || {}
  const next = () => setGameState(prev => ({ ...prev, phase: PHASES.EVOLUTION }))
  const living = gameState.team.filter(p => !p.fainted).length

  return (
    <div className="screen gap16">
      <div className="round-pill">ROUND {s.round} CLEAR</div>
      <h2 className="game-title" style={{ fontSize: 18, color: s.wasBoss ? 'var(--yellow)' : '#fff' }}>
        {s.wasBoss ? 'BOSS DEFEATED!' : 'VICTORY'}
      </h2>

      {s.opponentNum && (
        <div className="stack center gap8">
          <img src={getSpriteUrl(s.opponentNum, false)} alt={s.opponentName}
               width={96} height={96} style={{ imageRendering: 'pixelated', filter: 'grayscale(55%)' }} />
          <p className="mono" style={{ fontSize: 22, color: '#8fb4e8' }}>{s.opponentName} fainted</p>
        </div>
      )}

      <p className="pixel" style={{ fontSize: 10, color: living <= 2 ? '#f85838' : '#58d858' }}>
        {living} / 6 POKEMON STANDING
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: '100%', maxWidth: 680 }}>
        {gameState.team.map((p, i) => <PokemonCard key={p.iri + i} pokemon={p} />)}
      </div>

      <button className="btn btn-primary" style={{ fontSize: 12, padding: '16px 30px' }} onClick={next}>
        CONTINUE
      </button>
    </div>
  )
}
