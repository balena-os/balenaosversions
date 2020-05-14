import React from 'react';
import { Table, Link, Box, Txt, ThemeType, TableColumn } from 'rendition';
import { getChangelogLink } from '../utils';
import { withTheme } from 'styled-components';

export interface DeviceTypeOsState {
	deviceType: string;
	latestRepoVersion?: string; // TODO: Do we need/care about this?
	latestStagingVersion?: string;
	latestProductionVersion?: string;
}

interface DeviceTypeVersionsProps {
	latestOs: { osVersion: string; releaseDate: string };
	data: DeviceTypeOsState[];
	theme: ThemeType;
}

const getVersionColor = (
	latestOsVersion: string | undefined,
	value: string,
	theme: ThemeType,
) => {
	return latestOsVersion
		? value.startsWith(latestOsVersion)
			? theme.colors.success.semilight
			: theme.colors.danger.light
		: 'transparent';
};

const getCols = <T extends any>(
	latestOsVersion: string | undefined,
	theme: ThemeType,
): Array<TableColumn<T>> => [
	{
		field: 'deviceType',
		label: 'Device Type',
		sortable: true,
	},
	{
		field: 'latestRepoVersion',
		label: (
			<Txt.span tooltip="Repo version: commited to device type's code">
				Repo Version
			</Txt.span>
		),
		sortable: true,
		render: (val: any) => {
			if (!val) {
				return null;
			}

			const date = new Date(val.repoInfo.date);
			return (
				<Box bg={getVersionColor(latestOsVersion, val.repoInfo.version, theme)}>
					<Link
						blank
						href={getChangelogLink(
							val.deviceTypeInfo.repo,
							val.repoInfo.version,
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
		},
	},
	{
		field: 'latestStagingVersion',
		label: (
			<Txt.span tooltip="Version available in the balenaCloud staging environment">
				Staging Version
			</Txt.span>
		),
		sortable: true,
		render: (val: any) => {
			if (!val) {
				return null;
			}

			return (
				<Box bg={getVersionColor(latestOsVersion, val, theme)}>
					<Txt.span>{val}</Txt.span>
				</Box>
			);
		},
	},
	{
		field: 'latestProductionVersion',
		label: (
			<Txt.span tooltip="Version available in the balenaCloud production environment">
				Production Version
			</Txt.span>
		),
		sortable: true,
		render: (val: any) => {
			if (!val) {
				return null;
			}

			return (
				<Box bg={getVersionColor(latestOsVersion, val, theme)}>
					<Txt.span>{val}</Txt.span>
				</Box>
			);
		},
	},
];

const DeviceTypeVersionsBase = ({
	latestOs,
	data,
	theme,
}: DeviceTypeVersionsProps) => {
	return (
		<Table<DeviceTypeOsState>
			data={data}
			columns={getCols(latestOs.osVersion, theme)}
			sort={{ field: 'deviceType', reverse: false }}
		/>
	);
};

export const DeviceTypeVersions = withTheme(DeviceTypeVersionsBase);
