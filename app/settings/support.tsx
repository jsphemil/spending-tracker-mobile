import { useState } from "react";
import { LayoutAnimation, Pressable, ScrollView, Text, View } from "react-native";

import { SettingsRow, SettingsSection } from "../../components/ui/SettingsRow";
import { Icon } from "../../components/ui/Icon";
import { FAQ_SECTIONS, type FaqSection } from "../../constants/faq";
import { FEEDBACK_ADDRESS } from "../../services/feedback";
import { sendFeedback } from "../../services/feedbackLink";
import { useThemeColors } from "../../theme/palette";

// Help & Support (spec.md §5.15 / §5.22): the always-available reference
// §5.15 described, as a folded FAQ over constants/faq.ts, plus the two
// ways out — send feedback by email (the only honest channel for an app
// with no server) and replay the intro. Sections fold one at a time so
// the page never grows past a screen of headings.
export default function HelpSupportScreen() {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggle(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((current) => (current === id ? null : id));
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 20 }}>
      <SettingsSection title="Common questions">
        {FAQ_SECTIONS.map((section, i) => (
          <FaqSectionRow
            key={section.id}
            section={section}
            open={openId === section.id}
            onToggle={() => toggle(section.id)}
            last={i === FAQ_SECTIONS.length - 1}
          />
        ))}
      </SettingsSection>

      <SettingsSection title="Get in touch">
        <SettingsRow
          icon="book-open"
          label="Send feedback"
          sublabel={`Opens your mail app, addressed to ${FEEDBACK_ADDRESS}`}
          onPress={() => {
            sendFeedback();
          }}
        />
        <SettingsRow
          icon="sparkles"
          label="Replay the intro"
          sublabel="The welcome slides again, and the one-time hints on each screen come back"
          href="/settings/intro"
          last
        />
      </SettingsSection>
    </ScrollView>
  );
}

function FaqSectionRow({
  section,
  open,
  onToggle,
  last,
}: {
  section: FaqSection;
  open: boolean;
  onToggle: () => void;
  last: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View className={last && !open ? "" : "border-b border-glass-border"}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={section.title}
        className="flex-row items-center gap-3 px-4 py-3.5"
      >
        <View className="h-8 w-8 items-center justify-center rounded-full bg-glass-fill-strong">
          <Icon name={section.icon} size={16} color={colors.fg} />
        </View>
        <Text className="flex-1 text-base text-fg">{section.title}</Text>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.fgSubtle} />
      </Pressable>
      {open && (
        <View className="gap-4 px-4 pb-4">
          {section.entries.map((entry) => (
            <View key={entry.question} className="gap-1">
              <Text className="text-sm font-semibold text-fg">{entry.question}</Text>
              <Text className="text-sm text-fg-muted">{entry.answer}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
