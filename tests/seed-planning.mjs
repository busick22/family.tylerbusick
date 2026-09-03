// Local visual QA only. This file is never imported into the app/build.
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { todayStr, DAYS } from '../src/lib/family.js'
import { shiftDate, weekDates } from '../src/lib/planning.js'

const env = await initializeTestEnvironment({ projectId: 'demo-family-wishes', firestore: { host: '127.0.0.1', port: 8088 } })
try {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    const today = todayStr()
    const write = (collection, id, data) => setDoc(doc(db, collection, id), data)
    await write('settings', 'members', { list: ['Tyler', 'Liam', 'Livi', 'Spencer'] })
    await write('todoLists', 'planning-demo-school', { name: 'School', order: 1 })
    for (const [id, text, assignee, dueDate, points] of [
      ['form', 'Sign the field trip form', 'Tyler', today, 0],
      ['reading', 'Read for 20 minutes', 'Liam', today, 3],
      ['bag', 'Pack dance bag', 'Livi', today, 2],
      ['shoes', 'Find soccer shoes', 'Spencer', shiftDate(today, 1), 1],
      ['dentist', 'Book the dentist appointments', 'Tyler', shiftDate(today, -2), 0],
      ['library', 'Choose books for the weekend', 'Liam', null, 2],
    ]) await write('todos', 'planning-demo-' + id, { text, assignee, dueDate, points, done: false, listId: 'planning-demo-school', createdAt: serverTimestamp() })
    for (const [id, name, assignee] of [['dog', 'Feed the dog', 'Liam'], ['table', 'Set the table', 'Livi'], ['toys', 'Put away toys', 'Spencer']]) {
      await write('chores', 'planning-demo-' + id, { name, assignee, day: DAYS[new Date().getDay()], points: 2, done: false, completedAt: null, completedBy: '' })
    }
    for (const [id, title, time, who, location, date] of [
      ['pickup', 'School pickup', '15:15', ['Tyler'], 'Elementary school', today],
      ['soccer', 'Soccer practice', '17:30', ['Liam'], 'North field', today],
      ['dance', 'Dance class', '18:00', ['Livi'], 'Studio', shiftDate(today, 1)],
      ['family', 'Dinner with grandparents', '17:00', [], 'Grandma’s house', shiftDate(today, 3)],
    ]) await write('events', 'planning-demo-' + id, { title, time, who, location, date, createdAt: serverTimestamp() })
    const recipes = [
      { id: 'planning-demo-tacos', name: 'Chicken tacos', ingredients: [{ name: 'Chicken', amount: '1 lb' }, { name: 'Tortillas', amount: '8' }], notes: 'Cook the chicken with taco seasoning. Serve with warm tortillas and your favorite toppings.', prep: '10 min', cook: '20 min' },
      { id: 'planning-demo-pasta', name: 'Tomato & spinach pasta', ingredients: [{ name: 'Pasta', amount: '12 oz' }, { name: 'Spinach', amount: '2 cups' }], notes: 'Cook pasta. Warm the sauce, wilt the spinach, and toss together.' },
      { id: 'planning-demo-soup', name: 'Vegetable soup', ingredients: [{ name: 'Carrots', amount: '3' }], notes: 'Simmer vegetables in broth until tender.' },
    ]
    for (const recipe of recipes) await write('recipes', recipe.id, recipe)
    for (const [i, key] of weekDates(today).entries()) {
      if (i === 6) continue
      const recipe = recipes[i % recipes.length]
      await write('meals', key, { recipeId: recipe.id, recipeName: recipe.name, updatedAt: serverTimestamp() })
    }
    await write('grocery', 'current', { items: [{ id: 'planning-demo-milk', name: 'Milk', amount: '2 cartons', checked: false, manual: true, aisle: 'Dairy', sources: [] }, { id: 'planning-demo-apples', name: 'Apples', amount: '6', checked: true, manual: true, aisle: 'Produce', sources: [] }], selectedDays: [] })
    console.log('Seeded local demo-family-wishes only. No live project was accessed.')
  })
} finally { await env.cleanup() }
