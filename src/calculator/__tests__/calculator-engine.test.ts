import {
  applyCalculatorAction,
  formatDisplay,
  initialCalculatorState,
  type CalculatorAction,
} from '@/calculator/calculator-engine';

function runActions(actions: CalculatorAction[]) {
  return actions.reduce(applyCalculatorAction, initialCalculatorState);
}

function digit(digitValue: string): CalculatorAction {
  return { type: 'digit', digit: digitValue };
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
