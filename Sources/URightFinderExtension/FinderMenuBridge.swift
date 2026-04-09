import AppKit
import Foundation
import URightShared

struct FinderMenuBinding {
    let menu: NSMenu
    let contextsByActionID: [String: FinderActionContext]
    let leafActionLabels: [String]
}

enum FinderMenuBridge {
    static func buildMenu(
        title: String = "U-Right",
        descriptors: [ActionDescriptor],
        context: FinderActionContext,
        target: AnyObject,
        action: Selector
    ) -> FinderMenuBinding {
        var contextsByActionID: [String: FinderActionContext] = [:]
        let menu = NSMenu(title: title)

        descriptors.forEach { descriptor in
            if let item = makeMenuItem(
                descriptor: descriptor,
                context: context,
                target: target,
                action: action,
                contextsByActionID: &contextsByActionID
            ) {
                menu.addItem(item)
            }
        }

        return FinderMenuBinding(
            menu: menu,
            contextsByActionID: contextsByActionID,
            leafActionLabels: leafActionLabels(for: descriptors)
        )
    }

    static func actionID(for sender: NSMenuItem) -> String {
        sender.toolTip ?? sender.identifier?.rawValue ?? sender.title
    }

    private static func makeMenuItem(
        descriptor: ActionDescriptor,
        context: FinderActionContext,
        target: AnyObject,
        action: Selector,
        contextsByActionID: inout [String: FinderActionContext]
    ) -> NSMenuItem? {
        if !descriptor.children.isEmpty {
            let parent = NSMenuItem(title: descriptor.title, action: nil, keyEquivalent: "")
            parent.image = NSImage(systemSymbolName: descriptor.systemImageName, accessibilityDescription: descriptor.title)
            let submenu = NSMenu(title: descriptor.title)
            descriptor.children.forEach { child in
                if let item = makeMenuItem(
                    descriptor: child,
                    context: context,
                    target: target,
                    action: action,
                    contextsByActionID: &contextsByActionID
                ) {
                    submenu.addItem(item)
                }
            }
            guard !submenu.items.isEmpty else { return nil }
            parent.submenu = submenu
            return parent
        }

        let item = NSMenuItem(title: badgeTitle(for: descriptor), action: action, keyEquivalent: "")
        item.target = target
        item.image = NSImage(systemSymbolName: descriptor.systemImageName, accessibilityDescription: descriptor.title)
        item.identifier = NSUserInterfaceItemIdentifier(descriptor.id)
        item.toolTip = descriptor.id
        item.isEnabled = descriptor.isEnabled
        contextsByActionID[descriptor.id] = context
        return item
    }

    private static func leafActionLabels(for descriptors: [ActionDescriptor]) -> [String] {
        descriptors.flatMap { descriptor in
            if descriptor.children.isEmpty {
                return [descriptor.title]
            }
            return leafActionLabels(for: descriptor.children)
        }
    }

    private static func badgeTitle(for descriptor: ActionDescriptor) -> String {
        if let badge = descriptor.statusBadge {
            return "\(descriptor.title)  [\(badge)]"
        }
        return descriptor.title
    }
}
