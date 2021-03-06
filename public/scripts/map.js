$(() => {
  const mymap = L.map("mapid").setView([45.5017, -73.5673], 9);

  L.tileLayer(
    "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}",
    {
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
      id: "mapbox/streets-v11",
      accessToken:
        "pk.eyJ1IjoiYWFyb25tYXBib3giLCJhIjoiY2swaTcxYzhiMGFjZjNjcDdhbTAwamdjdCJ9.VWSP7Q-2MxofHRFWUZFyQA"
    }
  ).addTo(mymap);

  const url = document.location.href;
  const urlParts = url.split("/");
  const mapID = parseInt(urlParts[urlParts.length - 1], 10);

  const $favBtn = $(`
   <a href="#" style="margin-right: 8px;" class="btn btn-outline-warning">Add to favorites</a>`);

  const toggleFavBtn = $favBtn => {
    $favBtn.toggleClass("btn-outline-warning");
    $favBtn.toggleClass("btn-outline-danger");
    $favBtn.hasClass("btn-outline-warning")
      ? $favBtn.text("Add to favorites")
      : $favBtn.text("Remove from favorites");
  };

  $.ajax({ url: "/api/favorites" }).done(favorites => {
    const isFavorited =
      favorites.filter(fav => (fav.map_id = mapID)).length > 0;
    if (isFavorited) toggleFavBtn($favBtn);
    $(".delete-map-section").prepend($favBtn);
  });

  $favBtn.click(e => {
    $.ajax({
      url: `/api/favorites/${mapID}/toggle`,
      method: "POST"
    }).done(() => {
      toggleFavBtn($favBtn);
    });
  });

  const locations = new Map();

  const createLocationCard = location => {
    const $location = `
    <article class="location-card">
      <img src="${location.image_url}" width="200px" height="170px"><img>
      <div id="card-text">
        <h4>${location.title}</h4>
        <p>${location.description}</p>
      </div>

    </article>

    <form class="card-form">
      <article class="edit-form">
        <input class="form-control" type="text" name="title" value="${location.title}">

        <textarea class="form-control" rows="3" name="description" value="${location.description}"></textarea>

        <input class="form-control" type="text" name="image_url" value="${location.image_url}">
        <button type="submit" data-locid=${location.id} class="btn btn-primary edit-submit">Submit Changes</button>
        <button type="submit" class="btn btn-basic edit-cancel"> Cancel </button>
      </article>

      <div>
        <button type="submit" class="btn btn-outline-warning edit-location">Edit</button>
        <button data-id=${location.id} class="btn btn-outline-danger delete-location">Delete</button>
      </div>

    </form>
      `;

    $(".locations-list").append($location);
  };

  const renderLocations = locs => {
    const latlngs = [];
    const markers = [];
    for (let [_, loc] of locs) {
      const marker = L.marker([loc.latitude, loc.longitude]);
      const latlng = [loc.latitude, loc.longitude]
      marker.addTo(mymap);
      marker.bindPopup(
        `<b>${loc.title}</b>
                        <br>${loc.description}
                        <br><img src="${loc.image_url}" height="100px" width="100px"/>`,
        { width: 100 }
      );
      createLocationCard(loc);
      markers.push(marker)
      latlngs.push(latlng);
    }
    $(".edit-form").toggle();
    mymap.fitBounds(latlngs, { maxZoom: 9 });

  };

  $.ajax({
    url: `/api/locations/${mapID}`
  })
    .done(locs => {
      for (let loc of locs) {
        locations.set(loc.id, loc);
      }
      renderLocations(locations);
    })
    .fail(err => console.log(err));

  //--------------------------------------------

  const escape = function (str) {
    let div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  };

  const saveLocationToDatabase = (data, mapID) => {
    $.ajax({
      method: "POST",
      url: "/api/locations",
      data: { ...data, mapID }
    })
      .done(function (result) {
        console.log("Sent data for location", result);
      })
      .fail(function (error) {
        console.log("Error: " + error);
      })
      .always(function () {
        console.log("Location request completed");
      });
  };

  const disableDelete = () => {
    $("#delete-map").prop("disabled", true);
    $("#save-map").prop("disabled", true);
  };

  const enableDelete = () => {
    $("#delete-map").prop("disabled", false);
    $("#save-map").prop("disabled", false);
  };

  const cancelDeletePress = () => {
    $(".warning").remove();
    $("#cancel-delete").remove();
    mymap.on("click", onMapClick);
  };

  //--------------------------------------------

  const onMapClick = e => {
    disableDelete();

    const marker = new L.marker([e.latlng.lat, e.latlng.lng]).addTo(mymap);

    const keepMarkerInjection = `
      <article id="yes-no-keep-marker">
      <h5>Want to keep this marker?</h5>
      <h6>Latitude: ${e.latlng.lat.toFixed(
      4
    )}, Longitude: ${e.latlng.lng.toFixed(4)}</h6>
      <button type="button" id="yes-marker" class="btn btn-primary">Yes!</button>
      <button type="button" id="no-marker" class="btn btn-danger">  No  </button>
      </article>`;

    $(".create-map-form").append(keepMarkerInjection);

    mymap.off("click", onMapClick);

    //--------------------------------------------------------------
    //If click for marker location is accepted (User clicks 'YES' button)
    $("#yes-marker").click(() => {
      const formInjection = `
      <article id="marker-form">
      <input class="form-control" type="text" name="title" placeholder="The name of your space">

      <textarea class="form-control" rows="3" name="description" placeholder="Short and sweet description of your space"></textarea>

      <input class="form-control" type="text" name="image_url" placeholder="An Image URL you'd like to share of the space">
      <button type="button" id="submit-marker" class="btn btn-primary">Submit Marker</button>
      <button type="button" id="cancel-marker" class="btn btn-basic"> Cancel </button>
      </article>`;

      $("#yes-no-keep-marker").remove();
      $(".create-map-form").append(formInjection);

      //If 'CANCEL' button is Pressed - Removes form/marker
      $("#cancel-marker").click(() => {
        mymap.on("click", onMapClick);
        $("#marker-form").remove();
        mymap.removeLayer(marker);

        enableDelete();
      });

      //If 'SUBMIT' button is Pressed
      $("#submit-marker").click(() => {
        const markerTitle = escape(
          $("#marker-form")
            .find('input[name="title"]')
            .val()
        );
        const markerDescription = escape(
          $("#marker-form")
            .find('textarea[name="description"]')
            .val()
        );
        const markerImageURL = escape(
          $("#marker-form")
            .find('input[name="image_url"]')
            .val()
        );

        mymap.on("click", onMapClick);
        $("#marker-form").remove();

        marker
          .bindPopup(
            `<b>${markerTitle}</b><br>${markerDescription}<br> <img src="${markerImageURL}" height="100px" width="100px"/>`,
            { width: 1 }
          )
          .openPopup();

        const location = {
          description: markerDescription,
          image_url: markerImageURL,
          latitude: e.latlng.lat,
          longitude: e.latlng.lng,
          map_id: mapID,
          title: markerTitle
        };

        $.ajax({ url: "/api/locations", method: "POST", data: location }).done(
          response => {
            console.log("RESPONSE:", response);
            const locationID = response[0].id;
            locations.set(locationID, location);
            $(".locations-list").empty()
            renderLocations(locations);
          }
        );
      });
    });
    //--------------------------------------------------------------

    //--------------------------------------------------------------
    //If 'NO' Button is Pressed - Removes form/marker
    $("#no-marker").click(() => {
      mymap.on("click", onMapClick);
      $("#yes-no-keep-marker").remove();
      mymap.removeLayer(marker);
      $("#delete-map").prop("disabled", false);
      $("#save-map").prop("disabled", false);
    });
    //--------------------------------------------------------------
  };
  //xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

  //xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //Delete Map buttons

  //----------------------------------------------------
  //Delete button
  let deleteClickCounter = 0;

  $("#delete-map").click(e => {
    mymap.off("click", onMapClick);

    if (deleteClickCounter % 2 === 0) {
      e.preventDefault();

      $(".delete-map-section").append(
        '<button id="cancel-delete" type="button" class="btn">Cancel</button>'
      );

      $("#delete-map-form").attr("method", "POST");
      $("#delete-map-form").attr("action", `/maps/${mapID}/delete`);

      $("#cancel-delete").click(() => {
        cancelDeletePress();
        $("#delete-map-form").removeAttr("method", "POST");
        $("#delete-map-form").removeAttr("action", `/maps/${mapID}/delete`);

        deleteClickCounter++;
      });
    }
    deleteClickCounter++;
  });

  //xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

  //-----------------------------------
  //Location Card - EDIT button

  $("body").on("click", ".edit-location", function (e) {
    e.preventDefault();
    $(this)
      .parent()
      .parent()
      .children(".edit-form")
      .toggle();

    $(".card-form").css('justify-content', 'space-between')
    $(".edit-location").toggle()
    $(".delete-location").toggle()

  });

  //-----------------------------------
  //Location Card - DELETE button

  $("body").on("click", ".delete-location", function (e) {
    //e.preventDefault();
    const locationID = $(this).data("id");
    $.ajax({ url: `/api/locations/${locationID}/delete`, method: "POST" }).done(
      res => {
        locations.delete(locationID)
        $(".locations-list").empty();
        renderLocations(locations);
      }
    );
  });

  //-----------------------------------
  //Location Card - CANCEL button

  $("body").on("click", ".edit-cancel", function (e) {
    e.preventDefault();
    $(this)
      .parent()
      .parent()
      .children(".edit-form")
      .toggle();

    $(".card-form").css('justify-content', 'flex-end')
    $(".edit-location").toggle()
    $(".delete-location").toggle()

  });

  //-----------------------------------
  //Location Card - SUBMIT CHANGES button

  $("body").on("click", ".edit-submit", function (e) {
    e.preventDefault();
    const markerTitle = escape(
      $(".edit-form")
        .find('input[name="title"]')
        .val()
    );
    const markerDescription = escape(
      $(".edit-form")
        .find('textarea[name="description"]')
        .val()
    );
    const markerImageURL = escape(
      $(".edit-form")
        .find('input[name="image_url"]')
        .val()
    );

    const location = {
      location_id: $(this).data("locid"),
      description: markerDescription,
      image_url: markerImageURL,
      title: markerTitle
    };

    console.log(location)

    $.ajax({ url: `/api/locations/${location.location_id}/update`, method: "POST", data: location }).done(
      response => {
        window.location.reload();
      }
    );
  });


  mymap.on("click", onMapClick);
});
