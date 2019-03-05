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
}

var changelogVersion = function(version) {
  return version.replace(/[\.\+]/g, "");
}

$(document).ready(function() {
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
      .done(async function(osrepoResult, stagingAPIResult, productionAPIResult) {
        var doc = jsyaml.load(osrepoResult[0]);
        var osVersion = doc[0].version;
        var releaseDate = moment(doc[0].date);

        try {
          // Check potential patched verion on branch A.B.x (if released version is A.B.C)
          var patchOsBranch = osVersion.replace(/(.*\..*\.).*/, '$1x');
          let something = await $.get(
            `https://raw.githubusercontent.com/${
              config.osrepo
            }/${patchOsBranch}/.versionbot/CHANGELOG.yml`
          )
          .done(function(osrepoPatchResult) {
              var docPatch = jsyaml.load(osrepoPatchResult);
              var osPatchVersion = docPatch[0].version;
              if (osPatchVersion !== osVersion) {
                console.log(`Overriding ${osVersion} with patch version ${osPatchVersion}`);
                osVersion = osPatchVersion
                releaseDate = moment(docPatch[0].date);
              }
          })
          .fail(function() {
            console.log(`Couldn't get CHANGELOG for patch branch ${patchOsBranch}, ignorning`)
          })
        } catch {
          // this is to catch the exception from the previous request and not to bail
        }

        $("td#osversion").html(`<span><a href="https://github.com/${config.osrepo}/blob/master/CHANGELOG.md#v${changelogVersion(osVersion)}" target="_blank">${osVersion}</a></span>`);
        $("td#osreleasedate").html(
          `<div class="tooltip">${releaseDate.fromNow()}<span class="tooltiptext">${releaseDate.format(
            "dddd, MMMM Do YYYY, h:mm:ss a"
          )}</span></div>`
        );
        highlightNew('osVersion', osVersion, "td#osversion span");

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
            highlightNew(`production/${slug}`, version+'x', `td.production.${slug} span`);
          }
        }

        var promises = [];
        for (var i = 0; i < config.devicetypes.length; ++i) {
          promises.push(getVersion(config.devicetypes[i]));
        }
        Promise.all(promises).then(function(results) {
          _(results).each(function(r) {
            var slug = r.info.slug;
            var version = r.result.version;
            var date = moment(r.result.date);
            var repo = r.info.repo;
            var repouptodate = false;

            $(`td.repo.${slug}`).html(
              `<span><a href="https://github.com/${repo}/blob/master/CHANGELOG.md#v${changelogVersion(version)}" target="_blank">${version}</a></span> (<div class="tooltip">${date.fromNow()}<span class="tooltiptext">${date.format(
                "dddd, MMMM Do YYYY, h:mm:ss a"
              )}</span></div>)`
            );
            highlightNew(`repo/${slug}`, version, `td.repo.${slug} span`);

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
