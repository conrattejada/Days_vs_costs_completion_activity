import { Checkbox, FormControlLabel } from '@material-ui/core';
import { useAppCommons } from '@corva/ui/effects';

import { DEFAULT_SETTINGS } from './constants';

const AppSettings = () => {
  const { appSettings, onSettingChange } = useAppCommons();
  const settings = { ...DEFAULT_SETTINGS, ...appSettings };

  return (
    <div>
      <FormControlLabel
        label="Example checkbox"
        control={
          <Checkbox
            data-testid="exampleCheckbox"
            checked={settings.isExampleCheckboxChecked}
            onChange={e => onSettingChange('isExampleCheckboxChecked', e.target.checked)}
          />
        }
      />
    </div>
  );
};

// Important: Do not change root component default export (AppSettings.js). Use it as container
//  for your App Settings. It's required to make build and zip scripts work as expected;
export default AppSettings;
