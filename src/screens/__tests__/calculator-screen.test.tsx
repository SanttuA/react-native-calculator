import { fireEvent, render, screen } from '@testing-library/react-native';

import { CalculatorScreen } from '@/screens/calculator-screen';

function pressKeys(testIDs: string[]) {
  testIDs.forEach((testID) => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

describe('CalculatorScreen', () => {
  it('renders the display and all automation keys', () => {
    render(<CalculatorScreen />);

    expect(screen.getByText('Laskin')).toBeOnTheScreen();
    expect(screen.getByTestId('display-expression')).toBeOnTheScreen();
    expect(screen.getByTestId('display-result')).toHaveTextContent('0');

    [
      'key-0',
      'key-1',
      'key-2',
      'key-3',
      'key-4',
      'key-5',
      'key-6',
      'key-7',
      'key-8',
      'key-9',
      'key-add',
      'key-subtract',
      'key-multiply',
      'key-divide',
      'key-equals',
      'key-clear',
      'key-backspace',
      'key-percent',
      'key-decimal',
      'key-sign',
    ].forEach((testID) => {
      expect(screen.getByTestId(testID)).toBeOnTheScreen();
    });
  });

  it('computes a basic addition flow', () => {
    render(<CalculatorScreen />);

    pressKeys(['key-1', 'key-2', 'key-add', 'key-7', 'key-equals']);

    expect(screen.getByTestId('display-expression')).toHaveTextContent('12 + 7 =');
    expect(screen.getByTestId('display-result')).toHaveTextContent('19');
  });

  it.each([
    {
      name: 'subtraction',
      keys: ['key-9', 'key-subtract', 'key-4', 'key-equals'],
      expression: '9 - 4 =',
      result: '5',
    },
    {
      name: 'multiplication',
      keys: ['key-6', 'key-multiply', 'key-7', 'key-equals'],
      expression: '6 \u00d7 7 =',
      result: '42',
    },
    {
      name: 'division',
      keys: ['key-8', 'key-divide', 'key-2', 'key-equals'],
      expression: '8 \u00f7 2 =',
      result: '4',
    },
  ])('computes $name from button presses', ({ keys, expression, result }) => {
    render(<CalculatorScreen />);

    pressKeys(keys);

    expect(screen.getByTestId('display-expression')).toHaveTextContent(expression);
    expect(screen.getByTestId('display-result')).toHaveTextContent(result);
  });

  it('computes a decimal multiplication flow', () => {
    render(<CalculatorScreen />);

    pressKeys(['key-1', 'key-decimal', 'key-2', 'key-multiply', 'key-3', 'key-equals']);

    expect(screen.getByTestId('display-expression')).toHaveTextContent('1.2 \u00d7 3 =');
    expect(screen.getByTestId('display-result')).toHaveTextContent('3.6');
  });

  it('uses sign toggle in a calculation', () => {
    render(<CalculatorScreen />);

    pressKeys(['key-5', 'key-sign', 'key-multiply', 'key-3', 'key-equals']);

    expect(screen.getByTestId('display-expression')).toHaveTextContent('-5 \u00d7 3 =');
    expect(screen.getByTestId('display-result')).toHaveTextContent('-15');
  });

  it('applies percentage before completing a calculation', () => {
    render(<CalculatorScreen />);

    pressKeys([
      'key-2',
      'key-0',
      'key-0',
      'key-add',
      'key-1',
      'key-0',
      'key-percent',
      'key-equals',
    ]);

    expect(screen.getByTestId('display-expression')).toHaveTextContent('200 + 20 =');
    expect(screen.getByTestId('display-result')).toHaveTextContent('220');
  });

  it('uses backspace to correct input before evaluating', () => {
    render(<CalculatorScreen />);

    pressKeys(['key-1', 'key-2', 'key-backspace', 'key-add', 'key-3', 'key-equals']);

    expect(screen.getByTestId('display-expression')).toHaveTextContent('1 + 3 =');
    expect(screen.getByTestId('display-result')).toHaveTextContent('4');
  });

  it('repeats the last operation when equals is pressed again', () => {
    render(<CalculatorScreen />);

    pressKeys(['key-2', 'key-add', 'key-3', 'key-equals', 'key-equals']);

    expect(screen.getByTestId('display-expression')).toHaveTextContent('5 + 3 =');
    expect(screen.getByTestId('display-result')).toHaveTextContent('8');
  });

  it('clears the display', () => {
    render(<CalculatorScreen />);

    pressKeys(['key-9', 'key-clear']);

    expect(screen.getByTestId('display-result')).toHaveTextContent('0');
  });

  it('shows an accessible divide-by-zero error', () => {
    render(<CalculatorScreen />);

    pressKeys(['key-8', 'key-divide', 'key-0', 'key-equals']);

    expect(screen.getByTestId('display-result')).toHaveTextContent('Cannot divide by zero');
  });

  it('starts a new calculation after a divide-by-zero error', () => {
    render(<CalculatorScreen />);

    pressKeys(['key-8', 'key-divide', 'key-0', 'key-equals', 'key-4']);

    expect(screen.getByTestId('display-expression')).toHaveTextContent('');
    expect(screen.getByTestId('display-result')).toHaveTextContent('4');
  });
});
