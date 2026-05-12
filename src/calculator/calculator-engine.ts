import { Decimal } from 'decimal.js';

Decimal.set({ precision: 32, rounding: Decimal.ROUND_HALF_UP });

export type CalculatorOperator = 'add' | 'subtract' | 'multiply' | 'divide';

export type CalculatorAction =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'operator'; operator: CalculatorOperator }
  | { type: 'equals' }
  | { type: 'clear' }
  | { type: 'backspace' }
  | { type: 'sign' }
  | { type: 'percent' };

export type LastOperation = {
  operator: CalculatorOperator;
  operand: string;
};

export type CalculatorState = {
  displayValue: string;
  expression: string;
  pendingValue: string | null;
  pendingOperator: CalculatorOperator | null;
  waitingForOperand: boolean;
  lastOperation: LastOperation | null;
  error: string | null;
};

const MAX_INPUT_DIGITS = 16;
const DISPLAY_SIGNIFICANT_DIGITS = 12;

export const operatorSymbols: Record<CalculatorOperator, string> = {
  add: '+',
  subtract: '-',
  multiply: '\u00d7',
  divide: '\u00f7',
};

export const initialCalculatorState: CalculatorState = {
  displayValue: '0',
  expression: '',
  pendingValue: null,
  pendingOperator: null,
  waitingForOperand: false,
  lastOperation: null,
  error: null,
};

export function applyCalculatorAction(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  if (action.type === 'clear') {
    return initialCalculatorState;
  }

  if (state.error) {
    return applyAfterError(action);
  }

  switch (action.type) {
    case 'digit':
      return inputDigit(state, action.digit);
    case 'decimal':
      return inputDecimal(state);
    case 'operator':
      return chooseOperator(state, action.operator);
    case 'equals':
      return evaluate(state);
    case 'backspace':
      return backspace(state);
    case 'sign':
      return toggleSign(state);
    case 'percent':
      return percent(state);
    default:
      return state;
  }
}

export function formatDisplay(value: string | number | Decimal): string {
  const rawValue = String(value);

  if (!rawValue || rawValue === 'NaN' || rawValue === 'Infinity' || rawValue === '-Infinity') {
    return 'Error';
  }

  const trailingDecimal = rawValue.endsWith('.');
  const numericValue = trailingDecimal ? rawValue.slice(0, -1) : rawValue;
  const normalizedValue = numericValue === '-0' ? '0' : numericValue;
  const decimal = new Decimal(normalizedValue || '0');
  const keepsNegativeZero = rawValue.startsWith('-') && decimal.isZero();

  if (decimal.isZero()) {
    return `${keepsNegativeZero ? '-' : ''}0${trailingDecimal ? '.' : ''}`;
  }

  const absolute = decimal.abs();

  if (
    absolute.greaterThanOrEqualTo('1000000000000') ||
    (absolute.greaterThan(0) && absolute.lessThan('0.000000001'))
  ) {
    return trimExponential(decimal.toSignificantDigits(DISPLAY_SIGNIFICANT_DIGITS).toExponential());
  }

  let plain = decimal.toFixed();
  const digitsOnly = plain.replace('-', '').replace('.', '');

  if (digitsOnly.length > DISPLAY_SIGNIFICANT_DIGITS) {
    plain = decimal.toSignificantDigits(DISPLAY_SIGNIFICANT_DIGITS).toString();
  }

  if (plain.includes('e')) {
    return trimExponential(plain);
  }

  plain = trimFraction(plain);
  const [integerPart, fractionalPart] = plain.split('.');
  const grouped = groupInteger(integerPart);
  const fraction = fractionalPart ? `.${fractionalPart}` : '';

  return `${grouped}${fraction}${trailingDecimal ? '.' : ''}`;
}

function applyAfterError(action: CalculatorAction): CalculatorState {
  if (action.type === 'digit' || action.type === 'decimal') {
    return applyCalculatorAction(initialCalculatorState, action);
  }

  return initialCalculatorState;
}

function inputDigit(state: CalculatorState, digit: string): CalculatorState {
  if (!/^\d$/.test(digit)) {
    return state;
  }

  if (state.waitingForOperand) {
    return {
      ...state,
      displayValue: digit,
      waitingForOperand: false,
      lastOperation: null,
    };
  }

  if (countDigits(state.displayValue) >= MAX_INPUT_DIGITS) {
    return state;
  }

  if (state.displayValue === '0') {
    return { ...state, displayValue: digit, lastOperation: null };
  }

  if (state.displayValue === '-0') {
    return { ...state, displayValue: `-${digit}`, lastOperation: null };
  }

  return { ...state, displayValue: `${state.displayValue}${digit}`, lastOperation: null };
}

function inputDecimal(state: CalculatorState): CalculatorState {
  if (state.waitingForOperand) {
    return {
      ...state,
      displayValue: '0.',
      waitingForOperand: false,
      lastOperation: null,
    };
  }

  if (state.displayValue.includes('.')) {
    return state;
  }

  return { ...state, displayValue: `${state.displayValue}.`, lastOperation: null };
}

function chooseOperator(state: CalculatorState, operator: CalculatorOperator): CalculatorState {
  if (state.pendingOperator && state.waitingForOperand) {
    return {
      ...state,
      pendingOperator: operator,
      expression: `${formatDisplay(state.pendingValue ?? state.displayValue)} ${operatorSymbols[operator]}`,
    };
  }

  const inputValue = normalizeNumber(state.displayValue);

  if (state.pendingValue && state.pendingOperator) {
    const result = compute(state.pendingValue, state.pendingOperator, inputValue);

    if (result.error) {
      return result.error;
    }

    return {
      ...state,
      displayValue: result.value,
      expression: `${formatDisplay(result.value)} ${operatorSymbols[operator]}`,
      pendingValue: result.value,
      pendingOperator: operator,
      waitingForOperand: true,
      lastOperation: null,
    };
  }

  return {
    ...state,
    expression: `${formatDisplay(inputValue)} ${operatorSymbols[operator]}`,
    pendingValue: inputValue,
    pendingOperator: operator,
    waitingForOperand: true,
    lastOperation: null,
  };
}

function evaluate(state: CalculatorState): CalculatorState {
  if (state.pendingOperator && state.pendingValue) {
    const operand = state.waitingForOperand
      ? state.pendingValue
      : normalizeNumber(state.displayValue);
    const result = compute(state.pendingValue, state.pendingOperator, operand);
    const expression = `${formatDisplay(state.pendingValue)} ${
      operatorSymbols[state.pendingOperator]
    } ${formatDisplay(operand)} =`;

    if (result.error) {
      return { ...result.error, expression };
    }

    return {
      ...state,
      displayValue: result.value,
      expression,
      pendingValue: null,
      pendingOperator: null,
      waitingForOperand: true,
      lastOperation: {
        operator: state.pendingOperator,
        operand,
      },
    };
  }

  if (state.lastOperation) {
    const inputValue = normalizeNumber(state.displayValue);
    const result = compute(inputValue, state.lastOperation.operator, state.lastOperation.operand);
    const expression = `${formatDisplay(inputValue)} ${
      operatorSymbols[state.lastOperation.operator]
    } ${formatDisplay(state.lastOperation.operand)} =`;

    if (result.error) {
      return { ...result.error, expression };
    }

    return {
      ...state,
      displayValue: result.value,
      expression,
      waitingForOperand: true,
    };
  }

  return state;
}

function backspace(state: CalculatorState): CalculatorState {
  if (state.waitingForOperand) {
    return {
      ...state,
      displayValue: '0',
      expression: state.pendingOperator ? state.expression : '',
      waitingForOperand: false,
      lastOperation: null,
    };
  }

  if (state.displayValue.length === 1 || /^-\d$/.test(state.displayValue)) {
    return { ...state, displayValue: '0', lastOperation: null };
  }

  return {
    ...state,
    displayValue: state.displayValue.slice(0, -1),
    lastOperation: null,
  };
}

function toggleSign(state: CalculatorState): CalculatorState {
  const displayValue = state.displayValue.startsWith('-')
    ? state.displayValue.slice(1)
    : `-${state.displayValue}`;

  return {
    ...state,
    displayValue,
    waitingForOperand: false,
    lastOperation: null,
  };
}

function percent(state: CalculatorState): CalculatorState {
  if (state.waitingForOperand) {
    return state;
  }

  const inputValue = normalizeNumber(state.displayValue);
  let percentage: Decimal;

  if (
    state.pendingValue &&
    (state.pendingOperator === 'add' || state.pendingOperator === 'subtract')
  ) {
    percentage = new Decimal(state.pendingValue).times(inputValue).dividedBy(100);
  } else {
    percentage = new Decimal(inputValue).dividedBy(100);
  }

  const displayValue = percentage.toString();

  return {
    ...state,
    displayValue,
    expression:
      state.pendingOperator && state.pendingValue
        ? `${formatDisplay(state.pendingValue)} ${operatorSymbols[state.pendingOperator]} ${formatDisplay(
            displayValue,
          )}`
        : state.expression,
    lastOperation: null,
  };
}

function compute(
  left: string,
  operator: CalculatorOperator,
  right: string,
): { value: string; error?: never } | { value?: never; error: CalculatorState } {
  const leftValue = new Decimal(normalizeNumber(left));
  const rightValue = new Decimal(normalizeNumber(right));

  if (operator === 'divide' && rightValue.isZero()) {
    return {
      error: {
        ...initialCalculatorState,
        expression: `${formatDisplay(left)} ${operatorSymbols.divide} ${formatDisplay(right)} =`,
        error: 'Cannot divide by zero',
        waitingForOperand: true,
      },
    };
  }

  const result = {
    add: leftValue.plus(rightValue),
    subtract: leftValue.minus(rightValue),
    multiply: leftValue.times(rightValue),
    divide: leftValue.dividedBy(rightValue),
  }[operator];

  return { value: result.toString() };
}

function normalizeNumber(value: string): string {
  if (!value || value === '-' || value === '.' || value === '-.') {
    return '0';
  }

  return new Decimal(value).toString();
}

function countDigits(value: string): number {
  return value.replace(/\D/g, '').length;
}

function trimFraction(value: string): string {
  return value.includes('.') ? value.replace(/\.?0+$/, '') : value;
}

function groupInteger(value: string): string {
  const sign = value.startsWith('-') ? '-' : '';
  const integer = sign ? value.slice(1) : value;

  return `${sign}${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function trimExponential(value: string): string {
  return value
    .replace(/(\.\d*?[1-9])0+e/, '$1e')
    .replace(/\.0+e/, 'e')
    .replace('e+', 'e');
}
