// Every shared-data context the signed-in app needs, in one place.
//
// This used to be a 13-level indented staircase of nested <Provider> tags,
// which grew by one level of indentation each time a collection was added.
// The order still matters — a provider can read the ones above it — so this
// is a list, applied outermost-first, rather than a set.

import { MembersProvider } from './MembersContext.jsx'
import { RecipesProvider } from './RecipesContext.jsx'
import { AislesProvider } from './AislesContext.jsx'
import { MealsProvider } from './MealsContext.jsx'
import { TodosProvider } from './TodosContext.jsx'
import { TodoListsProvider } from './TodoListsContext.jsx'
import { ChoresProvider } from './ChoresContext.jsx'
import { EventsProvider } from './EventsContext.jsx'
import { GroceryProvider } from './GroceryContext.jsx'
import { RewardsProvider } from './RewardsContext.jsx'
import { KidPointsProvider } from './KidPointsContext.jsx'
import { ScreenTimeProvider } from './ScreenTimeContext.jsx'
import { TurnsProvider } from './TurnsContext.jsx'

const PROVIDERS = [
  MembersProvider,
  RecipesProvider,
  AislesProvider,
  MealsProvider,
  TodosProvider,
  TodoListsProvider,
  ChoresProvider,
  EventsProvider,
  GroceryProvider,
  RewardsProvider,
  KidPointsProvider,
  ScreenTimeProvider,
  TurnsProvider,
]

export default function FamilyDataProviders({ children }) {
  return PROVIDERS.reduceRight((tree, Provider) => <Provider>{tree}</Provider>, children)
}
