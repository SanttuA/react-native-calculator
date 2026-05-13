require('@testing-library/react-native/build/matchers/extend-expect');

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    SafeAreaView: ({ children, style, ...props }) =>
      React.createElement(View, { style, ...props }, children),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  };
});
