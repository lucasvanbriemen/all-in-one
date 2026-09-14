#import <React/RCTViewManager.h>
#import <UIKit/UIKit.h>

@interface NavigationBlurManager : RCTViewManager
@end

@implementation NavigationBlurManager

RCT_EXPORT_MODULE(NavigationBlur)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (UIView *)view
{
  // UIKit samples the scrolling content behind the navigation and adapts the
  // material to the system appearance and accessibility settings.
  UIBlurEffect *effect = [UIBlurEffect effectWithStyle:UIBlurEffectStyleSystemUltraThinMaterial];
  UIVisualEffectView *view = [[UIVisualEffectView alloc] initWithEffect:effect];
  view.userInteractionEnabled = NO;
  return view;
}

@end
