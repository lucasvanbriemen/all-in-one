#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE (KeyCommands, RCTEventEmitter)
RCT_EXTERN_METHOD(setCommands : (NSArray *)commands)
@end
