export const getChangelogVersion = async (url: string, regex: RegExp) => {
	return fetch(url)
		.then((resp) => resp.text())
		.then((data) => {
			let m;
			let res = '';
			while ((m = regex.exec(data)) !== null) {
				// This is necessary to avoid infinite loops with zero-width matches
				if (m.index === regex.lastIndex) {
					regex.lastIndex++;
				}

				res = m[1] ?? res;
			}

			return res;
		})
		.catch((err) => {
			console.log(err);
			return '';
		});
};

export const changelogVersion = (version: string) => {
	return version.replace(/[.+]/g, '').replace(/ /g, '-');
};

export const getChangelogLink = (repo: string, version: string) => {
	return `https://github.com/${repo}/blob/master/CHANGELOG.md#v${changelogVersion(
		version,
	)}`;
};

export const fetchMultipleJson = (endpoints: string[]) => {
	return Promise.all(endpoints.map((endpoint) => fetch(endpoint))).then(
		(response) => {
			return Promise.all(response.map((resp) => resp.json()));
		},
	);
};

export const fetchChangelog = (repo: string, branch: string = 'master') => {
	return fetch(
		`https://raw.githubusercontent.com/${repo}/${branch}/.versionbot/CHANGELOG.yml`,
	).then((res) => res.text());
};
