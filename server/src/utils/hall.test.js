import test from 'node:test'
import assert from 'node:assert/strict'
import { parseJsonField, normalizeDate } from './hall.js'

test('parseJsonField returns fallback for invalid JSON', () => {
	assert.deepEqual(parseJsonField('{bad', []), [])
})

test('normalizeDate strips time', () => {
	const date = normalizeDate('2026-05-25T15:45:00.000Z')
	assert.equal(date.getHours(), 0)
	assert.equal(date.getMinutes(), 0)
	assert.equal(date.getSeconds(), 0)
	assert.equal(date.getMilliseconds(), 0)
})
