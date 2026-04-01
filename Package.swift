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
        )
    ]
)
