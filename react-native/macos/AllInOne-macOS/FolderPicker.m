#import <React/RCTBridgeModule.h>

// Registers the Swift module with React Native, the same wiring as
// VisualEffectBackgroundManager.m minus the view. Without this file
// `NativeModules.FolderPicker` is undefined at runtime.
@interface RCT_EXTERN_MODULE (FolderPicker, NSObject)

RCT_EXTERN_METHOD(pick
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

@end
