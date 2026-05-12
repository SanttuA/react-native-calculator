import { Delete as DeleteIcon } from 'lucide-react-native';
import React, { useEffect, useMemo, useReducer } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type TextStyle,
  useColorScheme,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as SystemUI from 'expo-system-ui';

import {
  applyCalculatorAction,
  formatDisplay,
  initialCalculatorState,
  operatorSymbols,
  type CalculatorAction,
} from '@/calculator/calculator-engine';

type KeyVariant = 'number' | 'operator' | 'utility' | 'danger' | 'equals';

type CalculatorKey = {
  label: string;
  accessibilityLabel: string;
  testID: string;
  action: CalculatorAction;
  variant?: KeyVariant;
  icon?: 'backspace';
};

const lightTheme = {
  background: '#F7F8FA',
  display: '#1F1F1F',
  muted: '#5F6368',
  key: '#FFFFFF',
  keyPressed: '#E8EAED',
  keyText: '#202124',
  utility: '#F1F3F4',
  utilityText: '#3C4043',
  danger: '#FCE8E6',
  dangerText: '#B3261E',
  operator: '#E8F0FE',
  operatorText: '#174EA6',
  equals: '#0B57D0',
  equalsPressed: '#0842A0',
  equalsText: '#FFFFFF',
  border: '#DFE3EB',
};

const darkTheme = {
  background: '#101113',
  display: '#F8F9FA',
  muted: '#BDC1C6',
  key: '#262A30',
  keyPressed: '#343941',
  keyText: '#F1F3F4',
  utility: '#30343A',
  utilityText: '#E8EAED',
  danger: '#4A2321',
  dangerText: '#F2B8B5',
  operator: '#26344F',
  operatorText: '#AECBFA',
  equals: '#8AB4F8',
  equalsPressed: '#AECBFA',
  equalsText: '#10233F',
  border: '#333842',
};

const keyRows: CalculatorKey[][] = [
  [
    {
      label: 'C',
      accessibilityLabel: 'Clear',
      testID: 'key-clear',
      action: { type: 'clear' },
      variant: 'danger',
    },
    {
      label: '+/-',
      accessibilityLabel: 'Change sign',
      testID: 'key-sign',
      action: { type: 'sign' },
      variant: 'utility',
    },
    {
      label: '%',
      accessibilityLabel: 'Percent',
      testID: 'key-percent',
      action: { type: 'percent' },
      variant: 'utility',
    },
    {
      label: '',
      accessibilityLabel: 'Backspace',
      testID: 'key-backspace',
      action: { type: 'backspace' },
      variant: 'utility',
      icon: 'backspace',
    },
  ],
  [digitKey('7'), digitKey('8'), digitKey('9'), operatorKey('divide', 'key-divide', 'Divide')],
  [
    digitKey('4'),
    digitKey('5'),
    digitKey('6'),
    operatorKey('multiply', 'key-multiply', 'Multiply'),
  ],
  [
    digitKey('1'),
    digitKey('2'),
    digitKey('3'),
    operatorKey('subtract', 'key-subtract', 'Subtract'),
  ],
  [
    digitKey('0'),
    {
      label: '.',
      accessibilityLabel: 'Decimal point',
      testID: 'key-decimal',
      action: { type: 'decimal' },
    },
    {
      label: '=',
      accessibilityLabel: 'Equals',
      testID: 'key-equals',
      action: { type: 'equals' },
      variant: 'equals',
    },
    operatorKey('add', 'key-add', 'Add'),
  ],
];

export function CalculatorScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const [state, dispatch] = useReducer(applyCalculatorAction, initialCalculatorState);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const resultText = state.error ?? formatDisplay(state.displayValue);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.background);
  }, [theme.background]);

  function press(action: CalculatorAction) {
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }

    if (action.type === 'equals' && Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    dispatch(action);
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.shell}>
          <View style={styles.header}>
            <Text style={styles.title}>Laskin</Text>
          </View>

          <View style={styles.display}>
            <Text
              accessibilityLabel="display-expression"
              numberOfLines={1}
              style={styles.expression}
              testID="display-expression"
            >
              {state.expression}
            </Text>
            <Text
              accessibilityLabel="display-result"
              adjustsFontSizeToFit
              minimumFontScale={0.4}
              numberOfLines={1}
              style={[styles.result, state.error && styles.errorResult]}
              testID="display-result"
            >
              {resultText}
            </Text>
          </View>

          <View style={styles.keypad}>
            {keyRows.map((row) => (
              <View key={row.map((key) => key.testID).join('-')} style={styles.keyRow}>
                {row.map((key) => (
                  <CalculatorButton
                    key={key.testID}
                    button={key}
                    onPress={() => press(key.action)}
                    style={buttonStyleForVariant(styles, key.variant)}
                    textStyle={textStyleForVariant(styles, key.variant)}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function CalculatorButton({
  button,
  onPress,
  style,
  textStyle,
}: {
  button: CalculatorKey;
  onPress: () => void;
  style: StyleProp<ViewStyle>;
  textStyle: StyleProp<TextStyle>;
}) {
  return (
    <Pressable
      accessibilityLabel={button.accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [style, pressed && stylesShared.pressed]}
      testID={button.testID}
    >
      {button.icon === 'backspace' ? (
        <DeleteIcon color={getIconColor(textStyle)} size={28} strokeWidth={2.2} />
      ) : (
        <Text adjustsFontSizeToFit numberOfLines={1} style={textStyle}>
          {button.label}
        </Text>
      )}
    </Pressable>
  );
}

function digitKey(digit: string): CalculatorKey {
  return {
    label: digit,
    accessibilityLabel: digit,
    testID: `key-${digit}`,
    action: { type: 'digit', digit },
  };
}

function operatorKey(
  operator: Extract<CalculatorAction, { type: 'operator' }>['operator'],
  testID: string,
  accessibilityLabel: string,
): CalculatorKey {
  return {
    label: operatorSymbols[operator],
    accessibilityLabel,
    testID,
    action: { type: 'operator', operator },
    variant: 'operator',
  };
}

function buttonStyleForVariant(
  styles: ReturnType<typeof createStyles>,
  variant: KeyVariant = 'number',
) {
  return {
    number: styles.key,
    operator: styles.operatorKey,
    utility: styles.utilityKey,
    danger: styles.dangerKey,
    equals: styles.equalsKey,
  }[variant];
}

function textStyleForVariant(
  styles: ReturnType<typeof createStyles>,
  variant: KeyVariant = 'number',
) {
  return {
    number: styles.keyText,
    operator: styles.operatorText,
    utility: styles.utilityText,
    danger: styles.dangerText,
    equals: styles.equalsText,
  }[variant];
}

function getIconColor(textStyle: StyleProp<TextStyle>) {
  if (!textStyle || Array.isArray(textStyle)) {
    return lightTheme.utilityText;
  }

  return 'color' in textStyle && typeof textStyle.color === 'string'
    ? textStyle.color
    : lightTheme.utilityText;
}

function createStyles(theme: typeof lightTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
    },
    safeArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    shell: {
      flex: 1,
      width: '100%',
      maxWidth: 460,
      paddingHorizontal: 18,
      paddingBottom: 16,
      paddingTop: 10,
    },
    header: {
      minHeight: 44,
      justifyContent: 'center',
    },
    title: {
      color: theme.muted,
      fontSize: 18,
      fontWeight: '600',
      letterSpacing: 0,
    },
    display: {
      flex: 1,
      justifyContent: 'flex-end',
      alignItems: 'stretch',
      paddingBottom: 28,
      minHeight: 180,
    },
    expression: {
      color: theme.muted,
      fontSize: 24,
      lineHeight: 32,
      minHeight: 34,
      textAlign: 'right',
      letterSpacing: 0,
      fontVariant: ['tabular-nums'],
    },
    result: {
      color: theme.display,
      fontSize: 62,
      lineHeight: 74,
      fontWeight: '500',
      textAlign: 'right',
      letterSpacing: 0,
      fontVariant: ['tabular-nums'],
    },
    errorResult: {
      color: theme.dangerText,
      fontSize: 34,
      lineHeight: 44,
    },
    keypad: {
      gap: 10,
    },
    keyRow: {
      flexDirection: 'row',
      gap: 10,
    },
    key: {
      alignItems: 'center',
      aspectRatio: 1.05,
      backgroundColor: theme.key,
      borderColor: theme.border,
      borderRadius: 28,
      borderWidth: StyleSheet.hairlineWidth,
      flex: 1,
      justifyContent: 'center',
    },
    utilityKey: {
      alignItems: 'center',
      aspectRatio: 1.05,
      backgroundColor: theme.utility,
      borderRadius: 28,
      flex: 1,
      justifyContent: 'center',
    },
    dangerKey: {
      alignItems: 'center',
      aspectRatio: 1.05,
      backgroundColor: theme.danger,
      borderRadius: 28,
      flex: 1,
      justifyContent: 'center',
    },
    operatorKey: {
      alignItems: 'center',
      aspectRatio: 1.05,
      backgroundColor: theme.operator,
      borderRadius: 28,
      flex: 1,
      justifyContent: 'center',
    },
    equalsKey: {
      alignItems: 'center',
      aspectRatio: 1.05,
      backgroundColor: theme.equals,
      borderRadius: 28,
      flex: 1,
      justifyContent: 'center',
    },
    keyText: {
      color: theme.keyText,
      fontSize: 30,
      fontWeight: '500',
      letterSpacing: 0,
    },
    utilityText: {
      color: theme.utilityText,
      fontSize: 25,
      fontWeight: '600',
      letterSpacing: 0,
    },
    dangerText: {
      color: theme.dangerText,
      fontSize: 25,
      fontWeight: '700',
      letterSpacing: 0,
    },
    operatorText: {
      color: theme.operatorText,
      fontSize: 32,
      fontWeight: '600',
      letterSpacing: 0,
    },
    equalsText: {
      color: theme.equalsText,
      fontSize: 34,
      fontWeight: '700',
      letterSpacing: 0,
    },
  });
}

const stylesShared = StyleSheet.create({
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
});
