// =============================================
// LoseScreen.jsx (FULLY BUILT)
// =============================================
import { INITIAL_STATE } from '../state/gameState'
import PokemonCard from '../components/PokemonCard'

export default function LoseScreen({ gameState, setGameState }) {
  const again = () => setGameState(INITIAL_STATE)
  return (
    <div className="screen gap24">
      <h1 className="game-title" style={{ fontSize: 26, color: '#f85838' }}>GAME OVER</h1>
      <p className="mono" style={{ fontSize: 24, color: '#fff' }}>
        {gameState.trainerName} fell at Round {gameState.round}
      </p>
      <p className="pixel" style={{ fontSize: 10, color: '#8fb4e8' }}>
        BETTER LUCK NEXT RUN
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: '100%', maxWidth: 680 }}>
        {gameState.team.map((p, i) => <PokemonCard key={p.iri + i} pokemon={p} />)}
      </div>
      <button className="btn btn-primary" style={{ fontSize: 12, padding: '16px 30px' }} onClick={again}>
        TRY AGAIN
      </button>
    </div>
  )
}
