import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validDate, shiftDate, weekDates, workItems, workGroup } from '../src/lib/planning.js'
import { addMissingIngredients } from '../src/lib/groceryPlanning.js'
import { assignedTasksFor, assignedOpenTasksFor } from '../src/features/kids/kidsUtils.js'

test('dates reject malformed inputs and handle month/year boundaries', () => {
  assert.equal(validDate('2026-02-30'), false)
  assert.equal(validDate('2026-09-02'), true)
  assert.equal(validDate(null), false)
  assert.equal(shiftDate('2026-12-31', 1), '2027-01-01')
  assert.deepEqual(weekDates('2026-09-02'), [
    '2026-08-30',
    '2026-08-31',
    '2026-09-01',
    '2026-09-02',
    '2026-09-03',
    '2026-09-04',
    '2026-09-05',
  ])
})
test('one-time and repeating work share dated groups without changing source data', () => {
  const items = workItems(
    [{ id: 't', text: 'Form', dueDate: null }],
    [{ id: 'c', name: 'Bins', day: 'Monday' }],
    '2026-09-02',
  )
  assert.equal(workGroup(items[0], '2026-09-02'), 'Anytime')
  assert.equal(workGroup({ ...items[1], done: true }, '2026-09-02'), 'Completed')
})
test('a late weekly chore is separated from a genuinely overdue one-time task', () => {
  // Wednesday 2026-09-02: the Monday chore recurs weekly and resets by hand,
  // so it must not sit in Overdue next to a task whose real due date passed.
  const [task, chore] = workItems(
    [{ id: 't', text: 'Permission slip', dueDate: '2026-08-31' }],
    [{ id: 'c', name: 'Bins', day: 'Monday' }],
    '2026-09-02',
  )
  assert.equal(workGroup(task, '2026-09-02'), 'Overdue')
  assert.equal(workGroup(chore, '2026-09-02'), 'Earlier this week')
  assert.equal(workGroup({ ...chore, date: '2026-09-02' }, '2026-09-02'), 'Today')
})
test('undated child tasks stay visible rather than disappearing after creation', () => {
  const tasks = [{ id: 'a', text: 'Read', assignee: 'Liam', dueDate: null, done: false }]
  assert.equal(assignedTasksFor(tasks, 'Liam').length, 1)
  assert.equal(assignedOpenTasksFor(tasks, 'Liam').length, 1)
  assert.equal(assignedTasksFor(tasks, 'Livi').length, 0)
})
test('adding meal ingredients preserves manual items, quantities, IDs, and checks', () => {
  const existing = [
    { id: 'mine', name: 'Milk', amount: '2 cartons', manual: true, checked: true },
    { id: 'paper', name: 'Paper towels', checked: false },
  ]
  const generated = [
    { id: 'ing-milk', name: ' milk ', amount: '1 cup', checked: false },
    { id: 'rice', name: 'Rice', checked: false },
    { id: 'rice2', name: 'RICE' },
  ]
  const result = addMissingIngredients(existing, generated)
  assert.equal(result.length, 3)
  assert.deepEqual(result.slice(0, 2), existing)
  assert.equal(result[2].name, 'Rice')
  assert.deepEqual(addMissingIngredients(result, generated), result)
  assert.equal(existing.length, 2)
})
