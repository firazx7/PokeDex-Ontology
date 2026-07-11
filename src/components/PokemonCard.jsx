// =============================================
// PokemonCard.jsx — Pokemon Display Card
// =============================================
// Shows a Pokemon's sprite, name, types, and HP bar.
// Used on team preview, battle screen, evolution screen.
//
// USAGE:
//   <PokemonCard pokemon={pokemonObject} />
//   <PokemonCard pokemon={pokemonObject} selected onClick={handleClick} />
//   <PokemonCard pokemon={pokemonObject} large />  // bigger for battle

import TypeBadge from './TypeBadge'
import HPBar from './HPBar'
import { getSpriteUrl } from '../state/gameState'

export default function PokemonCard({
  pokemon,
  selected = false,
  onClick = null,
  large = false,
  showHP = true,
}) {
  if (!pokemon) return null

  const spriteUrl = getSpriteUrl(pokemon.nationalNum, true)
  const imgSize = large ? 120 : 80
  const fainted = pokemon.fainted

  return (
    <div
      onClick={!fainted && onClick ? onClick : undefined}
      style={{
        background: selected
          ? 'rgba(42, 117, 187, 0.3)'
          : fainted
          ? 'rgba(255,255,255,0.03)'
          : 'rgba(255,255,255,0.07)',
        border: selected
          ? '2px solid #2A75BB'
          : fainted
          ? '2px solid rgba(255,255,255,0.1)'
          : '2px solid rgba(255,255,255,0.15)',
        borderRadius: '12px',
        padding: '12px',
        cursor: onClick && !fainted ? 'pointer' : 'default',
        opacity: fainted ? 0.4 : 1,
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {/* Sprite */}
      <img
        src={spriteUrl}
        alt={pokemon.name}
        width={imgSize}
        height={imgSize}
        style={{
          imageRendering: 'pixelated',
          filter: fainted ? 'grayscale(100%)' : 'none',
        }}
        onError={(e) => {
          // Fallback to static PNG if animated GIF not available
          e.target.src = getSpriteUrl(pokemon.nationalNum, false)
        }}
      />

      {/* Name */}
      <div style={{
        fontWeight: 700,
        fontSize: large ? '16px' : '13px',
        color: fainted ? '#666' : 'white',
        textAlign: 'center',
      }}>
        {fainted ? `${pokemon.name} ✗` : pokemon.name}
      </div>

      {/* Type badges */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {pokemon.types.map(type => (
          <TypeBadge key={type} type={type} small={!large} />
        ))}
      </div>

      {/* HP Bar */}
      {showHP && !fainted && (
        <div style={{ width: '100%' }}>
          <HPBar currentHP={pokemon.currentHP} maxHP={pokemon.maxHP} />
        </div>
      )}
    </div>
  )
}
