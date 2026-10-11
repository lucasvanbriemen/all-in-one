import AVFoundation
import ImageIO
import UniformTypeIdentifiers

#if os(iOS)
import PhotosUI
import UIKit
#else
import AppKit
#endif

/// Lets the user pick one photo or video to send.
///
/// WhatsApp only renders JPEG/PNG images and H.264 MP4 videos for every
/// recipient, while Apple devices default to HEIC and HEVC .mov. Anything
/// else is converted before it is handed to JS, so the upload is always
/// something the other side can open.
@objc(MediaPicker)
final class MediaPicker: NSObject {
  private static let sendableImages: [UTType] = [.jpeg, .png]

  #if os(iOS)
  private var pending: ((URL?) -> Void)?
  #endif

  @objc static func requiresMainQueueSetup() -> Bool {
    true
  }

  /// Resolves to `{uri, name, type, size, width, height, kind}`, or null when cancelled.
  @objc func pick(_ resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      self.present { url in
        guard let url else { return resolve(nil) }
        Task {
          do {
            resolve(try await Self.prepare(url))
          } catch {
            reject("media_picker", error.localizedDescription, error)
          }
        }
      }
    }
  }

  // MARK: - Presenting

  #if os(iOS)
  private func present(_ completion: @escaping (URL?) -> Void) {
    guard let presenter = Self.topViewController() else { return completion(nil) }

    var config = PHPickerConfiguration()
    config.filter = .any(of: [.images, .videos])
    config.selectionLimit = 1
    config.preferredAssetRepresentationMode = .compatible

    let picker = PHPickerViewController(configuration: config)
    picker.delegate = self
    pending = completion
    presenter.present(picker, animated: true)
  }

  private static func topViewController() -> UIViewController? {
    let window = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap(\.windows)
      .first(where: \.isKeyWindow)
    var top = window?.rootViewController
    while let presented = top?.presentedViewController { top = presented }
    return top
  }
  #else
  private func present(_ completion: @escaping (URL?) -> Void) {
    let panel = NSOpenPanel()
    panel.canChooseFiles = true
    panel.canChooseDirectories = false
    panel.allowsMultipleSelection = false
    panel.allowedContentTypes = [.image, .movie]
    panel.prompt = "Attach"

    NSApp.activate(ignoringOtherApps: true)

    panel.begin { response in
      completion(response == .OK ? panel.url : nil)
    }
  }
  #endif

  // MARK: - Converting

  private static func prepare(_ source: URL) async throws -> [String: Any] {
    let type = UTType(filenameExtension: source.pathExtension) ?? .data
    let isVideo = type.conforms(to: .movie)
    let url = isVideo ? try await sendableVideo(source, type: type) : try sendableImage(source, type: type)
    let size = isVideo ? try await videoSize(url) : imageSize(url)
    let finalType = UTType(filenameExtension: url.pathExtension) ?? type
    let bytes = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0

    return [
      "uri": url.absoluteString,
      "name": url.lastPathComponent,
      "type": finalType.preferredMIMEType ?? "application/octet-stream",
      "size": bytes,
      "width": size.width,
      "height": size.height,
      "kind": isVideo ? "video" : "image",
    ]
  }

  private static func sendableImage(_ source: URL, type: UTType) throws -> URL {
    if sendableImages.contains(where: { type.conforms(to: $0) }) { return source }

    guard let image = CGImageSourceCreateWithURL(source as CFURL, nil) else { throw PickerError.unreadable }
    let output = temporaryURL(for: source, extension: "jpg")
    guard let destination = CGImageDestinationCreateWithURL(output as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else {
      throw PickerError.unreadable
    }
    // Copying from the source keeps the EXIF orientation, so portrait photos stay upright.
    CGImageDestinationAddImageFromSource(destination, image, 0, [kCGImageDestinationLossyCompressionQuality: 0.85] as CFDictionary)
    guard CGImageDestinationFinalize(destination) else { throw PickerError.unreadable }
    return output
  }

  private static func sendableVideo(_ source: URL, type: UTType) async throws -> URL {
    let asset = AVURLAsset(url: source)
    let tracks = try await asset.loadTracks(withMediaType: .video)
    if type.conforms(to: .mpeg4Movie), let track = tracks.first {
      let formats = try await track.load(.formatDescriptions)
      if formats.allSatisfy({ CMFormatDescriptionGetMediaSubType($0) == kCMVideoCodecType_H264 }) { return source }
    }

    // The fixed-size presets encode H.264; the HEVC ones are named as such.
    guard let session = AVAssetExportSession(asset: asset, presetName: AVAssetExportPreset1920x1080) else {
      throw PickerError.unreadable
    }
    let output = temporaryURL(for: source, extension: "mp4")
    session.outputURL = output
    session.outputFileType = .mp4
    session.shouldOptimizeForNetworkUse = true
    await session.export()
    guard session.status == .completed else { throw session.error ?? PickerError.unreadable }
    return output
  }

  private static func imageSize(_ url: URL) -> CGSize {
    guard let image = CGImageSourceCreateWithURL(url as CFURL, nil),
          let properties = CGImageSourceCopyPropertiesAtIndex(image, 0, nil) as? [CFString: Any],
          let width = properties[kCGImagePropertyPixelWidth] as? Int,
          let height = properties[kCGImagePropertyPixelHeight] as? Int else { return .zero }
    // Orientations 5–8 are rotated a quarter turn, so the displayed size is swapped.
    let orientation = properties[kCGImagePropertyOrientation] as? Int ?? 1
    return orientation >= 5 ? CGSize(width: height, height: width) : CGSize(width: width, height: height)
  }

  private static func videoSize(_ url: URL) async throws -> CGSize {
    guard let track = try await AVURLAsset(url: url).loadTracks(withMediaType: .video).first else { return .zero }
    let (natural, transform) = try await track.load(.naturalSize, .preferredTransform)
    let size = natural.applying(transform)
    return CGSize(width: abs(size.width), height: abs(size.height))
  }

  /// A fresh directory per file keeps the original name (it becomes the WhatsApp filename) without collisions.
  static func temporaryURL(for source: URL, extension ext: String) -> URL {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
    try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    return directory
      .appendingPathComponent(source.deletingPathExtension().lastPathComponent)
      .appendingPathExtension(ext)
  }

  enum PickerError: LocalizedError {
    case unreadable

    var errorDescription: String? { "The selected file could not be read." }
  }
}

#if os(iOS)
extension MediaPicker: PHPickerViewControllerDelegate {
  func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    picker.dismiss(animated: true)
    let completion = pending
    pending = nil

    guard let provider = results.first?.itemProvider else {
      completion?(nil)
      return
    }
    let type: UTType = provider.hasItemConformingToTypeIdentifier(UTType.movie.identifier) ? .movie : .image

    provider.loadFileRepresentation(forTypeIdentifier: type.identifier) { url, _ in
      // The provider deletes its file once this block returns, so keep a copy.
      completion?(url.flatMap { try? Self.copyToTemporary($0) })
    }
  }

  private static func copyToTemporary(_ url: URL) throws -> URL {
    let copy = temporaryURL(for: url, extension: url.pathExtension)
    try FileManager.default.copyItem(at: url, to: copy)
    return copy
  }
}
#endif
