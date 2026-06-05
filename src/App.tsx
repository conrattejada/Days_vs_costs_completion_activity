import { AppContainer, AppHeader } from '@corva/ui/componentsV2';
import { useAppCommons } from '@corva/ui/effects';
import StepsCostGraph from './components/StepsCostGraph';

import styles from './App.scss';

const App = () => {
  const { appKey, wells, appSettings } = useAppCommons();
  const padId = appSettings?.padId;
  const settingsByAsset = appSettings?.settingsByAsset || {};
  const selectedAsset = settingsByAsset[`pad--${padId}`]?.selectedAssets?.[0] || undefined;
  const selectedAssetId = selectedAsset && wells?.find(well => well.id === String(selectedAsset))?.asset_id;
  const companyId = 375;
  // NOTE: On general type dashboard app receives wells array
  // on asset type dashboard app receives well object;
  // console.log(wells)
  return (
    <AppContainer header={<AppHeader />} testId={appKey}>
      <div className={styles.container}>
        <StepsCostGraph assetId={selectedAssetId} companyId={companyId} />
      </div>
    </AppContainer>
  );
};

// Important: Do not change root component default export (App.js). Use it as container
//  for your App. It's required to make build and zip scripts work as expected;
export default App;
