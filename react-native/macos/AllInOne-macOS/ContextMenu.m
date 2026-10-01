#import <React/RCTBridgeModule.h>
@interface RCT_EXTERN_MODULE (ContextMenu, NSObject)
RCT_EXTERN_METHOD(show
                  : (NSArray *)actions resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)
@end
