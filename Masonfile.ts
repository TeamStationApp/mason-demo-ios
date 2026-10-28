import type { Setup, Stage } from '@mason/types'

const APP = 'app.teamstation.masondemo'

export function setup(m: Setup) {
  m.apiVersion(1)
  m.buildNumber(APP, { check: 'apple' })
  m.workflow('smoke', { triggers: [{ request: true }] }, (w) => {
    w.stage('hello', { on: 'linux', run: hello })
  })
  m.stage('ios', {
    on: { type: 'mac-xcode' },
    tools: { xcode: '>=26' },
    apple: { distribution: 'adHoc', app: APP },
    publishes: [APP],
    run: buildIos,
  })
}

export async function hello(ctx: Stage) {
  await ctx.sh('mkdir -p out && date -u > out/hello.txt')
  await ctx.artifacts.save('hello', ['out/hello.txt'])
}

export async function buildIos(ctx: Stage) {
  const build = ctx.getBuildNumber(APP)
  const result = await ctx.apple.archive({
    project: 'MasonDemo.xcodeproj',
    scheme: 'MasonDemo',
    configuration: 'Release',
    version: '1.0.0',
    buildNumber: build,
  })
  if (result.ipa == null) throw new Error('No IPA was exported')
  await ctx.publish({ app: APP, platform: 'ios', path: result.ipa, buildNumber: build })
}
