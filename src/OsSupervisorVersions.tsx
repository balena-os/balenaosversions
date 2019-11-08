import React, { useEffect } from 'react';
import { Table, Link } from 'rendition';
import { getChangelogVersion, changelogVersion } from './utils';
import configData from './config.json';

const getCols = (supervisorAnchor: string, osAnchor: string) => [
  {
    field: 'osUpstreamRelease',
    label: 'BalenaOS upstream release',
    sortable: false,
    render: (val: any) => {
      return (
        <Link blank href={osAnchor}>
          {val}
        </Link>
      );
    }
  },
  {
    field: 'supervisorVersion',
    label: 'Supervisor version in release',
    sortable: false,
    render: (val: any) => {
      return (
        <Link blank href={supervisorAnchor}>
          {val}
        </Link>
      );
    }
  },
  {
    field: 'releaseDate',
    label: 'Release date',
    sortable: false
  }
];

export const OsSupervisorVersions = ({
  latestOs,
  supervisorVersion
}: {
  latestOs: { osVersion?: string; releaseDate?: Date };
  supervisorVersion: string;
}) => {
  const [supervisorAnchor, setSupervisorAnchor] = React.useState('');
  const [osAnchor, setOsAnchor] = React.useState('');
  const data = [
    {
      osUpstreamRelease: latestOs.osVersion || '',
      releaseDate: latestOs.releaseDate
        ? latestOs.releaseDate.toLocaleString()
        : '',
      supervisorVersion
    }
  ];

  useEffect(() => {
    if (!supervisorVersion) {
      return;
    }

    const regex = new RegExp(
      `## (${supervisorVersion.replace('v', '').replace(/\./g, '\\.')} - .*)`,
      'gim'
    );

    getChangelogVersion(
      `https://raw.githubusercontent.com/${configData.supervisorrepo}/master/CHANGELOG.md`,
      regex
    ).then(supAnchorVersion => {
      setSupervisorAnchor(
        `https://github.com/${
          configData.supervisorrepo
        }/blob/master/CHANGELOG.md#${changelogVersion(supAnchorVersion)}`
      );
    });
  }, [supervisorVersion]);

  useEffect(() => {
    if (!latestOs.osVersion) {
      return;
    }

    setOsAnchor(
      `https://github.com/${
        configData.osrepo
      }/blob/master/CHANGELOG.md#v${changelogVersion(latestOs.osVersion)}`
    );
  }, [latestOs.osVersion]);

  const columns = getCols(supervisorAnchor, osAnchor);

  return <Table<any> data={data} columns={columns} />;
};
