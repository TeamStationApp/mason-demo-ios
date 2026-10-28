import SwiftUI

struct ContentView: View {
  private let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "?"

  var body: some View {
    VStack(spacing: 12) {
      Text("Built by Mason")
        .font(.largeTitle.bold())
      Text("Build \(build)")
        .font(.title2)
        .foregroundStyle(.secondary)
    }
    .padding()
  }
}

#Preview {
  ContentView()
}
