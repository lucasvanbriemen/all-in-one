#import <React/RCTViewManager.h>

// Registers the Swift view manager with React Native. Without this file the
// component never reaches JS, and `requireNativeComponent` fails at runtime.
@interface RCT_EXTERN_MODULE (VisualEffectBackgroundManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(materialName, NSString)
RCT_EXPORT_VIEW_PROPERTY(blendsBehindWindow, BOOL)

@end
