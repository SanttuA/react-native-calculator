import { fireEvent, render, screen } from '@testing-library/react-native';

import { CalculatorScreen } from '@/screens/calculator-screen';

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

    fireEvent.press(screen.getByTestId('key-1'));
    fireEvent.press(screen.getByTestId('key-2'));
    fireEvent.press(screen.getByTestId('key-add'));
    fireEvent.press(screen.getByTestId('key-7'));
    fireEvent.press(screen.getByTestId('key-equals'));

    expect(screen.getByTestId('display-expression')).toHaveTextContent('12 + 7 =');
    expect(screen.getByTestId('display-result')).toHaveTextContent('19');
  });

  it('clears the display', () => {
    render(<CalculatorScreen />);

    fireEvent.press(screen.getByTestId('key-9'));
    fireEvent.press(screen.getByTestId('key-clear'));

    expect(screen.getByTestId('display-result')).toHaveTextContent('0');
  });

  it('shows an accessible divide-by-zero error', () => {
    render(<CalculatorScreen />);

    fireEvent.press(screen.getByTestId('key-8'));
    fireEvent.press(screen.getByTestId('key-divide'));
    fireEvent.press(screen.getByTestId('key-0'));
    fireEvent.press(screen.getByTestId('key-equals'));

    expect(screen.getByTestId('display-result')).toHaveTextContent('Cannot divide by zero');
  });
});
