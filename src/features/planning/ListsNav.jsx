import { NavLink } from 'react-router-dom'
import { ListChecks, ShoppingBasket } from 'lucide-react'
export default function ListsNav() {
  return (
    <nav className="section-nav" aria-label="Lists sections">
      <NavLink to="/lists" end>
        <ListChecks size={18} />
        To-dos
      </NavLink>
      <NavLink to="/lists/groceries">
        <ShoppingBasket size={18} />
        Groceries
      </NavLink>
    </nav>
  )
}
