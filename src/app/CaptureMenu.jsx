import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus, CheckCheck, ShoppingBasket, UtensilsCrossed, X, ArrowRight } from 'lucide-react'
import Modal from '../components/Modal.jsx'
import EventModal from '../features/planning/EventModal.jsx'
import WorkEditModal from '../features/planning/WorkEditModal.jsx'
import PlanDinnerModal from '../features/meals/PlanDinnerModal.jsx'
import { todayStr } from '../lib/family.js'

export default function CaptureMenu({ onClose }) {
  const [kind, setKind] = useState(null)
  const navigate = useNavigate()
  return (
    <>
      {!kind && (
        <Modal onClose={onClose}>
          <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
            <X />
          </button>
          <h2>Add something</h2>
          <div className="wayfinding">
            {[
              ['task', 'To-do', 'Task or reminder', CheckCheck],
              ['event', 'Event', 'Date, time, and people', CalendarPlus],
              ['grocery', 'Grocery item', 'Add it to the shared list', ShoppingBasket],
              ['dinner', 'Dinner', 'Recipe or meal idea', UtensilsCrossed],
            ].map(([value, label, description, Icon]) => (
              <button
                key={value}
                onClick={() => {
                  if (value === 'grocery') {
                    navigate('/lists/groceries')
                    onClose()
                  } else setKind(value)
                }}
              >
                <Icon size={24} />
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <ArrowRight size={18} />
              </button>
            ))}
          </div>
        </Modal>
      )}
      {kind === 'task' && <WorkEditModal item={{}} onClose={onClose} />}
      {kind === 'event' && <EventModal event={{ date: todayStr() }} onClose={onClose} />}
      {kind === 'dinner' && <PlanDinnerModal dateKey={todayStr()} onClose={onClose} />}
    </>
  )
}
