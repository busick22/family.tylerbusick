import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './state/AuthContext.jsx'
import { SettingsProvider } from './state/SettingsContext.jsx'
import { MembersProvider } from './state/MembersContext.jsx'
import { MealsProvider } from './state/MealsContext.jsx'
import { TodosProvider } from './state/TodosContext.jsx'
import { ChoresProvider } from './state/ChoresContext.jsx'
import { EventsProvider } from './state/EventsContext.jsx'
import { GroceryProvider } from './state/GroceryContext.jsx'
import { TurnsProvider } from './state/TurnsContext.jsx'
import { installErrorReporter } from './lib/errorReporter.js'
import './styles/tokens.css'
import './styles/base.css'

installErrorReporter()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <MembersProvider>
            <MealsProvider>
              <TodosProvider>
                <ChoresProvider>
                  <EventsProvider>
                    <GroceryProvider>
                      <TurnsProvider>
                        <App />
                      </TurnsProvider>
                    </GroceryProvider>
                  </EventsProvider>
                </ChoresProvider>
              </TodosProvider>
            </MealsProvider>
          </MembersProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
