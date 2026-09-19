import Foundation
import Intents
import React

// Lets the user say "Hey Siri, play <song> in All in one".
//
// Siri parses the phrase into an INPlayMediaIntent and hands it to the app
// (launched in the background if needed) via the app delegate. The spoken
// search term is forwarded to JS as a `siriPlay` event; JS owns the catalog
// search and the queue, so it looks the term up on the Rails API and starts
// playback through AudioPlayer.
//
// On a cold start the intent arrives long before JS has subscribed, so the
// request is cached and replayed the moment a listener attaches — the same
// pattern PushNotifications uses for its device token.
//
// iOS only: the SiriKit media domain does not exist on macOS.
@objc(SiriIntents)
final class SiriIntents: RCTEventEmitter {
    static let playEvent = "siriPlay"

    private static weak var shared: SiriIntents?
    private static var pendingQuery: String?

    /// Set by the app delegate. Siri launches the app in the background with
    /// no scene, so nothing would otherwise start React Native; this boots
    /// the JS side so it can pick up the cached query.
    @objc static var ensureJavaScriptRunning: (() -> Void)?
    private var hasListeners = false

    override init() {
        super.init()
        Self.shared = self
    }

    @objc override static func requiresMainQueueSetup() -> Bool { true }
    @objc override func supportedEvents() -> [String]! { [Self.playEvent] }

    @objc override func startObserving() {
        hasListeners = true
        if let query = Self.pendingQuery {
            Self.pendingQuery = nil
            sendEvent(withName: Self.playEvent, body: ["query": query])
        }
    }

    @objc override func stopObserving() { hasListeners = false }

    // MARK: - App delegate hooks

    /// Call from `application(_:didFinishLaunching…)`. Siri refuses intents
    /// for apps the user has not authorized; this shows the prompt once.
    @objc static func configure() {
        INPreferences.requestSiriAuthorization { status in
            NSLog("[SiriIntents] authorization status: \(status.rawValue)")
        }
    }

    /// Handler the system asks the app for when a Siri media intent comes in.
    @objc static func handler(for intent: INIntent) -> Any? {
        intent is INPlayMediaIntent ? PlayMediaIntentHandler() : nil
    }

    /// Forwards the resolved intent to JS. Runs on the main thread because
    /// creating the React root view requires it.
    @objc static func handle(_ intent: INPlayMediaIntent) -> INPlayMediaIntentResponse {
        NSLog("[SiriIntents] handle: %@", intent)
        guard let query = Self.query(from: intent) else {
            return INPlayMediaIntentResponse(code: .failureNoUnplayedContent, userActivity: nil)
        }
        if let shared, shared.hasListeners {
            shared.sendEvent(withName: playEvent, body: ["query": query])
        } else {
            pendingQuery = query
            ensureJavaScriptRunning?()
        }
        return INPlayMediaIntentResponse(code: .success, userActivity: nil)
    }

    /// The search term Siri heard. `mediaItems` is what our own resolver
    /// returned (the term echoed back), `mediaSearch` the raw parse.
    static func query(from intent: INPlayMediaIntent) -> String? {
        if let title = intent.mediaItems?.first?.title, !title.isEmpty { return title }
        let search = intent.mediaSearch
        let parts = [search?.mediaName, search?.artistName, search?.albumName]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
        return parts.isEmpty ? nil : parts.joined(separator: " ")
    }
}

// Runs in-process (no Intents extension), so the app is already awake in the
// background when these run. The catalog lives on the server and JS holds
// the credentials, so resolution is optimistic: echo the spoken term back as
// a song and let JS find the real match. `.handleInApp` is only for
// extensions handing off to their app; returning it from an in-app handler
// makes Siri report a generic failure.
final class PlayMediaIntentHandler: NSObject, INPlayMediaIntentHandling {
    func resolveMediaItems(for intent: INPlayMediaIntent,
                           with completion: @escaping ([INPlayMediaMediaItemResolutionResult]) -> Void) {
        NSLog("[SiriIntents] resolveMediaItems: %@", intent)
        guard let query = SiriIntents.query(from: intent) else {
            return completion([INPlayMediaMediaItemResolutionResult.unsupported()])
        }
        let item = INMediaItem(identifier: query, title: query, type: .song, artwork: nil)
        completion(INPlayMediaMediaItemResolutionResult.successes(with: [item]))
    }

    func handle(intent: INPlayMediaIntent, completion: @escaping (INPlayMediaIntentResponse) -> Void) {
        DispatchQueue.main.async {
            completion(SiriIntents.handle(intent))
        }
    }
}
