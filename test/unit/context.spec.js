const { test, expect } = require('@playwright/test')
const proxyquire = require('proxyquire').noCallThru()
const sinon = require('sinon')

const mockElectron = require('./mocks/electron')
const mockLogger = require('./mocks/logger')
const mockNotify = require('./mocks/notify')

const testGetAndSet = async (ctx, propertyName, value) => {
  ctx.setProp(propertyName, value)
  const ctxVal = await ctx.getProp(propertyName)
  expect(ctxVal, `${String(propertyName)} should equal ${value} but is ${ctxVal}`).toEqual(value)
}

test.describe('App Context', () => {
  let ctx, getCtx
  test.beforeAll(async () => {
    getCtx = proxyquire('../../src/context', {
      electron: mockElectron(),
      './common/notify': mockNotify(),
      './common/logger': mockLogger()
    })
    ctx = getCtx()
  })

  test.afterAll(async () => {
    // ensure no hanging promises from the tests.
    expect(Promise.all([...ctx._promiseMap.values()])).resolves.toBeTruthy()
  })

  test('getCtx returns the same object', () => {
    expect(getCtx()).toEqual(getCtx())
  })

  test('Can set and get a number', async () => {
    await testGetAndSet(ctx, 'num', 4)
    await testGetAndSet(ctx, 'num', -1)
    await testGetAndSet(ctx, Symbol('numSymbol'), Infinity)
  })

  test('Can set and get a boolean', async () => {
    await testGetAndSet(ctx, 'bool', true)
    await testGetAndSet(ctx, 'bool', false)
    await testGetAndSet(ctx, Symbol('boolSymbol'), Infinity)
  })

  test('Can set and get an object', async () => {
    await testGetAndSet(ctx, 'obj', {
      foo: 'bar',
      4: 'four',
      apple: () => 'shenanigans'
    })
    await testGetAndSet(ctx, 'obj', { bar: 'foo', four: 4, shenanigans: () => 'apple' })
    await testGetAndSet(ctx, Symbol('objSymbol'), { bar: 'foo2', four: 42, shenanigans: () => 'apple2' })
  })

  test('Can set and get a function', async () => {
    await testGetAndSet(ctx, 'spyFn', sinon.spy())
    await testGetAndSet(ctx, Symbol('spyFnSymbol'), sinon.spy())
  })

  test('getProp can be called before setProp', async () => {
    let isPending = true
    const pendingValue = ctx.getProp('someProp').finally(() => {
      isPending = false
    })
    expect(isPending).toBe(true)
    expect(pendingValue).resolves.toBe(123)
    ctx.setProp('someProp', 123)
    await pendingValue
    expect(isPending).toBe(false)
  })
})
