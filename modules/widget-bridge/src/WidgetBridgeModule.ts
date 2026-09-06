import { NativeModule, requireNativeModule } from 'expo';

declare class WidgetBridgeModule extends NativeModule<{}> {
  refreshAccountsWidget(): Promise<void>;
  refreshPortfolioWidgets(): Promise<void>;
}

export default requireNativeModule<WidgetBridgeModule>('WidgetBridge');
