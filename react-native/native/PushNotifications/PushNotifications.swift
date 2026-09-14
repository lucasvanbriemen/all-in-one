import Foundation
import React
import UserNotifications

#if canImport(UIKit)
import UIKit
#else
import AppKit
#endif

// Registers the app for remote (APNs) notifications and hands the device
// token to JS, which posts it to the Rails API. Shared between the iOS and
// macOS targets; only the registerForRemoteNotifications call differs.
//
// The token arrives through the app delegate, not this module, so the
// delegate forwards it to `didRegister(deviceToken:)`. It is cached here in
// case the delegate fires before JS has subscribed — on a cold start it
// nearly always does.
@objc(PushNotifications)
final class PushNotifications: RCTEventEmitter {
    static let tokenEvent = "pushToken"
    static let openedEvent = "pushOpened"

    private static weak var shared: PushNotifications?
    private static var lastToken: String?
    private static var lastError: String?
    private static var pendingOpen: [AnyHashable: Any]?
    private static let foregroundDelegate = ForegroundDelegate()

    private var hasListeners = false

    override init() {
        super.init()
        Self.shared = self
    }

    @objc override static func requiresMainQueueSetup() -> Bool { true }
    @objc override func supportedEvents() -> [String]! { [Self.tokenEvent, Self.openedEvent] }

    @objc override func startObserving() {
        hasListeners = true
        if let token = Self.lastToken { sendEvent(withName: Self.tokenEvent, body: ["token": token]) }
        if let payload = Self.pendingOpen {
            sendEvent(withName: Self.openedEvent, body: payload)
            Self.pendingOpen = nil
        }
    }

    @objc override func stopObserving() { hasListeners = false }

    // MARK: - App delegate hooks

    /// Call from `application(_:didFinishLaunching…)` so banners show while
    /// the app is in the foreground and taps are forwarded to JS.
    @objc static func configure() {
        UNUserNotificationCenter.current().delegate = foregroundDelegate
    }

    @objc static func didRegister(deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        lastToken = token
        lastError = nil
        shared?.emit(tokenEvent, ["token": token])
    }

    @objc static func didFailToRegister(error: Error) {
        lastError = error.localizedDescription
    }

    fileprivate static func didOpen(userInfo: [AnyHashable: Any]) {
        let payload: [AnyHashable: Any] = [
            "notification_id": userInfo["notification_id"] as Any,
            "source": userInfo["source"] as Any,
        ]
        if let shared, shared.hasListeners {
            shared.sendEvent(withName: openedEvent, body: payload)
        } else {
            pendingOpen = payload
        }
    }

    private func emit(_ name: String, _ body: [String: Any]) {
        guard hasListeners else { return }
        sendEvent(withName: name, body: body)
    }

    // MARK: - JS API

    /// Asks for permission (a no-op if already decided) and, when granted,
    /// registers with APNs. Resolves with the authorization status as a
    /// string; the token itself arrives via the `pushToken` event.
    @objc func requestPermission(_ resolve: @escaping RCTPromiseResolveBlock,
                                 rejecter reject: @escaping RCTPromiseRejectBlock) {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error {
                reject("permission_failed", error.localizedDescription, error)
                return
            }
            center.getNotificationSettings { settings in
                if granted {
                    DispatchQueue.main.async { Self.registerForRemote() }
                }
                resolve(Self.describe(settings.authorizationStatus))
            }
        }
    }

    /// Re-registers without prompting. Apple recommends this on every launch
    /// because tokens can change.
    @objc func register() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }
            DispatchQueue.main.async { Self.registerForRemote() }
        }
    }

    @objc func getToken(_ resolve: @escaping RCTPromiseResolveBlock,
                        rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(Self.lastToken)
    }

    private static func registerForRemote() {
        #if canImport(UIKit)
        UIApplication.shared.registerForRemoteNotifications()
        #else
        NSApplication.shared.registerForRemoteNotifications()
        #endif
    }

    private static func describe(_ status: UNAuthorizationStatus) -> String {
        switch status {
        case .authorized: return "authorized"
        case .provisional: return "provisional"
        case .denied: return "denied"
        case .notDetermined: return "notDetermined"
        default: return "unknown"
        }
    }
}

// UNUserNotificationCenter keeps only a weak reference to its delegate, and
// the RN module is created and torn down with the bridge, so the delegate is
// a separate long-lived object.
private final class ForegroundDelegate: NSObject, UNUserNotificationCenterDelegate {
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        PushNotifications.didOpen(userInfo: response.notification.request.content.userInfo)
        completionHandler()
    }
}
