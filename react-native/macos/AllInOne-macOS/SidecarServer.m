#import "SidecarServer.h"

/**
 * Laid down by `scripts/stage-sidecar.sh`, relative to `Contents/Resources`.
 */
static NSString *const kSidecarDirectory = @"server";
static NSString *const kSidecarEntryPoint = @"fileserver.mjs";
static NSString *const kSidecarNode = @"bin/node";

static NSTask *sSidecar = nil;

/**
 * The write end of the server's stdin, held open for exactly as long as this
 * process lives.
 *
 * `stop` covers an orderly quit, but a crash or a `kill -9` never runs it, and
 * an orphaned server would then hold port 4001 against the next launch. A pipe
 * closes when the last writer goes away no matter how the writer died, so the
 * server treats EOF on stdin as its cue to exit and the operating system does
 * the bookkeeping. See `AIO_EXIT_ON_STDIN_EOF` in `scripts/fileserver.mjs`.
 */
static NSPipe *sLifeline = nil;

@implementation SidecarServer

+ (void)start
{
  if (sSidecar != nil) {
    return;
  }

  NSString *resources = [[NSBundle mainBundle] resourcePath];
  NSString *root = [resources stringByAppendingPathComponent:kSidecarDirectory];
  NSString *node = [root stringByAppendingPathComponent:kSidecarNode];

  // A build that skipped the staging phase has no server to run. That is a
  // degraded app rather than a broken one — Home and Email talk to the remote
  // API and are unaffected — so it is worth a log and not a crash.
  if (![[NSFileManager defaultManager] isExecutableFileAtPath:node]) {
    NSLog(@"[sidecar] no bundled server at %@; the Code page will be unavailable", root);
    return;
  }

  sLifeline = [NSPipe pipe];

  NSTask *task = [[NSTask alloc] init];
  task.executableURL = [NSURL fileURLWithPath:node];
  task.arguments = @[kSidecarEntryPoint];

  // `node-pty` resolves its native module relative to its own directory, and
  // the entry point is passed as a bare filename, so both depend on the server
  // directory being the working directory.
  task.currentDirectoryURL = [NSURL fileURLWithPath:root];
  task.standardInput = sLifeline;

  NSMutableDictionary *environment =
      [[[NSProcessInfo processInfo] environment] mutableCopy];
  environment[@"AIO_EXIT_ON_STDIN_EOF"] = @"1";
  task.environment = environment;

  NSError *error = nil;
  if (![task launchAndReturnError:&error]) {
    NSLog(@"[sidecar] failed to launch: %@", error);
    sLifeline = nil;
    return;
  }

  sSidecar = task;
  NSLog(@"[sidecar] serving 127.0.0.1:4001 (pid %d)", task.processIdentifier);
}

+ (void)stop
{
  if (sSidecar == nil) {
    return;
  }

  // Closing the lifeline is what the server is actually listening for; the
  // explicit terminate only shortens the wait.
  [[sLifeline fileHandleForWriting] closeFile];
  [sSidecar terminate];
  [sSidecar waitUntilExit];

  sSidecar = nil;
  sLifeline = nil;
}

@end
