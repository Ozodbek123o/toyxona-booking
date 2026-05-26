import test from 'node:test'
import assert from 'node:assert/strict'
import { advanceAmount, calculateTotal } from './price.js'

test('calculateTotal includes seats and selected services', () => {
	const hall = {
		pricePerSeat: 100000,
		services: {
			singers: [{ _id: 's1', price: 500000 }],
			karnaySurnay: { available: true, price: 200000 },
			cars: [{ _id: 'c1', price: 300000 }],
			menus: [{ _id: 'm1', price: 400000 }],
		},
	}

	assert.equal(
		calculateTotal(hall, 2, {
			singers: ['s1'],
			karnaySurnay: true,
			cars: ['c1'],
			menus: ['m1'],
		}),
		1600000,
	)
})

test('advanceAmount is 20 percent rounded', () => {
	assert.equal(advanceAmount(123456), 24691)
})
