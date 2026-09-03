import { readFileSync } from 'node:fs'
import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, collectionGroup, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'

const SHARED = 'a'.repeat(20)
const PRIVATE = 'b'.repeat(20)
const REMOVED = 'c'.repeat(20)
let env
let parent
let visitor
let stranger

const listData = (extra = {}) => ({ kid: 'Liam', name: 'Birthday', shared: false, archived: false, createdAt: serverTimestamp(), ...extra })
const itemData = (extra = {}) => ({ name: 'Building set', link: 'https://example.com/toy', notes: 'Blue', price: 19.99, createdAt: serverTimestamp(), ...extra })
const list = (db, id = SHARED) => doc(db, 'wishLists', id)
const item = (db, id = SHARED, itemId = 'toy') => doc(db, 'wishLists', id, 'items', itemId)
const purchase = (db, id = SHARED, itemId = 'toy') => doc(db, 'wishLists', id, 'purchases', itemId)

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-family-wishes',
    firestore: { host: '127.0.0.1', port: 8088, rules: readFileSync(new URL('../firestore.shared.rules', import.meta.url), 'utf8') },
  })
  parent = env.authenticatedContext('parent', { email: 'busick22@gmail.com', email_verified: true }).firestore()
  visitor = env.unauthenticatedContext().firestore()
  stranger = env.authenticatedContext('stranger', { email: 'other@example.com', email_verified: true }).firestore()
})

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    for (const [id, extra] of [[SHARED, { shared: true }], [PRIVATE, {}], [REMOVED, { archived: true }]]) {
      await setDoc(list(db, id), listData(extra))
      await setDoc(item(db, id), itemData())
      await setDoc(purchase(db, id), { purchased: true, purchasedBy: 'Grandma', updatedAt: serverTimestamp() })
    }
    await setDoc(doc(db, 'todos', 'family-task'), { text: 'Private task' })
    await setDoc(doc(db, 'users', 'parent', 'tasks', 'one'), { text: 'Dashboard task' })
    await setDoc(doc(db, 'googleSecrets', 'parent__email'), { secret: 'fixture' })
  })
})

after(() => env?.cleanup())

test('a signed-out relative can open one enabled list and its public items', async () => {
  await assertSucceeds(getDoc(list(visitor)))
  const wishes = await assertSucceeds(getDocs(collection(visitor, 'wishLists', SHARED, 'items')))
  assert.equal(wishes.size, 1)
  assert.equal(wishes.docs[0].data().purchasedBy, undefined)
  await assertSucceeds(getDoc(item(visitor)))
})

test('public visitors cannot enumerate lists, even filtering for shared lists', async () => {
  await assertFails(getDocs(collection(visitor, 'wishLists')))
  await assertFails(getDocs(query(collection(visitor, 'wishLists'), where('shared', '==', true), where('archived', '==', false))))
  await assertFails(getDocs(collectionGroup(visitor, 'items')))
})

test('private and removed list content cannot be read, even with known IDs', async () => {
  for (const id of [PRIVATE, REMOVED]) {
    await assertFails(getDoc(list(visitor, id)))
    await assertFails(getDoc(item(visitor, id)))
    await assertFails(getDocs(collection(visitor, 'wishLists', id, 'items')))
  }
})

test('purchase documents and queries are inaccessible to visitors and other accounts', async () => {
  for (const db of [visitor, stranger]) {
    await assertFails(getDoc(purchase(db)))
    await assertFails(getDocs(collection(db, 'wishLists', SHARED, 'purchases')))
  }
  const result = await assertSucceeds(getDoc(purchase(parent)))
  assert.equal(result.data().purchasedBy, 'Grandma')
})

test('visitors cannot change lists, wishes, sharing, or gift tracking', async () => {
  for (const db of [visitor, stranger]) {
    await assertFails(updateDoc(list(db), { name: 'Changed' }))
    await assertFails(updateDoc(list(db), { shared: false }))
    await assertFails(setDoc(item(db, SHARED, 'new'), itemData()))
    await assertFails(updateDoc(item(db), { name: 'Changed' }))
    await assertFails(updateDoc(purchase(db), { purchasedBy: 'Someone else' }))
  }
})

test('family can create named lists, rename them, and add/edit wishes', async () => {
  const id = 'd'.repeat(20)
  await assertSucceeds(setDoc(list(parent, id), listData({ kid: 'Livi', name: 'Christmas' })))
  await assertSucceeds(updateDoc(list(parent, id), { name: 'Christmas ideas' }))
  await assertSucceeds(setDoc(item(parent, id), itemData({ price: null })))
  await assertSucceeds(updateDoc(item(parent, id), { price: 0, notes: 'Favorite color: red' }))
  const result = await assertSucceeds(getDocs(query(collection(parent, 'wishLists'), where('archived', '==', false))))
  assert.equal(result.size, 3)
})

test('public documents reject purchase fields and malformed content', async () => {
  await assertFails(updateDoc(list(parent), { purchasedBy: 'Grandma' }))
  await assertFails(updateDoc(item(parent), { purchased: true }))
  await assertFails(updateDoc(item(parent), { purchasedBy: 'Grandma' }))
  await assertFails(updateDoc(item(parent), { name: '' }))
  await assertFails(updateDoc(item(parent), { link: 'javascript:alert(1)' }))
  await assertFails(updateDoc(item(parent), { price: -1 }))
  await assertFails(updateDoc(item(parent), { notes: 'x'.repeat(1001) }))
  await assertFails(updateDoc(list(parent), { kid: 'Livi' }))
})

test('unverified parent email cannot access private wishes or purchases', async () => {
  const unverified = env.authenticatedContext('unverified', { email: 'busick22@gmail.com', email_verified: false }).firestore()
  await assertFails(getDoc(list(unverified, PRIVATE)))
  await assertFails(getDoc(purchase(unverified)))
  await assertFails(updateDoc(item(unverified), { name: 'Oops' }))
})

test('turning sharing off immediately revokes reads; re-enabling restores the same link', async () => {
  await assertSucceeds(updateDoc(list(parent), { shared: false }))
  await assertFails(getDoc(list(visitor)))
  await assertFails(getDoc(item(visitor)))
  await assertSucceeds(updateDoc(list(parent), { shared: true }))
  await assertSucceeds(getDoc(item(visitor)))
})

test('removing a list disables sharing and rejects late edits or reopening', async () => {
  await assertSucceeds(updateDoc(list(parent), { archived: true, shared: false }))
  await assertFails(getDoc(list(visitor)))
  await assertFails(getDoc(item(visitor)))
  await assertFails(getDoc(purchase(parent)))
  await assertFails(setDoc(item(parent, SHARED, 'late'), itemData()))
  await assertFails(updateDoc(list(parent), { archived: false }))
})

test('parents can privately mark, attribute, and clear purchases', async () => {
  await assertSucceeds(setDoc(purchase(parent), { purchased: true, purchasedBy: 'Aunt Amy', updatedAt: serverTimestamp() }))
  await assertSucceeds(setDoc(purchase(parent), { purchased: false, purchasedBy: '', updatedAt: serverTimestamp() }))
  await assertFails(setDoc(purchase(parent, SHARED, 'missing'), { purchased: true, purchasedBy: 'Grandma', updatedAt: serverTimestamp() }))
})

test('wish removal atomically clears its purchase note', async () => {
  const batch = writeBatch(parent)
  batch.delete(item(parent))
  batch.delete(purchase(parent))
  await assertSucceeds(batch.commit())
  assert.equal((await getDoc(item(parent))).exists(), false)
  assert.equal((await getDoc(purchase(parent))).exists(), false)
})

test('existing family/dashboard permissions are preserved and secrets stay blocked', async () => {
  await assertSucceeds(getDoc(doc(parent, 'todos', 'family-task')))
  await assertSucceeds(getDoc(doc(parent, 'users', 'parent', 'tasks', 'one')))
  await assertFails(getDoc(doc(stranger, 'users', 'parent', 'tasks', 'one')))
  await assertFails(getDoc(doc(visitor, 'todos', 'family-task')))
  await assertFails(getDoc(doc(parent, 'googleSecrets', 'parent__email')))
  await assertFails(getDoc(doc(visitor, 'googleSecrets', 'parent__email')))
})
