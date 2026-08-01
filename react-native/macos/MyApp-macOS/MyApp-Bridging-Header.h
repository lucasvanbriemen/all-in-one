// Exposes React Native's Objective-C API to Swift. React's headers aren't
// built as a Swift module under CocoaPods, so `import React` doesn't work —
// this bridging header is how VisualEffectBackground.swift sees RCTViewManager.

#import <React/RCTViewManager.h>
#import <React/RCTBridgeModule.h>
