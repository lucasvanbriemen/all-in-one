#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE (MediaPicker, NSObject)

RCT_EXTERN_METHOD(pick
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(preparePastedImage
                  : (NSString *)uri resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

@end
