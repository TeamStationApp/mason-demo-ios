import type { Setup, Stage } from '@mason/types'

const APP = 'app.teamstation.masondemo'

export function setup(m: Setup) {
  m.apiVersion(1)
  m.buildNumber(APP, { check: 'apple' })
  m.workflow('ping', { triggers: [{ request: true }] }, (w) => {
    w.stage('ping', { on: 'linux', run: ping })
  })
  m.workflow('smoke', { triggers: [{ request: true }] }, (w) => {
    w.stage('hello', { on: 'linux', run: hello })
  })
  m.workflow('mac', { triggers: [{ request: true }] }, (w) => {
    w.stage('simulator', { on: { type: 'mac-xcode' }, tools: { xcode: '>=26' }, run: simulatorBuild })
  })
  // React Native: the Node.js from .nvmrc runs npm, CocoaPods and Xcode's bundling phase.
  m.workflow('rn', { triggers: [{ request: true }] }, (w) => {
    w.stage('rn', {
      on: { type: 'mac-xcode' },
      tools: { node: 'project', ruby: 'project', xcode: '>=26' },
      apple: { distribution: 'adHoc', app: APP },
      publishes: [APP],
      run: buildReactNative,
    })
  })
  // Each tool at the version the repository pins, side by side with others on the node.
  m.workflow('tools', { triggers: [{ request: true }] }, (w) => {
    const pinned = w.stage('pinned', { on: { type: 'linux-x86' }, tools: { python: 'project', go: 'project', rust: 'project' }, run: versions })
    w.stage('other', { needs: [pinned], on: { type: 'linux-x86' }, tools: { python: '3.12', go: '1.22' }, run: versions })
  })
  m.stage('ios', {
    on: { type: 'mac-xcode' },
    tools: { xcode: '>=26' },
    apple: { distribution: 'adHoc', app: APP },
    publishes: [APP],
    run: buildIos,
  })
}

export async function ping(ctx: Stage) {
  await ctx.sh('uname -a')
}

export async function hello(ctx: Stage) {
  await ctx.sh('mkdir -p out && date -u > out/hello.txt')
  await ctx.artifacts.save('hello', ['out/hello.txt'])
}

// An unsigned simulator build: a Mac with Xcode and no Apple setup.
export async function simulatorBuild(ctx: Stage) {
  await ctx.sh('xcodebuild -version')
  await ctx.sh(
    'xcodebuild -project MasonDemo.xcodeproj -scheme MasonDemo -configuration Debug -sdk iphonesimulator -derivedDataPath build CODE_SIGNING_ALLOWED=NO build',
  )
  await ctx.artifacts.save('simulator-app', 'build/Build/Products/Debug-iphonesimulator/MasonDemo.app/**')
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

export async function buildReactNative(ctx: Stage) {
  await ctx.sh('echo "stage node $(command -v node) $(node --version), NODE_BINARY=$NODE_BINARY"')
  await ctx.sh('npm ci', { cwd: 'react-native' })
  // CocoaPods from the Gemfile, on the .ruby-version Ruby.
  await ctx.sh('echo "stage ruby $(command -v ruby) $(ruby --version)"')
  await ctx.sh('bundle install', { cwd: 'react-native' })
  await ctx.sh('bundle exec pod install', { cwd: 'react-native/ios' })
  const build = ctx.getBuildNumber(APP)
  const result = await ctx.apple.archive({
    workspace: 'react-native/ios/MasonRn.xcworkspace',
    scheme: 'MasonRn',
    configuration: 'Release',
    version: '1.0.0',
    buildNumber: build,
    output: 'build/rn',
  })
  // The bundling phase's .xcode.env prints the Node.js it runs.
  await ctx.sh('grep -h "MASON_NODE" build/rn/xcodebuild-archive.log | sort -u')
  if (result.ipa == null) throw new Error('No IPA was exported')
  await ctx.sh('unzip -l "$IPA" | grep main.jsbundle', { env: { IPA: result.ipa } })
  await ctx.publish({ app: APP, platform: 'ios', path: result.ipa, buildNumber: build })
}

export async function versions(ctx: Stage) {
  await ctx.sh('for t in python3 go cargo; do command -v $t >/dev/null && echo "$t: $(command -v $t) | $($t --version 2>&1 | head -1)"; done; true')
  await ctx.sh('go version')
}
