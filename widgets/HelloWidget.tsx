import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";

// Throwaway spike widget — only exists to prove react-native-android-widget
// builds and renders on this project's Expo SDK 57 setup. Not a real feature.
export function HelloWidget() {
  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: "#131a2c",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 16,
      }}
    >
      <TextWidget
        text="Widget spike OK"
        style={{ fontSize: 16, color: "#f6f8fc" }}
      />
    </FlexWidget>
  );
}
