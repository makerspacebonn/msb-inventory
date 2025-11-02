// test/index.test.ts
import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { ZeugApp } from "../index";


describe('Elysia', () => {
    it('returns a response', async () => {

        const response = await ZeugApp
            .handle(new Request('http://localhost:3001/'))
        const html = await response.text()
        expect(response.headers.get('content-type')).toBe('text/html; charset=utf8')

        expect(html).toContain('MakerSpace Zeug und Aufgaben System')
    })
    it('Item Page', async () => {

        const response = await ZeugApp
            .handle(new Request('http://localhost:3001/i/1250'))
        const html = await response.text()
        expect(response.status).toBe(200)

        expect(html).toContain('So ein Teil vom MakerSpace')
    })
})