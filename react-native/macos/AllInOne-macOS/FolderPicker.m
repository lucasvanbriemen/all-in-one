#import <React/RCTBridgeModule.h>
@interface RCT_EXTERN_MODULE (FolderPicker, NSObject)
RCT_EXTERN_METHOD(pick
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)
@end