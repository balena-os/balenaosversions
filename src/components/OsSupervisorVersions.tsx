import React, { useEffect } from 'react';
import { Table, Link, TableColumn } from 'rendition';
import {
  getChangelogVersion,
  changelogVersion,
  getChangelogLink
} from '../utils';
import configData from '../config.json';

export interface LatestOsSupervisorState {
  osUpstreamRelease: string;
  latestSupervisorVersion: string;
  releaseDate: string;
}

const getCols = <T extends any>(supervisorAnchor: string, osAnchor: string): TableColumn<T>[] => [
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
    field: 'latestSupervisorVersion',
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
  const data: LatestOsSupervisorState[] = [
    {
      osUpstreamRelease: latestOs.osVersion || '',
      releaseDate: latestOs.releaseDate
        ? latestOs.releaseDate.toLocaleString()
        : '',
      latestSupervisorVersion: supervisorVersion
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

    setOsAnchor(getChangelogLink(configData.osrepo, latestOs.osVersion));
  }, [latestOs.osVersion]);

  const columns = getCols<LatestOsSupervisorState>(supervisorAnchor, osAnchor);
  return <Table<LatestOsSupervisorState> data={data} columns={columns} />;
};
