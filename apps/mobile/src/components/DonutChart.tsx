import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "../theme/colors";

interface Segment {
  label: string;
  value: number;
  color: string;
}

const SIZE = 160;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart({ segments, centerLabel }: { segments: Segment[]; centerLabel: string }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let cumulative = 0;

  return (
    <View style={{ width: SIZE, height: SIZE }}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={colors.border} strokeWidth={STROKE} />
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((segment) => {
              const fraction = segment.value / total;
              const dash = fraction * CIRCUMFERENCE;
              const offset = -cumulative * CIRCUMFERENCE;
              cumulative += fraction;
              return (
                <Circle
                  key={segment.label}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={STROKE}
                  strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                  strokeDashoffset={offset}
                />
              );
            })}
      </Svg>
      <View style={styles.centerOverlay} pointerEvents="none">
        <Text style={styles.total}>{total}</Text>
        <Text style={styles.label}>{centerLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  total: { fontSize: 24, fontWeight: "700", color: colors.foreground },
  label: { fontSize: 11, color: colors.muted },
});
