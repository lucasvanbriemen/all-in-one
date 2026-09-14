#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE (PushNotifications, RCTEventEmitter)

RCT_EXTERN_METHOD(requestPermission
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(register)
RCT_EXTERN_METHOD(getToken
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

@end
