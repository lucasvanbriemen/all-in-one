#import <Foundation/Foundation.h>

/**
 * The file and terminal server, running inside the app.
 *
 * The Code page reaches its filesystem over `http://127.0.0.1:4001` and its
 * shell over `ws://127.0.0.1:4001/terminal`. In development the Procfile starts
 * that server; a copy of the app on another Mac has no Procfile, so the app
 * carries its own Node runtime and starts the server itself.
 *
 * Nothing else needs the handle: `start` is idempotent and the process is torn
 * down on quit, so callers only ever ask for it once.
 */
@interface SidecarServer : NSObject

/// Launches the bundled server, if there is one. Safe to call more than once.
+ (void)start;

/// Stops the bundled server. Called on quit; a no-op if it never started.
+ (void)stop;

@end
