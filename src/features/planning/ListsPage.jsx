import ListsNav from './ListsNav.jsx'
import WorkPage from './WorkPage.jsx'
import GroceryTab from '../meals/GroceryTab.jsx'
import Notice, { useNotice } from '../../components/Notice.jsx'
import '../meals/meals.css'

export default function ListsPage({ grocery = false }) {
  const [notice, showNotice] = useNotice()
  if (!grocery) return <WorkPage />
  return <div className="page page-enter"><Notice notice={notice} /><header className="workspace-title"><h1>Lists</h1></header><ListsNav /><GroceryTab showNotice={showNotice} /></div>
}
