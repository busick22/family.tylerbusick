import { MembersProvider } from './MembersContext.jsx'
import { RecipesProvider } from './RecipesContext.jsx'
import { AislesProvider } from './AislesContext.jsx'
import { MealsProvider } from './MealsContext.jsx'
import { TodosProvider } from './TodosContext.jsx'
import { TodoListsProvider } from './TodoListsContext.jsx'
import { ChoresProvider } from './ChoresContext.jsx'
import { EventsProvider } from './EventsContext.jsx'
import { RewardsProvider } from './RewardsContext.jsx'
import { KidPointsProvider } from './KidPointsContext.jsx'
import { ScreenTimeProvider } from './ScreenTimeContext.jsx'
import { GroceryProvider } from './GroceryContext.jsx'
import { TurnsProvider } from './TurnsContext.jsx'

export default function FamilyDataProviders({ children }) {
  return (
    <MembersProvider>
      <RecipesProvider>
        <AislesProvider>
          <MealsProvider>
            <TodosProvider>
              <TodoListsProvider>
                <ChoresProvider>
                  <EventsProvider>
                    <GroceryProvider>
                      <RewardsProvider>
                        <KidPointsProvider>
                          <ScreenTimeProvider>
                            <TurnsProvider>
                              {children}
                            </TurnsProvider>
                          </ScreenTimeProvider>
                        </KidPointsProvider>
                      </RewardsProvider>
                    </GroceryProvider>
                  </EventsProvider>
                </ChoresProvider>
              </TodoListsProvider>
            </TodosProvider>
          </MealsProvider>
        </AislesProvider>
      </RecipesProvider>
    </MembersProvider>
  )
}

