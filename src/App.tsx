import jsyaml from 'js-yaml';
import React, { useEffect } from 'react';
import { Provider, Heading, Container, Alert, Spinner, Box } from 'rendition';
import configData from './config.json';
import { OsSupervisorVersions } from './components/OsSupervisorVersions';
import { DeviceTypeVersions, DeviceTypeOsState } from './components/DeviceTypeVersions';
import {
  getChangelogVersion,
  fetchMultipleJson,
  fetchChangelog
} from './utils';
import { theme } from './theme';

const deviceTypes = configData.devicetypes;

interface DeviceTypeInfo {
  slug: string;
  name: string;
  repo: string;
  reposlug?: string;
}

interface DeviceType {
  slug: string;
  name: string;
  arch: string;
  state: string;
  buildId?: string;
}

interface Config {
  deviceTypes: DeviceType[];
}

interface Dictionary<T> {
  [key: string]: T;
}

const yoctoRegex = /version: 'yocto-(.*)'/gim;
const supervisorRegex = /SUPERVISOR_TAG \?= "(.*)"/gim;

const processConfig = (config: Config) => {
  return config.deviceTypes.reduce<Dictionary<string>>(
    (deviceVersionDict, deviceType) => {
      deviceVersionDict[deviceType.slug] = (deviceType.buildId || '').replace(
        '.prod',
        ''
      );
      return deviceVersionDict;
    },
    {}
  );
};

const getDeviceTypeRepoVersion = (deviceTypeInfo: DeviceTypeInfo) => {
  return Promise.all([
    fetchChangelog(deviceTypeInfo.repo),
    getChangelogVersion(
      `https://raw.githubusercontent.com/${
        deviceTypeInfo.repo
      }/master/${deviceTypeInfo.reposlug || deviceTypeInfo.slug}.coffee`,
      yoctoRegex
    )
  ])
    .then(([deviceRepo, yoctoVersion]) => ({
      repoInfo: jsyaml.load(deviceRepo!)[0],
      deviceTypeInfo,
      yoctoInfo: yoctoVersion
    }))
    .catch(err => {
      // Just log errors, and return an empty response.
      console.log(err);
      return {
        deviceTypeInfo,
        repoInfo: {}
      };
    });
};

const App: React.FC = () => {
  const [stagingConfig, setStagingConfig] = React.useState<Dictionary<string>>(
    {}
  );
  const [prodConfig, setProdConfig] = React.useState<Dictionary<string>>({});
  const [repoConfig, setRepoConfig] = React.useState<any>({});
  const [latestOsVersion, setLatestOsVersion] = React.useState<any>({});
  const [supervisorVersion, setSupervisorVersion] = React.useState<string>('');

  const [showSpinner, setShowSpinner] = React.useState(true);
  const [error, setError] = React.useState();

  useEffect(() => {
    fetchMultipleJson([
      `https://${configData.staging}/config`,
      `https://${configData.production}/config`
    ])
      .then(([staging, prod]) => {
        setStagingConfig(processConfig(staging as Config));
        setProdConfig(processConfig(prod as Config));
      })
      .catch(e => setError(e.message))
      .finally(() => setShowSpinner(false));
  }, []);

  useEffect(() => {
    deviceTypes
      .map(dt => getDeviceTypeRepoVersion(dt))
      .forEach(res => {
        res.then(repoResponse => {
          setRepoConfig((repoConfig: any) => ({
            ...repoConfig,
            [repoResponse.deviceTypeInfo.slug]: repoResponse
          }));
        });
      });
  }, []);

  useEffect(() => {
    Promise.all([
      fetchChangelog(configData.osrepo),
      getChangelogVersion(
        `https://raw.githubusercontent.com/${configData.osrepo}/master/meta-balena-common/recipes-containers/resin-supervisor/resin-supervisor.inc`,
        supervisorRegex
      )
    ])
      .then(([data, supervisorVersion]) => {
        const doc = jsyaml.load(data!)[0];
        const osVersion = doc.version;
        const releaseDate = doc.date;
        setLatestOsVersion({ osVersion, releaseDate });
        setSupervisorVersion(supervisorVersion);
        return osVersion;
      })
      .then(osVersion => {
        // Check potential patched verion on branch A.B.x (if released version is A.B.C)
        var patchOsBranch = osVersion.replace(/(.*\..*\.).*/, '$1x');
        Promise.all([
          fetchChangelog(configData.osrepo, patchOsBranch),
          getChangelogVersion(
            `https://raw.githubusercontent.com/${configData.osrepo}/${patchOsBranch}/meta-resin-common/recipes-containers/resin-supervisor/resin-supervisor.inc`,
            supervisorRegex
          )
        ])
          .then(([data, patchSupervisorVersion]) => {
            const doc = jsyaml.load(data!)[0];
            const osPatchVersion = doc.version;
            const patchReleaseDate = doc.date;
            if (osPatchVersion !== osVersion) {
              console.log(
                `Overriding ${osVersion} with patch version ${osPatchVersion}`
              );
              setLatestOsVersion({ osPatchVersion, patchReleaseDate });
              setSupervisorVersion(patchSupervisorVersion);
            }
          })
          .catch(err => {
            console.log(err);
          });
      })
      .catch(err => {
        console.log(err);
      });
  }, []);

  const data: DeviceTypeOsState[] = deviceTypes.map(x => ({
    deviceType: x.name,
    latestRepoVersion: repoConfig[x.slug],
    latestStagingVersion: stagingConfig[x.slug],
    latestProductionVersion: prodConfig[x.slug]
  }));

  return (
    <Provider theme={theme}>
      <Container>
        <Heading.h2 mb={5}>
          BalenaOS Latest Versions{' '}
          <Spinner my={3} show={showSpinner} label="Fetching data..." />
        </Heading.h2>
        {error && (
          <Alert my={3} danger>
            {error}
          </Alert>
        )}
        <Box mb={4}>
          <Heading.h4 mb={2}>Upstream Os Version</Heading.h4>
          <OsSupervisorVersions
            latestOs={latestOsVersion}
            supervisorVersion={supervisorVersion}
          />
        </Box>

        <Box>
          <Heading.h4 mb={2}>Device Type Os Versions</Heading.h4>
          <DeviceTypeVersions latestOs={latestOsVersion} data={data} />
        </Box>
      </Container>
    </Provider>
  );
};

export default App;
