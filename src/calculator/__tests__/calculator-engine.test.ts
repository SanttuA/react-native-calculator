import {
  applyCalculatorAction,
  formatDisplay,
  initialCalculatorState,
  type CalculatorAction,
  type CalculatorOperator,
} from '@/calculator/calculator-engine';

function runActions(actions: CalculatorAction[]) {
  return actions.reduce(applyCalculatorAction, initialCalculatorState);
}

function digit(digitValue: string): CalculatorAction {
  return { type: 'digit', digit: digitValue };
}

function operator(operatorValue: CalculatorOperator): CalculatorAction {
  return { type: 'operator', operator: operatorValue };
}

describe('calculator engine', () => {
  it('composes integer and decimal input', () => {
    const state = runActions([digit('1'), digit('2'), { type: 'decimal' }, digit('3')]);

    expect(state.displayValue).toBe('12.3');
    expect(formatDisplay(state.displayValue)).toBe('12.3');
  });

  it('ignores duplicate decimal points', () => {
    const state = runActions([digit('1'), { type: 'decimal' }, digit('2'), { type: 'decimal' }]);

    expect(state.displayValue).toBe('1.2');
  });

  it('replaces an operator before the next operand starts', () => {
    const state = runActions([
      digit('1'),
      digit('2'),
      { type: 'operator', operator: 'add' },
      { type: 'operator', operator: 'subtract' },
    ]);

    expect(state.pendingOperator).toBe('subtract');
    expect(state.expression).toBe('12 -');
  });

  it('handles sign toggle and backspace', () => {
    const state = runActions([digit('1'), digit('2'), { type: 'sign' }, { type: 'backspace' }]);

    expect(state.displayValue).toBe('-1');
  });

  it('uses decimal arithmetic for exact common decimal sums', () => {
    const state = runActions([
      digit('0'),
      { type: 'decimal' },
      digit('1'),
      { type: 'operator', operator: 'add' },
      digit('0'),
      { type: 'decimal' },
      digit('2'),
      { type: 'equals' },
    ]);

    expect(state.displayValue).toBe('0.3');
    expect(formatDisplay(state.displayValue)).toBe('0.3');
  });

  it.each([
    {
      name: 'subtraction',
      actions: [digit('9'), operator('subtract'), digit('4'), { type: 'equals' }],
      displayValue: '5',
      expression: '9 - 4 =',
    },
    {
      name: 'multiplication',
      actions: [digit('6'), operator('multiply'), digit('7'), { type: 'equals' }],
      displayValue: '42',
      expression: '6 \u00d7 7 =',
    },
    {
      name: 'division',
      actions: [digit('8'), operator('divide'), digit('2'), { type: 'equals' }],
      displayValue: '4',
      expression: '8 \u00f7 2 =',
    },
    {
      name: 'decimal multiplication',
      actions: [
        digit('1'),
        { type: 'decimal' },
        digit('2'),
        operator('multiply'),
        digit('3'),
        { type: 'equals' },
      ],
      displayValue: '3.6',
      expression: '1.2 \u00d7 3 =',
    },
    {
      name: 'decimal division',
      actions: [
        digit('7'),
        { type: 'decimal' },
        digit('5'),
        operator('divide'),
        digit('2'),
        { type: 'decimal' },
        digit('5'),
        { type: 'equals' },
      ],
      displayValue: '3',
      expression: '7.5 \u00f7 2.5 =',
    },
    {
      name: 'negative result',
      actions: [digit('4'), operator('subtract'), digit('9'), { type: 'equals' }],
      displayValue: '-5',
      expression: '4 - 9 =',
    },
    {
      name: 'mixed sign operation',
      actions: [digit('5'), { type: 'sign' }, operator('multiply'), digit('3'), { type: 'equals' }],
      displayValue: '-15',
      expression: '-5 \u00d7 3 =',
    },
  ] satisfies {
    name: string;
    actions: CalculatorAction[];
    displayValue: string;
    expression: string;
  }[])('evaluates $name', ({ actions, displayValue, expression }) => {
    const state = runActions(actions);

    expect(state.displayValue).toBe(displayValue);
    expect(state.expression).toBe(expression);
    expect(state.error).toBeNull();
  });

  it('supports add/subtract percentage relative to the pending value', () => {
    const state = runActions([
      digit('2'),
      digit('0'),
      digit('0'),
      { type: 'operator', operator: 'add' },
      digit('1'),
      digit('0'),
      { type: 'percent' },
      { type: 'equals' },
    ]);

    expect(state.displayValue).toBe('220');
  });

  it('supports subtract percentage relative to the pending value', () => {
    const state = runActions([
      digit('2'),
      digit('0'),
      digit('0'),
      operator('subtract'),
      digit('1'),
      digit('0'),
      { type: 'percent' },
      { type: 'equals' },
    ]);

    expect(state.displayValue).toBe('180');
    expect(state.expression).toBe('200 - 20 =');
  });

  it('uses simple percentage for non-additive operations', () => {
    const state = runActions([
      digit('5'),
      digit('0'),
      operator('multiply'),
      digit('2'),
      digit('0'),
      { type: 'percent' },
      { type: 'equals' },
    ]);

    expect(state.displayValue).toBe('10');
    expect(state.expression).toBe('50 \u00d7 0.2 =');
  });

  it('evaluates chained operations left to right', () => {
    const state = runActions([
      digit('2'),
      { type: 'operator', operator: 'add' },
      digit('3'),
      { type: 'operator', operator: 'multiply' },
      digit('4'),
      { type: 'equals' },
    ]);

    expect(state.displayValue).toBe('20');
  });

  it('repeats the last operation when equals is pressed again', () => {
    const state = runActions([
      digit('2'),
      { type: 'operator', operator: 'add' },
      digit('3'),
      { type: 'equals' },
      { type: 'equals' },
    ]);

    expect(state.displayValue).toBe('8');
    expect(state.expression).toBe('5 + 3 =');
  });

  it('starts a new number after equals when a digit is entered', () => {
    const state = runActions([
      digit('2'),
      operator('add'),
      digit('3'),
      { type: 'equals' },
      digit('9'),
    ]);

    expect(state.displayValue).toBe('9');
    expect(state.expression).toBe('2 + 3 =');
    expect(state.lastOperation).toBeNull();
  });

  it('continues calculating from a result when an operator is entered', () => {
    const state = runActions([
      digit('2'),
      operator('add'),
      digit('3'),
      { type: 'equals' },
      operator('multiply'),
      digit('4'),
      { type: 'equals' },
    ]);

    expect(state.displayValue).toBe('20');
    expect(state.expression).toBe('5 \u00d7 4 =');
  });

  it('lets backspace clear the fresh operand after choosing an operator', () => {
    const state = runActions([digit('8'), operator('add'), { type: 'backspace' }]);

    expect(state.displayValue).toBe('0');
    expect(state.expression).toBe('8 +');
    expect(state.pendingOperator).toBe('add');
    expect(state.waitingForOperand).toBe(false);
  });

  it('resets the display when backspace is pressed after a result', () => {
    const state = runActions([
      digit('8'),
      operator('divide'),
      digit('2'),
      { type: 'equals' },
      { type: 'backspace' },
    ]);

    expect(state.displayValue).toBe('0');
    expect(state.expression).toBe('');
    expect(state.waitingForOperand).toBe(false);
  });

  it('limits manual digit input to sixteen digits', () => {
    const state = runActions('12345678901234567'.split('').map(digit));

    expect(state.displayValue).toBe('1234567890123456');
    expect(countDigits(state.displayValue)).toBe(16);
  });

  it('starts decimal input after an operator with zero point', () => {
    const state = runActions([digit('5'), operator('add'), { type: 'decimal' }, digit('7')]);

    expect(state.displayValue).toBe('0.7');
    expect(state.pendingValue).toBe('5');
    expect(state.pendingOperator).toBe('add');
  });

  it('recovers from divide-by-zero when the next digit is entered', () => {
    const state = runActions([
      digit('8'),
      operator('divide'),
      digit('0'),
      { type: 'equals' },
      digit('4'),
    ]);

    expect(state.error).toBeNull();
    expect(state.expression).toBe('');
    expect(state.displayValue).toBe('4');
  });

  it('reports divide-by-zero as an error state', () => {
    const state = runActions([
      digit('8'),
      { type: 'operator', operator: 'divide' },
      digit('0'),
      { type: 'equals' },
    ]);

    expect(state.error).toBe('Cannot divide by zero');
    expect(state.expression).toBe('8 \u00f7 0 =');
  });

  it('clears back to the initial state', () => {
    const state = runActions([digit('9'), { type: 'clear' }]);

    expect(state).toEqual(initialCalculatorState);
  });
});

function countDigits(value: string): number {
  return value.replace(/\D/g, '').length;
}
