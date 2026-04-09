// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "URight",
    defaultLocalization: "en",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "URightShared", targets: ["URightShared"])
    ],
    targets: [
        .target(
            name: "URightShared",
            path: "Sources/URightShared"
        ),
        .executableTarget(
            name: "ActionHandoffFixtureEmitter",
            dependencies: ["URightShared"],
            path: "tools/swift/action-handoff-fixture-emitter"
        ),
        .executableTarget(
            name: "RuntimeParityEmitter",
            dependencies: ["URightShared"],
            path: "tools/swift/runtime-parity-emitter"
        ),
        .testTarget(
            name: "URightSharedTests",
            dependencies: ["URightShared"],
            path: "Tests/URightSharedTests"
        )
    ]
)
