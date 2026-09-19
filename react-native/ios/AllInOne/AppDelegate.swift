import UIKit
import UserNotifications
import Intents
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  // The single React root view. Normally created when the first scene
  // connects, but a Siri background launch has no scene, so it may be
  // created earlier and adopted by the scene later.
  var rootView: UIView?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    PushNotifications.configure()
    SiriIntents.configure()
    SiriIntents.ensureJavaScriptRunning = { [weak self] in _ = self?.ensureReactNativeStarted() }

    return true
  }

  func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let config = UISceneConfiguration(name: nil, sessionRole: connectingSceneSession.role)
    config.delegateClass = SceneDelegate.self
    return config
  }

  func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    PushNotifications.didRegister(deviceToken: deviceToken)
  }

  /// Creates the React root view (which boots JS) if it does not exist yet.
  func ensureReactNativeStarted() -> UIView? {
    if let rootView { return rootView }
    guard let factory = reactNativeFactory else { return nil }
    let view = factory.rootViewFactory.view(withModuleName: "AllInOne", initialProperties: nil, launchOptions: nil)
    rootView = view
    return view
  }

  // MARK: - Siri ("Hey Siri, play <song>)

  func application(_ application: UIApplication, handlerFor intent: INIntent) -> Any? {
    NSLog("[SiriIntents] handlerFor: %@", intent)
    return SiriIntents.handler(for: intent)
  }

  func application(
    _ application: UIApplication,
    handle intent: INIntent,
    completionHandler: @escaping (INIntentResponse) -> Void
  ) {
    guard let playIntent = intent as? INPlayMediaIntent else {
      return completionHandler(INIntentResponse())
    }
    completionHandler(SiriIntents.handle(playIntent))
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
