import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Global styles first so feature stylesheets (imported by the pages below)
// come later in the cascade and can override base component styles.
import './styles/tokens.css'
import './styles/base.css'
import App from './App.jsx'
import { AuthProvider } from './state/AuthContext.jsx'
import { SettingsProvider } from './state/SettingsContext.jsx'
import { MembersProvider } from './state/MembersContext.jsx'
import { RecipesProvider } from './state/RecipesContext.jsx'
import { AislesProvider } from './state/AislesContext.jsx'
import { MealsProvider } from './state/MealsContext.jsx'
import { TodosProvider } from './state/TodosContext.jsx'
import { TodoListsProvider } from './state/TodoListsContext.jsx'
import { ChoresProvider } from './state/ChoresContext.jsx'
import { EventsProvider } from './state/EventsContext.jsx'
import { RewardsProvider } from './state/RewardsContext.jsx'
import { KidPointsProvider } from './state/KidPointsContext.jsx'
import { GroceryProvider } from './state/GroceryContext.jsx'
import { TurnsProvider } from './state/TurnsContext.jsx'
import { installErrorReporter } from './lib/errorReporter.js'

installErrorReporter()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
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
                                <TurnsProvider>
                                  <App />
                                </TurnsProvider>
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
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
