import ComingSoon from '../../components/ComingSoon.jsx'

export default function MealsPage() {
  return (
    <div className="page page-enter" data-page="meals">
      <header className="page-head">
        <h1 className="page-title">Meals</h1>
      </header>
      <ComingSoon>
        The meal planner and recipe box are being rebuilt — this page is next in line. In the
        meantime the old version is still in the app&rsquo;s git history if you need it.
      </ComingSoon>
    </div>
  )
}
