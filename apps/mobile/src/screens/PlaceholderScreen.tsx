import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

export function PlaceholderScreen({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 32,
    gap: 8,
  },
  title: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "600",
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
});
