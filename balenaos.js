var storage = window.localStorage;

var getVersion = function(deviceInfo) {
  return Promise.resolve(
    $.get(
      `https://raw.githubusercontent.com/${
        deviceInfo.repo
      }/master/.versionbot/CHANGELOG.yml`
    ).then(function(data) {
      var doc = jsyaml.load(data);
      return { info: deviceInfo, result: doc[0] };
    })
  );
};

var highlightNew = async function(key, newValue, entry) {
  var previousValue = storage.getItem(key);
  if (previousValue && previousValue !== newValue) {
    $(entry).addClass("new");
  }
  storage.setItem(key, newValue);
};

var changelogVersion = function(version) {
  return version.replace(/[\.\+]/g, "").replace(/ /g, "-");
};

const lastLoadShow = function() {
  let lastLoadKey = "lastLoad";
  let lastLoad = storage.getItem(lastLoadKey);
  if (lastLoad) {
    let lastLoadDate = moment(parseInt(lastLoad));
    $("#lastLoadTime").html(
      `<div class="tooltip">${lastLoadDate.fromNow()}<span class="tooltiptext">${lastLoadDate.format(
        "dddd, MMMM Do YYYY, h:mm:ss a"
      )}</span></div>`
    );
  } else {
    $("#lastLoadTime").html("Unknown");
  }
  storage.setItem(lastLoadKey, Date.now());
};

const getYoctoVersion = async function(URL) {
  const regex = /version: 'yocto-(.*)'/gim;
  let yocto;
  await $.get(URL).then(data => {
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
  });
  return yocto;
};

const getSupervisorVersion = async function(URL) {
  const regex = /SUPERVISOR_TAG \?= "(.*)"/gim;
  let supervisor;
  await $.get(URL).then(data => {
    let m;
    while ((m = regex.exec(data)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }
      m.forEach((match, groupIndex) => {
        if (groupIndex === 1) {
          supervisor = match;
        }
      });
    }
  });
  return supervisor;
};

$(document).ready(function() {
  lastLoadShow();
  $.getJSON("config.json", function(data) {
    var config = data;
    var platformversions = {};

    _(data.devicetypes).each(function(d) {
      $("table#devices tr:last").after(
        `<tr><td>${d.name}</td><td class="repo ${
          d.slug
        }">checking...</td><td class="staging ${
          d.slug
        }">checking...</td><td class="production ${
          d.slug
        }">checking...</td></tr>`
      );
      platformversions[d.slug] = {};
    });

    $.when(
      $.get(
        `https://raw.githubusercontent.com/${
          config.osrepo
        }/master/.versionbot/CHANGELOG.yml`
      ),
      $.get(`https://${config.staging}/config`),
      $.get(`https://${config.production}/config`)
    )
      .done(async function(
        osrepoResult,
        stagingAPIResult,
        productionAPIResult
      ) {
        var doc = jsyaml.load(osrepoResult[0]);
        var osVersion = doc[0].version;
        var releaseDate = moment(doc[0].date);
        let supervisorVersion = await getSupervisorVersion(
          `https://raw.githubusercontent.com/${
            config.osrepo
          }/master/meta-balena-common/recipes-containers/resin-supervisor/resin-supervisor.inc`
        );

        try {
          // Check potential patched verion on branch A.B.x (if released version is A.B.C)
          var patchOsBranch = osVersion.replace(/(.*\..*\.).*/, "$1x");
          let something = await $.get(
            `https://raw.githubusercontent.com/${
              config.osrepo
            }/${patchOsBranch}/.versionbot/CHANGELOG.yml`
          )
            .done(async function(osrepoPatchResult) {
              var docPatch = jsyaml.load(osrepoPatchResult);
              var osPatchVersion = docPatch[0].version;
              if (osPatchVersion !== osVersion) {
                console.log(
                  `Overriding ${osVersion} with patch version ${osPatchVersion}`
                );
                osVersion = osPatchVersion;
                releaseDate = moment(docPatch[0].date);
                supervisorVersion = await getSupervisorVersion(
                  `https://raw.githubusercontent.com/${
                    config.osrepo
                  }/${patchOsBranch}/meta-resin-common/recipes-containers/resin-supervisor/resin-supervisor.inc`
                );
              }
            })
            .fail(function() {
              console.log(
                `Couldn't get CHANGELOG for patch branch ${patchOsBranch}, ignorning`
              );
            });
        } catch {
          // this is to catch the exception from the previous request and not to bail
        }
        // find the Supervisor Version changelog anchor, since that includes the
        // release date, so we cannot just infer from the version without a query
        let supervisorChangelogAnchor = await $.get(
          `https://raw.githubusercontent.com/${
            config.supervisorrepo
          }/master/CHANGELOG.md`
        ).then(changelog => {
          const regex = new RegExp(
            `## (${_.trimStart(supervisorVersion, "v").replace(
              /\./g,
              "\\."
            )} - .*)`,
            "gim"
          );
          let anchor;
          while ((m = regex.exec(changelog)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
              regex.lastIndex++;
            }
            m.forEach((match, groupIndex) => {
              if (groupIndex === 1) {
                anchor = match;
              }
            });
          }
          return anchor;
        });

        $("td#osversion").html(
          `<span><a href="https://github.com/${
            config.osrepo
          }/blob/master/CHANGELOG.md#v${changelogVersion(
            osVersion
          )}" target="_blank">${osVersion}</a></span>`
        );
        $("td#osreleasedate").html(
          `<div class="tooltip">${releaseDate.fromNow()}<span class="tooltiptext">${releaseDate.format(
            "dddd, MMMM Do YYYY, h:mm:ss a"
          )}</span></div>`
        );
        $("td#supervisorversion").html(
          `<span><a href="https://github.com/${
            config.supervisorrepo
          }/blob/master/CHANGELOG.md#${changelogVersion(
            supervisorChangelogAnchor
          )}" target="_blank">${supervisorVersion}</a></span>`
        );
        highlightNew("osVersion", osVersion, "td#osversion span");

        var stagingDeviceTypes = stagingAPIResult[0].deviceTypes;
        for (var i = 0; i < config.devicetypes.length; ++i) {
          var slug = config.devicetypes[i].slug;
          var key = _.findKey(stagingDeviceTypes, {
            slug: slug
          });
          if (key) {
            var buildId = stagingDeviceTypes[key].buildId;
            var version = buildId.replace(".prod", "");
            $(`td.staging.${slug}`).html(`<span>${version}</span>`);
            platformversions[slug]["staging"] = version;
            highlightNew(`staging/${slug}`, version, `td.staging.${slug} span`);
          }
        }

        var productionDeviceTypes = productionAPIResult[0].deviceTypes;
        for (var i = 0; i < config.devicetypes.length; ++i) {
          var slug = config.devicetypes[i].slug;
          var key = _.findKey(productionDeviceTypes, {
            slug: slug
          });
          if (key) {
            var buildId = productionDeviceTypes[key].buildId;
            var version = buildId.replace(".prod", "");
            $(`td.production.${slug}`).html(`<span>${version}</span>`);
            platformversions[slug]["production"] = version;
            highlightNew(
              `production/${slug}`,
              version + "x",
              `td.production.${slug} span`
            );
          }
        }

        var promises = [];
        for (var i = 0; i < config.devicetypes.length; ++i) {
          promises.push(getVersion(config.devicetypes[i]));
        }
        Promise.all(promises).then(function(results) {
          _(results).each(async function(r) {
            var slug = r.info.slug;
            var version = r.result.version;
            var date = moment(r.result.date);
            var repo = r.info.repo;
            var repouptodate = false;
            let reposlug = r.info.reposlug ? r.info.reposlug : slug;

            $(`td.repo.${slug}`).html(
              `<span><a href="https://github.com/${repo}/blob/master/CHANGELOG.md#v${changelogVersion(
                version
              )}" target="_blank">${version}</a></span> (<div class="tooltip">${date.fromNow()}<span class="tooltiptext">${date.format(
                "dddd, MMMM Do YYYY, h:mm:ss a"
              )}</span></div>) <span class="yocto"></span>`
            );
            highlightNew(`repo/${slug}`, version, `td.repo.${slug} span`);
            let yocto = await getYoctoVersion(
              `https://raw.githubusercontent.com/${repo}/master/${reposlug}.coffee`
            );
            if (yocto) {
              $(`td.repo.${slug} span.yocto`).text(`; (${yocto})`);
            }

            if (version.startsWith(osVersion)) {
              $(`td.repo.${slug}`).addClass("uptodate");
              repouptodate = true;
            } else {
              $(`td.repo.${slug}`).addClass("outofdate");
            }

            // Mark staging versions up-to-date status
            if (repouptodate && platformversions[slug]["staging"] === version) {
              $(`td.staging.${slug}`).addClass("uptodate");
            } else {
              $(`td.staging.${slug}`).addClass("outofdate");
            }

            // Mark production versions up-to-date status
            if (
              repouptodate &&
              platformversions[slug]["production"] === version
            ) {
              $(`td.production.${slug}`).addClass("uptodate");
            } else {
              $(`td.production.${slug}`).addClass("outofdate");
            }
          });
        });
      })
      .fail(function() {
        //handle errors: TBD
      });
  });
});
