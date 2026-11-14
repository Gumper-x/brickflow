import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const cli = fileURLToPath(new URL('../../index.mjs', import.meta.url))

test('scans TypeScript generics and configured Nuxt component prefixes', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'brick-component-unused-'))
  const put = (name, content) => {
    const file = path.join(root, name)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, content)
  }

  try {
    put(
      'nuxt.config.ts',
      "export default defineNuxtConfig({ components: [{ path: '~/components', prefix: 'Brand' }] })",
    )
    put('components/Card/index.vue', '<template><div>Card</div></template>')
    put('components/Widget/index.client.vue', '<template><div>Widget</div></template>')
    put('pages/index.vue', '<template><BrandCard /><BrandWidget /></template>')
    put('utils/checkup.ts', 'export const isPresent = <T>(value: T): value is NonNullable<T> => value != null')

    const output = execFileSync(process.execPath, [cli, 'component-unused', '--root', root], { encoding: 'utf8' })
    assert.match(output, /Components\s+2/)
    assert.match(output, /Used\s+2/)
    assert.match(output, /Unused\s+0/)
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})
