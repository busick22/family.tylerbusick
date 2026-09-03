import { readFileSync } from 'node:fs'
import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { setWorkCompletion } from '../src/lib/workCompletion.js'

let env, parent, stranger
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-family-planning', firestore: { host: '127.0.0.1', port: 8088, rules: readFileSync(new URL('../firestore.shared.rules', import.meta.url), 'utf8') } })
  parent = env.authenticatedContext('parent', { email: 'busick22@gmail.com', email_verified: true }).firestore()
  stranger = env.unauthenticatedContext().firestore()
})
beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    await setDoc(doc(db, 'todos', 'task'), { text: 'Read', assignee: 'Liam', points: 3, done: false })
    await setDoc(doc(db, 'chores', 'chore'), { name: 'Feed dog', day: 'Wednesday', assignee: 'Liam', points: 5, done: false })
  })
})
after(() => env?.cleanup())
async function history() { return (await getDoc(doc(parent, 'kidPoints', 'Liam'))).data()?.history || [] }
for (const kind of ['task', 'chore']) {
  test(kind + ': parent and child completion award once, and undo revokes once', async () => {
    await setWorkCompletion(parent, kind, kind, true, 'Tyler')
    assert.equal((await history()).length, 1)
    await setWorkCompletion(parent, kind, kind, true, 'Liam')
    assert.equal((await history()).length, 1)
    await setWorkCompletion(parent, kind, kind, false, 'Tyler')
    assert.equal((await history()).length, 0)
    await setWorkCompletion(parent, kind, kind, false, 'Liam')
    assert.equal((await history()).length, 0)
    await setWorkCompletion(parent, kind, kind, true, 'Liam')
    assert.equal((await history()).length, 1)
  })
}
test('concurrent taps cannot double award', async () => {
  await Promise.all([setWorkCompletion(parent, 'task', 'task', true, 'Liam'), setWorkCompletion(parent, 'task', 'task', true, 'Tyler')])
  assert.equal((await history()).length, 1)
})
test('shared work awards the selected child, not an arbitrary assignee', async () => {
  await setDoc(doc(parent, 'todos', 'shared'), { text: 'Extra help', assignee: 'Kids', points: 4, done: false })
  await setWorkCompletion(parent, 'task', 'shared', true, 'Livi')
  assert.equal((await history()).length, 0)
  assert.equal((await getDoc(doc(parent, 'kidPoints', 'Livi'))).data().history[0].points, 4)
  await setWorkCompletion(parent, 'task', 'shared', false, 'Tyler')
  assert.equal((await getDoc(doc(parent, 'kidPoints', 'Livi'))).data().history.length, 0)
})
test('undo clears the same task undo-window fields for parents and kids', async () => {
  await setWorkCompletion(parent, 'task', 'task', true, 'Liam')
  await setWorkCompletion(parent, 'task', 'task', false, 'Tyler')
  const data = (await getDoc(doc(parent, 'todos', 'task'))).data()
  assert.equal(data.done, false)
  assert.equal(data.pendingDoneUntil, null)
  assert.equal(data.pendingDoneBy, '')
})
test('unapproved users cannot complete family work or receive points', async () => {
  await assertFails(setWorkCompletion(stranger, 'chore', 'chore', true, 'Liam'))
  assert.equal((await history()).length, 0)
})
test('a deleted item fails without creating an award', async () => {
  await assert.rejects(setWorkCompletion(parent, 'task', 'removed', true, 'Liam'), /removed/)
  assert.equal((await history()).length, 0)
})
