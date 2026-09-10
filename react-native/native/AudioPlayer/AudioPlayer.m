#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE (AudioPlayer, RCTEventEmitter)

RCT_EXTERN_METHOD(play
                  : (NSString *)url metadata
                  : (NSDictionary *)metadata headers
                  : (NSDictionary *)headers resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(pause)
RCT_EXTERN_METHOD(resume)
RCT_EXTERN_METHOD(stop)
RCT_EXTERN_METHOD(seek : (double)seconds)
RCT_EXTERN_METHOD(updateMetadata : (NSDictionary *)metadata)

@end
