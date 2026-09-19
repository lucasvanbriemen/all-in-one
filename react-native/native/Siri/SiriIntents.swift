import Foundation
import Intents
import React

// Lets the user say "Hey Siri, play <song>.
@objc(SiriIntents)
final class SiriIntents: RCTEventEmitter {
    static let playEvent = "siriPlay"

    private static weak var shared: SiriIntents?
    private static var pendingQuery: String?

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

    @objc static func configure() {
        INPreferences.requestSiriAuthorization { status in
        }
    }

    @objc static func handler(for intent: INIntent) -> Any? {
        intent is INPlayMediaIntent ? PlayMediaIntentHandler() : nil
    }

    @objc static func handle(_ intent: INPlayMediaIntent) -> INPlayMediaIntentResponse {
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

final class PlayMediaIntentHandler: NSObject, INPlayMediaIntentHandling {
    func resolveMediaItems(for intent: INPlayMediaIntent,
                           with completion: @escaping ([INPlayMediaMediaItemResolutionResult]) -> Void) {
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
