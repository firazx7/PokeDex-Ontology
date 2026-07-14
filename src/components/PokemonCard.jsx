// =============================================
// PokemonCard.jsx — Pokemon picker card (menu screens)
// =============================================
// Used on starter select, team preview, evolution, win/lose.
// For the actual battle scene, sprites are rendered directly
// in BattleScreen (not with this card).

import TypeBadge from './TypeBadge'
import HPBar from './HPBar'
import { getSpriteUrl } from '../state/gameState'

export default function PokemonCard({
  pokemon, selected = false, onClick = null, large = false, showHP = true,
}) {
  if (!pokemon) return null
  const size = large ? 96 : 72
  const fainted = pokemon.fainted
  const clickable = onClick && !fainted

  const cls = [
    'pcard',
    clickable ? 'pcard-click' : '',
    selected ? 'pcard-selected' : '',
    fainted ? 'pcard-fainted' : '',
  ].join(' ')

  return (
    <div className={cls} onClick={clickable ? onClick : undefined}>
      <img
        className="pcard-sprite"
        src={getSpriteUrl(pokemon.nationalNum, true)}
        alt={pokemon.name}
        width={size} height={size}
        style={{ filter: fainted ? 'grayscale(100%)' : 'none' }}
        onError={(e) => { e.target.src = getSpriteUrl(pokemon.nationalNum, false) }}
      />
      <div className="pcard-name">{fainted ? `${pokemon.name} ✗` : pokemon.name}</div>
      <div className="row gap8" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
        {pokemon.types.map(t => <TypeBadge key={t} type={t} />)}
      </div>
      {showHP && !fainted && <HPBar currentHP={pokemon.currentHP} maxHP={pokemon.maxHP} />}
    </div>
  )
}
