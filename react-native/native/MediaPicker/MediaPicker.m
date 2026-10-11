#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE (MediaPicker, NSObject)

RCT_EXTERN_METHOD(pick
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

@end
