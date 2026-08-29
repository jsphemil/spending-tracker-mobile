import { registerWebModule, NativeModule } from 'expo';

class WidgetBridgeModule extends NativeModule<{}> {}

export default registerWebModule(WidgetBridgeModule, 'WidgetBridgeModule');
