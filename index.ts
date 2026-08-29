import "expo-router/entry";
import { registerWidgetConfigurationScreen, registerWidgetTaskHandler } from "react-native-android-widget";

import { AccountsWidgetConfigScreen } from "./widgets/AccountsWidgetConfigScreen";
import { widgetTaskHandler } from "./widgets/widget-task-handler";

registerWidgetTaskHandler(widgetTaskHandler);
registerWidgetConfigurationScreen(AccountsWidgetConfigScreen);
