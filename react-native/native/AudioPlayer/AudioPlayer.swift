import AVFoundation
import Foundation
import MediaPlayer

#if canImport(UIKit)
import UIKit
#else
import AppKit
#endif

// Streams audio with AVPlayer and mirrors its state into Apple's "Now Playing"
// surfaces (Control Center, lock screen, the macOS menu-bar widget, media keys,
// headphone buttons) via MPNowPlayingInfoCenter and MPRemoteCommandCenter.
//
// The player is owned by the module, not by any React component, so playback
// survives page switches in the JS tree. Shared between the iOS and macOS
// targets; the only platform-specific bit is AVAudioSession, which does not
// exist on macOS.
@objc(AudioPlayer)
final class AudioPlayer: RCTEventEmitter {
    private var player: AVPlayer?
    private var timeObserver: Any?
    private var statusObserver: NSKeyValueObservation?
    private var endObserver: NSObjectProtocol?
    private var metadata: [String: Any] = [:]
    private var artwork: MPMediaItemArtwork?
    private var hasListeners = false
    private var commandsRegistered = false

    @objc override static func requiresMainQueueSetup() -> Bool { true }

    override func startObserving() { hasListeners = true }
    override func stopObserving() { hasListeners = false }

    // MARK: - JS API

    @objc func play(_ url: String,
                    metadata: NSDictionary,
                    headers: NSDictionary,
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let streamURL = URL(string: url) else {
            return reject("bad_url", "Could not parse \(url)", nil)
        }

        DispatchQueue.main.async {
            self.activateSession()
            self.registerRemoteCommands()
            self.teardownPlayer()

            self.metadata = metadata as? [String: Any] ?? [:]
            self.artwork = nil

            // Custom HTTP headers (e.g. Authorization) ride along on every
            // request AVPlayer makes for this asset, including range requests.
            let asset = AVURLAsset(url: streamURL, options: [
                "AVURLAssetHTTPHeaderFieldsKey": headers as? [String: String] ?? [:],
            ])
            let item = AVPlayerItem(asset: asset)
            let player = AVPlayer(playerItem: item)
            self.player = player

            self.statusObserver = item.observe(\.status, options: [.new]) { [weak self] item, _ in
                guard let self else { return }
                if item.status == .failed {
                } else if item.status == .readyToPlay {
                    self.updateNowPlaying()
                }
            }

            self.endObserver = NotificationCenter.default.addObserver(
                forName: .AVPlayerItemDidPlayToEndTime, object: item, queue: .main
            ) { [weak self] _ in
            }

            self.timeObserver = player.addPeriodicTimeObserver(
                forInterval: CMTime(seconds: 1, preferredTimescale: 1), queue: .main
            ) { [weak self] _ in
                self?.updateNowPlaying()
            }

            player.play()
            self.loadArtwork()
            self.updateNowPlaying()
            resolve(nil)
        }
    }

    @objc func pause() {
        DispatchQueue.main.async {
            self.player?.pause()
            self.updateNowPlaying()
        }
    }

    @objc func resume() {
        DispatchQueue.main.async {
            self.activateSession()
            self.player?.play()
            self.updateNowPlaying()
        }
    }

    @objc func stop() {
        DispatchQueue.main.async {
            self.teardownPlayer()
            MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
            MPNowPlayingInfoCenter.default().playbackState = .stopped
        }
    }

    @objc func seek(_ seconds: Double) {
        DispatchQueue.main.async {
            self.player?.seek(to: CMTime(seconds: seconds, preferredTimescale: 600)) { [weak self] _ in
                self?.updateNowPlaying()
            }
        }
    }

    @objc func updateMetadata(_ metadata: NSDictionary) {
        DispatchQueue.main.async {
            self.metadata = metadata as? [String: Any] ?? [:]
            self.artwork = nil
            self.loadArtwork()
            self.updateNowPlaying()
        }
    }

    // MARK: - Session (iOS only)

    private func activateSession() {
        #if canImport(UIKit)
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .default)
        try? session.setActive(true)
        #endif
    }

    // MARK: - Remote commands

    private func registerRemoteCommands() {
        guard !commandsRegistered else { return }
        commandsRegistered = true

        let center = MPRemoteCommandCenter.shared()

        center.playCommand.addTarget { [weak self] _ in
            self?.resume(); return .success
        }
        center.pauseCommand.addTarget { [weak self] _ in
            self?.pause(); return .success
        }
        center.togglePlayPauseCommand.addTarget { [weak self] _ in
            guard let self else { return .commandFailed }
            if self.isPlaying { self.pause() } else { self.resume() }
            return .success
        }
        center.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let event = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
            self?.seek(event.positionTime)
            return .success
        }
    }

    // MARK: - Now Playing

    private var isPlaying: Bool {
        guard let player else { return false }
        return player.timeControlStatus == .playing || player.rate > 0
    }

    private func updateNowPlaying() {
        guard let player, let item = player.currentItem else { return }

        var info: [String: Any] = [:]
        info[MPMediaItemPropertyTitle] = metadata["title"] as? String ?? ""
        info[MPMediaItemPropertyArtist] = metadata["artist"] as? String ?? ""
        if let album = metadata["album"] as? String { info[MPMediaItemPropertyAlbumTitle] = album }
        if let artwork { info[MPMediaItemPropertyArtwork] = artwork }

        let duration = item.duration.seconds
        if duration.isFinite { info[MPMediaItemPropertyPlaybackDuration] = duration }
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = player.currentTime().seconds
        info[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0
        info[MPNowPlayingInfoPropertyMediaType] = MPNowPlayingInfoMediaType.audio.rawValue

        let center = MPNowPlayingInfoCenter.default()
        center.nowPlayingInfo = info
        center.playbackState = isPlaying ? .playing : .paused
    }

    private func loadArtwork() {
        guard let urlString = metadata["artwork"] as? String, let url = URL(string: urlString) else { return }
        URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            guard let self, let data else { return }
            #if canImport(UIKit)
            guard let image = UIImage(data: data) else { return }
            #else
            guard let image = NSImage(data: data) else { return }
            #endif
            let art = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
            DispatchQueue.main.async {
                // Only apply if the metadata hasn't changed under us.
                guard self.metadata["artwork"] as? String == urlString else { return }
                self.artwork = art
                self.updateNowPlaying()
            }
        }.resume()
    }

    private func teardownPlayer() {
        if let timeObserver, let player { player.removeTimeObserver(timeObserver) }
        timeObserver = nil
        statusObserver = nil
        if let endObserver { NotificationCenter.default.removeObserver(endObserver) }
        endObserver = nil
        player?.pause()
        player = nil
    }
}
