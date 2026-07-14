// =============================================
// typeColors.js — Authentic Gen-3 type colors
// =============================================
export const TYPE_COLORS = {
  Fire: '#F08030', Water: '#6890F0', Grass: '#78C850',
  Electric: '#F8D030', Ice: '#98D8D8', Fighting: '#C03028',
  Poison: '#A040A0', Ground: '#E0C068', Flying: '#A890F0',
  Psychic: '#F85888', Bug: '#A8B820', Rock: '#B8A038',
  Ghost: '#705898', Dragon: '#7038F8', Dark: '#705848',
  Steel: '#B8B8D0', Normal: '#A8A878', Fairy: '#EE99AC',
}
export function getTypeColor(typeName) {
  return TYPE_COLORS[typeName] || '#A8A878'
}
