import React from 'react';
import { Table, Link, Box, Txt } from 'rendition';
import { changelogVersion } from './utils';

const getChangelogLink = (repo: string, version: string) => {
  return `https://github.com/${repo}/blob/master/CHANGELOG.md#v${changelogVersion(
    version
  )}`;
};

const getCols = (latestOsVersion?: string) => [
  {
    field: 'deviceType',
    label: 'Device Type',
    sortable: true
  },
  {
    field: 'repoVersion',
    label: 'Repo Version',
    sortable: true,
    render: (val: any) => {
      if (!val) {
        return null;
      }

      const date = new Date(val.repoInfo.date);
      const bg = latestOsVersion
        ? val.repoInfo.version.startsWith(latestOsVersion)
          ? 'lightgreen'
          : 'cornsilk'
        : 'transparent';

      return (
        <Box bg={bg}>
          <Link
            blank
            href={getChangelogLink(
              val.deviceTypeInfo.repo,
              val.repoInfo.version
            )}
          >
            {val.repoInfo.version}
          </Link>
          <Txt.span> ({val.yoctoInfo})</Txt.span>
          <Txt.span tooltip={date.toUTCString()} color="text.light">
            {' '}
            ({date.toLocaleDateString()})
          </Txt.span>
        </Box>
      );
    }
  },
  {
    field: 'stagingVersion',
    label: 'Staging Version',
    sortable: true
  },
  {
    field: 'productionVersion',
    label: 'Production Version',
    sortable: true
  }
];

export const DeviceTypeVersions = ({
  latestOs,
  data
}: {
  latestOs: { osVersion: string; releaseDate: string };
  data: any;
}) => {
  return <Table<any> data={data} columns={getCols(latestOs.osVersion)} />;
};
