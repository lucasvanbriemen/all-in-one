#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)notification
{
  self.moduleName = @"MyApp";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};
  self.dependencyProvider = [RCTAppDependencyProvider new];

  [super applicationDidFinishLaunching:notification];

  // RCTAppDelegate builds a standard titled, opaque window. SwiftUI got this
  // from `.windowStyle(.hiddenTitleBar)` plus the visual-effect background;
  // in AppKit it has to be set by hand. Without this the window paints its own
  // opaque backdrop and NSVisualEffectView has nothing to blend with.
  NSWindow *window = self.window;
  window.styleMask |= NSWindowStyleMaskFullSizeContentView;
  window.titlebarAppearsTransparent = YES;
  window.titleVisibility = NSWindowTitleHidden;
  window.opaque = NO;
  window.backgroundColor = [NSColor clearColor];

  // The React root view is opaque by default, which would sit on top of the
  // blur. Clearing it lets `.behindWindow` reach the desktop.
  window.contentView.wantsLayer = YES;
  window.contentView.layer.backgroundColor = [NSColor clearColor].CGColor;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

/// This method controls whether the `concurrentRoot`feature of React18 is turned on or off.
///
/// @see: https://reactjs.org/blog/2022/03/29/react-v18.html
/// @note: This requires to be rendering on Fabric (i.e. on the New Architecture).
/// @return: `true` if the `concurrentRoot` feature is enabled. Otherwise, it returns `false`.
- (BOOL)concurrentRootEnabled
{
#ifdef RN_FABRIC_ENABLED
  return true;
#else
  return false;
#endif
}

@end
