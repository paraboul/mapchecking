// Anthony Catel - paraboul@gmail.com - twitter.com/paraboul/

var updateHashTimer = null;


var vue = new Vue({
    el: "#form",
    data: {
        surface: 0,
        density: 1,
        maxdensity: 7,
        isEmpty: true,
        arrPoly: [],
        mapPosition: [48.862895, 2.286978, 18]
    },
    computed: {
        maxpersonne: function() {
            return parseInt(this.surface * this.density)
        },

        hash: function() {

            var fin = [];
            for (var i = 0; i < this.arrPoly.length; i++) {
                var el = this.arrPoly[i];
                fin.push(el.lat().toFixed(7) + ',' + el.lng().toFixed(7));
            }

            fin.push(this.density);
            fin.push(this.mapPosition.join(','));

            return fin.join(';')
        },

        surface_feet: function() {
            return (this.surface * 10.764).toFixed(2);
        }
    },

    watch: {
        hash: function(hashval) {
            if (updateHashTimer) {
                clearTimeout(updateHashTimer);
            }

            updateHashTimer = setTimeout(function() {
                window.location.hash = hashval;
            }, 300);
        },

        density: function(newval) {
            mc.densityChanged();
        }
    },


    filters: {
        pluralize: function(src) {
            if (src > 1) return 's';
            return '';
        }
    }
});

var mc = null;

var MapCheck = function() {

    var map = new google.maps.Map(document.getElementById('map'), {
        zoom: 18,
        center: {lat: 48.862895, lng: 2.286978},
        mapTypeId: 'roadmap'
    });

    this.map = map;

    var input = document.getElementById('pac-input');
    var searchBox = new google.maps.places.SearchBox(input);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    // Bias the SearchBox results towards current map's viewport.
    map.addListener('bounds_changed', function() {
        searchBox.setBounds(map.getBounds());
    });

    searchBox.addListener('places_changed', function() {
        var places = searchBox.getPlaces();
        console.log("Places", places.length);

        if (places.length == 0) {
            return;
        }

        var place = places[0];

        map.setCenter(place.geometry.location);
        map.setZoom(17);
    });

    this.poly = new google.maps.Polygon({
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.35,
        editable: true,
        draggable: true,
        geodesic: true
    });

    this.poly.setMap(map);

    function mapUpdate() {
        var pos = map.getCenter();
        var zoom = map.getZoom();
        vue.mapPosition = [pos.lat().toFixed(7), pos.lng().toFixed(7), zoom];        
    }

    map.addListener('center_changed', mapUpdate);
    map.addListener('zoom_changed', mapUpdate);


    map.addListener('click', addLatLng.bind(this));
    map.setOptions({
        draggableCursor:'crosshair',
        clickableIcons: false,
        disableDoubleClickZoom: true
    });

    function addLatLng(event) {
        var path = this.poly.getPath();
        path.push(event.latLng);

        vue.isEmpty = false;

        this.updateSurface();
    }

    this.setPolyEvents();
}

MapCheck.prototype.setPosition = function(lat, lng, zoom) {
    this.map.setCenter({lat: parseFloat(lat), lng: parseFloat(lng)});
    this.map.setZoom(parseInt(zoom));
}

MapCheck.prototype.setPolyColor = function(r, g, b) {
    this.poly.setOptions({
        fillColor: 'rgb('+r+', '+g+', '+b+')',
        strokeColor: 'rgb('+r+', '+g+', '+b+')'
    })
}

MapCheck.prototype.updateSurface = function() {
    vue.surface = google.maps.geometry.spherical.computeArea(this.poly.getPath()).toFixed(2);
    vue.arrPoly = this.poly.getPath().getArray().slice();

    return true;
}

MapCheck.prototype.reset = function() {
    this.poly.getPath().clear();

    vue.isEmpty = true;
}

MapCheck.prototype.setPolyEvents = function() {
    google.maps.event.addListener(this.poly.getPath(), "insert_at", this.updateSurface.bind(this));
    google.maps.event.addListener(this.poly.getPath(), "remove_at", this.updateSurface.bind(this));
    google.maps.event.addListener(this.poly.getPath(), "set_at", this.updateSurface.bind(this));
}

MapCheck.prototype.densityChanged = function() {
    var r = parseInt(255 * (vue.density / 1));
    var g = 255 - parseInt(255 * (vue.density / 4));

    this.setPolyColor(r, g, 0);
}

function initMap() {
    mc = new MapCheck();

    document.getElementById("resetzone").addEventListener("click", function() {
        mc.reset();
    });


    var pageHash = window.location.hash;
    if (pageHash && pageHash.length > 3) {
        pageHash = pageHash.substring(1);

        var opt = pageHash.split(';');
        var curPosition = opt.pop();

        if (curPosition) {
            var cursetting = curPosition.split(',');
            mc.setPosition(cursetting[0], cursetting[1], cursetting[2]);
        }

        vue.density = parseFloat(opt.pop()) || 1;

        var path = [];

        for (var i = 0; i < opt.length; i++) {
            var coord = opt[i].split(',');
            path.push({
                lat: parseFloat(coord[0]),
                lng: parseFloat(coord[1])
            });
        }

        if (path.length) {
            vue.isEmpty = false;
            mc.poly.setPath(path);
            mc.setPolyEvents();

        }

        mc.updateSurface();
    }
    mc.densityChanged();
}
