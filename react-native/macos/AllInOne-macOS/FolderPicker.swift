import AppKit

@objc(FolderPicker)
final class FolderPicker: NSObject {
    @objc static func requiresMainQueueSetup() -> Bool {
        true
    }

    @objc func pick(_ resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            let panel = NSOpenPanel()
            panel.canChooseDirectories = true
            panel.allowsMultipleSelection = false
            panel.message = "Choose the folder to make sexier"
            panel.prompt = "Start working"

            panel.begin { response in
                guard response == .OK, let url = panel.url else {
                    return resolve(nil)
                }

                resolve(url.path)
            }
        }
    }
}
