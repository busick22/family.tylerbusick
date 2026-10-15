import ListsNav from './ListsNav.jsx'
import WorkPage from './WorkPage.jsx'
import GroceryTab from '../meals/GroceryTab.jsx'
import './planning.css'

export default function ListsPage({ grocery = false }) {
  if (!grocery) return <WorkPage />
  return (
    <div className="page page-enter">
      <header className="workspace-title">
        <h1>Lists</h1>
      </header>
      <ListsNav />
      <GroceryTab />
    </div>
  )
}
