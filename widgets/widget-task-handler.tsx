import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";

import { HelloWidget } from "./HelloWidget";

const nameToWidget = {
  Hello: HelloWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const Widget = nameToWidget[props.widgetInfo.widgetName as keyof typeof nameToWidget];
  if (!Widget) return;

  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED":
      props.renderWidget(<Widget />);
      break;
    default:
      break;
  }
}
