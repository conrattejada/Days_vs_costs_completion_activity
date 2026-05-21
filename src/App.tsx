import { AppContainer, AppHeader } from '@corva/ui/componentsV2';
import { useAppCommons } from '@corva/ui/effects';

import { DEFAULT_SETTINGS } from './constants';
import logo from './assets/logo.svg';

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
        <img src={logo} alt="logo" className={styles.logo} />
        <p>
          Edit <code>src/App.js</code> and save to reload.
          <br />
          <br />
        </p>
        <p>
          Frac Fleet: <span data-testid="fracFleet">{fracFleet?.name || 'No Frac Fleet'}</span>
          <br />
          Wells: <span data-testid="wellsList">{wellsList.map(well => well?.name).join(', ')}</span>
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </div>
      <div>
        Settings &quot;Example&quot; checkbox is{' '}
        <span data-testid="exampleCheckboxState">
          {isExampleCheckboxChecked ? 'checked' : 'unchecked'}
        </span>
      </div>
    </AppContainer>
  );
};

// Important: Do not change root component default export (App.js). Use it as container
//  for your App. It's required to make build and zip scripts work as expected;
export default App;
