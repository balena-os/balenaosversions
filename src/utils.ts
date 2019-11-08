export const getChangelogVersion = async (url: string, regex: RegExp) => {
  let yocto = '';
  await fetch(url)
    .then(resp => resp.text())
    .then(data => {
      let m;
      while ((m = regex.exec(data)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
          regex.lastIndex++;
        }
        m.forEach((match, groupIndex) => {
          if (groupIndex === 1) {
            yocto = match;
          }
        });
      }
    })
    .catch(err => {
      console.log(err);
    });

  return yocto;
};

export const changelogVersion = (version: string) => {
  return version.replace(/[\.\+]/g, '').replace(/ /g, '-');
};
