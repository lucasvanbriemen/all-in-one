#import "AppDelegate.h"
#import "SidecarServer.h"
#import "AllInOne-Swift.h"

#import <React/RCTBundleURLProvider.h>
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>

// Private CoreGraphics (SkyLight) call that blurs whatever is behind a
// non-opaque window — the one iTerm2 and Alacritty use for adjustable window
// blur. Not App Store-safe and could change in a macOS update; if it ever
// stops working the window is just clear (with the tint from
// TransparentWindow.jsx), not broken.
extern "C" int CGSMainConnectionID(void);
extern "C" int CGSSetWindowBackgroundBlurRadius(int connection, uint32_t windowNumber, int radius);

// How strongly the desktop behind the window is blurred, in points. Lower is
// clearer glass. Never set 0: per iTerm2 that can permanently disable blur for
// the window. The tint on top lives in TransparentWindow.jsx.
static const int WindowBlurRadius = 30;

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)notification
{
  self.moduleName = @"AllInOne";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};
  self.dependencyProvider = [RCTAppDependencyProvider new];

  // Before the bridge, so the Code page's first request has somewhere to land.
  [SidecarServer start];

  // Before the bridge so the first notification tap is not lost.
  [PushNotifications configure];

  [super applicationDidFinishLaunching:notification];

  // RCTAppDelegate builds a standard titled, opaque window. For the glass look
  // it has to be clear, with the content running under a transparent
  // titlebar; otherwise the window paints its own opaque backdrop.
  NSWindow *window = self.window;
  window.styleMask |= NSWindowStyleMaskFullSizeContentView;
  window.titlebarAppearsTransparent = YES;
  window.titleVisibility = NSWindowTitleHidden;
  window.opaque = NO;
  window.backgroundColor = [NSColor clearColor];

  // The React root view is opaque too. On macOS it *draws* its
  // `backgroundColor` (RN sets it to windowBackgroundColor), so clearing the
  // layer colour alone isn't enough — the window then shows solid cream.
  window.contentView.wantsLayer = YES;
  window.contentView.layer.backgroundColor = [NSColor clearColor].CGColor;
  [(id)window.contentView setBackgroundColor:[NSColor clearColor]];

  CGSSetWindowBackgroundBlurRadius(CGSMainConnectionID(), (uint32_t)window.windowNumber, WindowBlurRadius);

  // Closing the window (red button / ⌘W) only hides it, so the React tree, the
  // loaded data and the audio player stay alive and reopening is instant.
  window.releasedWhenClosed = NO;
}

// Clicking the Dock icon (or launching the app again from Spotlight/Raycast)
// while the window is closed brings the existing window back. Without this
// AppKit does nothing for a non-document app and the app looks dead.
- (BOOL)applicationShouldHandleReopen:(NSApplication *)sender hasVisibleWindows:(BOOL)hasVisibleWindows
{
  if (!hasVisibleWindows) {
    [self.window makeKeyAndOrderFront:nil];
  }
  return YES;
}

- (void)applicationWillTerminate:(NSNotification *)notification
{
  [SidecarServer stop];
}

#pragma mark - Remote notifications (forwarded to the PushNotifications module)

- (void)application:(NSApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  [PushNotifications didRegisterWithDeviceToken:deviceToken];
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
