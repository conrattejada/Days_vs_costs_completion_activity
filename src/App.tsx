import { AppContainer, AppHeader } from '@corva/ui/componentsV2';
import { useAppCommons } from '@corva/ui/effects';

import { DEFAULT_SETTINGS } from './constants';
import logo from './assets/logo.svg';
import StepsCostGraph from './components/StepsCostGraph';

import styles from './App.scss';

const App = () => {
  const { appKey, fracFleet, well, wells, appSettings } = useAppCommons();
  const { isExampleCheckboxChecked = DEFAULT_SETTINGS.isExampleCheckboxChecked } =
    appSettings || {};
  // NOTE: On general type dashboard app receives wells array
  // on asset type dashboard app receives well object
  const wellsList = wells || [well];

  return (
    <AppContainer header={<AppHeader />} testId={appKey}>
      <div className={styles.container}>
        <StepsCostGraph />
      </div>
    </AppContainer>
  );
};

// Important: Do not change root component default export (App.js). Use it as container
//  for your App. It's required to make build and zip scripts work as expected;
export default App;
