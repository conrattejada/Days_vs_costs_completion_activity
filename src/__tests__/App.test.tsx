import { render, screen } from '@testing-library/react';
import { AppTestWrapper } from '@corva/ui/testing';

import App from '../App';
import { mockAppSettings } from '../__mocks__/mockData';

describe('<App />', () => {
  it('should show correct layout', () => {
    render(
      <AppTestWrapper appSettings={mockAppSettings}>
        <App />
      </AppTestWrapper>
    );

    screen.getByText(/checked/i);
  });

  it('should show correct layout when settings are not provided', () => {
    render(
      <AppTestWrapper appSettings={{}}>
        <App />
      </AppTestWrapper>
    );

    screen.getByText(/unchecked/i);
  });
});
