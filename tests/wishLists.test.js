import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeStoreLink, storeLink, wishFields, wishListName, wishPrice } from '../src/lib/wishLists.js'

test('store links accept pasted hostnames and block executable schemes and credentials', () => {
  assert.equal(storeLink('example.com/toy'), 'https://example.com/toy')
  for (const link of ['javascript:alert(1)', 'data:text/html,hello', 'file:///etc/passwd', 'https://user:pass@example.com/', 'not a link']) {
    assert.equal(safeStoreLink(link), '')
    assert.throws(() => storeLink(link))
  }
})

test('optional prices distinguish zero from blank and reject negative/infinite values', () => {
  assert.equal(wishPrice(''), null)
  assert.equal(wishPrice('0'), 0)
  assert.equal(wishPrice('19.99'), 19.99)
  assert.equal(wishPrice('1.005'), 1.01)
  for (const value of ['oops', -1, Infinity, 1000000]) assert.throws(() => wishPrice(value))
})

test('wish data contains only public fields, normalizes whitespace, and bounds content', () => {
  assert.deepEqual(wishFields({ name: ' Bike ', notes: ' Blue ', link: '', price: '', purchasedBy: 'Grandma', purchased: true }), {
    name: 'Bike', notes: 'Blue', link: '', price: null,
  })
  assert.equal(wishListName(' Christmas '), 'Christmas')
  assert.throws(() => wishListName('   '))
  assert.throws(() => wishListName('a'.repeat(81)))
  assert.throws(() => wishFields({ name: '  ' }))
  assert.throws(() => wishFields({ name: 'Toy', notes: 'a'.repeat(1001) }))
})
