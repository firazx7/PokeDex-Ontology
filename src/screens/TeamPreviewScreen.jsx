// =============================================
// TeamPreviewScreen.jsx (FULLY BUILT)
// =============================================
import { PHASES } from '../state/gameState'
import PokemonCard from '../components/PokemonCard'

export default function TeamPreviewScreen({ gameState, setGameState }) {
  const start = () => setGameState(prev => ({ ...prev, phase: PHASES.BATTLE }))
  return (
    <div className="screen gap24">
      <h2 className="game-title" style={{ fontSize: 16 }}>YOUR TEAM</h2>
      <p className="mono" style={{ fontSize: 22, color: '#8fb4e8' }}>
        Ready for the run, {gameState.trainerName}?
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', maxWidth: 680 }}>
        {gameState.team.map((p, i) => <PokemonCard key={p.iri + i} pokemon={p} showHP={false} />)}
      </div>
      <button className="btn btn-primary" style={{ fontSize: 13, padding: '16px 30px' }} onClick={start}>
        BEGIN — ROUND 1
      </button>
    </div>
  )
}
