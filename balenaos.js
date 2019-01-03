var getVersion = function(deviceInfo) {
  return Promise.resolve(
    $.get(
      `https://raw.githubusercontent.com/${
        deviceInfo.repo
      }/master/.versionbot/CHANGELOG.yml`
    ).then(function(data) {
      var doc = jsyaml.load(data);
      return { slug: deviceInfo.slug, result: doc[0] };
    })
  );
};

$(document).ready(function() {
  $.getJSON("config.json", function(data) {
    var config = data;

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
      .done(function(osrepoResult, stagingAPIResult, productionAPIResult) {
        var doc = jsyaml.load(osrepoResult[0]);
        var osVersion = doc[0].version;
        var releaseDate = moment(doc[0].date);

        $("td#osversion").html(osVersion);
        $("td#osreleasedate").html(
          `<div class="tooltip">${releaseDate.fromNow()}<span class="tooltiptext">${releaseDate.format(
            "dddd, MMMM Do YYYY, h:mm:ss a"
          )}</span></div>`
        );

        var stagingDeviceTypes = stagingAPIResult[0].deviceTypes;
        for (var i = 0; i < config.devicetypes.length; ++i) {
          var key = _.findKey(stagingDeviceTypes, {
            slug: config.devicetypes[i].slug
          });
          if (key) {
            var buildId = stagingDeviceTypes[key].buildId;
            $(`td.staging.${config.devicetypes[i].slug}`).html(buildId);
            var version = buildId.replace(".prod", "");
            if (version.startsWith(osVersion)) {
              $(`td.staging.${config.devicetypes[i].slug}`).addClass(
                "uptodate"
              );
            } else {
              $(`td.staging.${config.devicetypes[i].slug}`).addClass(
                "outofdate"
              );
            }
          }
        }

        var productionDeviceTypes = productionAPIResult[0].deviceTypes;
        for (var i = 0; i < config.devicetypes.length; ++i) {
          var key = _.findKey(productionDeviceTypes, {
            slug: config.devicetypes[i].slug
          });
          if (key) {
            var buildId = productionDeviceTypes[key].buildId;
            $(`td.production.${config.devicetypes[i].slug}`).html(buildId);
            var version = buildId.replace(".prod", "");
            if (version.startsWith(osVersion)) {
              $(`td.production.${config.devicetypes[i].slug}`).addClass(
                "uptodate"
              );
            } else {
              $(`td.production.${config.devicetypes[i].slug}`).addClass(
                "outofdate"
              );
            }
          }
        }

        var promises = [];
        for (var i = 0; i < config.devicetypes.length; ++i) {
          promises.push(getVersion(config.devicetypes[i]));
        }
        Promise.all(promises).then(function(results) {
          _(results).each(function(r) {
            console.log(r);
            var slug = r.slug;
            var version = r.result.version;
            var date = moment(r.result.date);
            $(`td.repo.${slug}`).html(
              `${version} (<div class="tooltip">${date.fromNow()}<span class="tooltiptext">${date.format(
                "dddd, MMMM Do YYYY, h:mm:ss a"
              )}</span></div>)`
            );

            if (version.startsWith(osVersion)) {
              $(`td.repo.${slug}`).addClass("uptodate");
            } else {
              $(`td.repo.${slug}`).addClass("outofdate");
            }
          });
        });
      })
      .fail(function() {
        //handle errors: TBD
      });
  });
});
