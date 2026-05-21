import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppTestWrapper } from '@corva/ui/testing';

import AppSettings from '../AppSettings';

describe('<AppSettings />', () => {
  it('should call onChange with a changed setting on settings change', async () => {
    const handleSettingChange = jest.fn();

    render(
      <AppTestWrapper
        appSettings={{ isExampleCheckboxChecked: true }}
        onSettingChange={handleSettingChange}
      >
        <AppSettings />
      </AppTestWrapper>
    );

    const exampleCheckbox = screen.getByRole('checkbox', { name: /example/i });

    await act(async () => {
      await userEvent.click(exampleCheckbox);
    });

    expect(handleSettingChange).toBeCalledWith('isExampleCheckboxChecked', false);
  });
});
