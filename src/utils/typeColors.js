// =============================================
// typeColors.js — Type to Color Mapping
// =============================================
// Returns the background color for each Pokemon type.
// Used in TypeBadge component.

export const TYPE_COLORS = {
  Fire:     '#FD7D24',
  Water:    '#4592C4',
  Grass:    '#9BCC50',
  Electric: '#EED535',
  Ice:      '#51C4E7',
  Fighting: '#D56723',
  Poison:   '#B97FC9',
  Ground:   '#F7DE3F',
  Flying:   '#3DC7EF',
  Psychic:  '#F366B9',
  Bug:      '#729F3F',
  Rock:     '#A38C21',
  Ghost:    '#7B62A3',
  Dragon:   '#53A4CF',
  Dark:     '#707070',
  Steel:    '#9EB7B8',
  Normal:   '#A4ACAF',
  Fairy:    '#FDB9E9',
}

export function getTypeColor(typeName) {
  return TYPE_COLORS[typeName] || '#A4ACAF'
}
