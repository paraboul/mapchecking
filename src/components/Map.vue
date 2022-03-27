<template>
    <div class="w-full h-full">
        <input id="pac-input" class="controls" :class="[mapLoaded ? '' : 'hidden']" type="text" placeholder="Search Box">
        <div class="w-full h-full" id="map"></div>
    </div>
</template>

<script>
    import { Loader as MapLoader } from '@googlemaps/js-api-loader';
    import { Base64 } from 'js-base64'

    const loader = new MapLoader({
        apiKey: "AIzaSyD7Vm3gm4Fm7jSkuIh_yM14GmYhz1P_S4M",
        version: "weekly",
        libraries: ["geometry", "places"]
    });

    export default {
        name: "Map",

        props: {
            density: Number,
            startHash: String
        },

        mounted() {

            loader.loadCallback(e => {
                if (e) {
                    console.log(e);
                    return;
                }

                const map = new google.maps.Map(document.getElementById("map"), {
                    zoom: this.mapPosition[2],
                    center: {
                        lat: this.mapPosition[0],
                        lng: this.mapPosition[1]
                    },
                    mapTypeId: 'roadmap',
                    gestureHandling: 'greedy'
                });

                const input = document.getElementById('pac-input');
                const searchBox = new google.maps.places.SearchBox(input);
                map.controls[google.maps.ControlPosition.LEFT_TOP].push(input);

                searchBox.addListener('places_changed', () => {
                    var places = searchBox.getPlaces();

                    if (places.length == 0) {
                        return;
                    }

                    var place = places[0];

                    map.setCenter(place.geometry.location);
                    map.setZoom(17);

                    this.reset();
                });

                map.addListener('bounds_changed', function() {
                    searchBox.setBounds(map.getBounds());
                });
                map.addListener('center_changed', this.mapUpdated);
                map.addListener('zoom_changed', this.mapUpdated);
                map.addListener('click', this.mapClicked);

                map.setOptions({
                    draggableCursor:'crosshair',
                    clickableIcons: false,
                    disableDoubleClickZoom: true,
                    streetViewControl: false
                });

                this.$map = map;

                const poly = new google.maps.Polygon({
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillOpacity: 0.35,
                    editable: true,
                    draggable: true,
                    geodesic: true
                });

                poly.setMap(map);

                this.$poly = poly;
    
                if (this.startHash) {
                    this.loadHash(this.startHash);
                }

                ["insert_at", "remove_at", "set_at"].forEach(ev => google.maps.event.addListener(poly.getPath(), ev, this.surfaceUpdated));
                this.updatePolygonColor();

                this.$updateHashTimer = null;
                this.mapLoaded = true;
            });
        },

        watch: {
            density(val) {
                this.updatePolygonColor();
            },

            hash(hashval) {
                if (this.$updateHashTimer) {
                    clearTimeout(this.$updateHashTimer);
                }

                this.$updateHashTimer = setTimeout(() => {
                    this.$emit('hashChange', hashval);
                }, 300);
            }
        },

        methods: {
            getHue(val) {
                const min = 0.1;
                const max = 3.0;

                // inv lerp from the density
                const t = (val - min) / (max - min);

                // lerp between green and red hue
                const hue = (1.0 - t) * 110 + 0 * t;

                return Math.max(0, Math.min(hue, 110));
            },

            updatePolygonColor() {
                const hue = this.getHue(this.density);

                this.$poly.setOptions({
                    fillColor: `hsl(${hue}, 90%, 50%)`,
                    strokeColor: `hsl(${hue}, 90%, 50%)`
                });                
            },

            mapUpdated() {
                const pos = this.$map.getCenter();
                const zoom = this.$map.getZoom();

                this.mapPosition = [pos.lat().toFixed(7), pos.lng().toFixed(7), zoom]; 
            },

            mapClicked(ev) {
                this.$poly.getPath().push(ev.latLng);
            },

            surfaceUpdated() {
                this.surface = google.maps.geometry.spherical.computeArea(this.$poly.getPath()).toFixed(2);
                this.arrPoly = this.$poly.getPath().getArray().slice();

                this.$emit('surfaceUpdate', this.surface);
            },

            reloadHash(hash) {
                this.loadHash(hash);

                ["insert_at", "remove_at", "set_at"].forEach(ev => google.maps.event.addListener(this.$poly.getPath(), ev, this.surfaceUpdated));
                this.updatePolygonColor();
            },

            loadHash(hash) {
                if (hash[0] != 'b') {
                    return this.loadLegacyHash(hash);
                }

                const buf = Base64.toUint8Array(hash.substr(1));
                if (!buf) {
                    return;
                }

                const meta = new Float32Array(buf.buffer, 0, 4);
                const data = new Float32Array(buf.buffer, 4*4);

                this.$map.setCenter({lat: meta[1], lng: meta[2]});
                this.$map.setZoom(parseInt(meta[3]));

                let path = [];
                for (let i = 0; i < data.length; i += 2) {
                    path.push({
                        lat: data[i],
                        lng: data[i+1]
                    });                    
                }

                if (path.length) {
                    this.$poly.setPath(path);
                    this.surfaceUpdated();
                }

                this.$emit('densityChange', parseFloat(meta[0]));
            },

            loadLegacyHash(hash) {
                let opt = hash.split(';');

                let curPosition = opt.pop();

                if (curPosition) {
                    let cursetting = curPosition.split(',');
                    this.$map.setCenter({lat: parseFloat(cursetting[0]), lng: parseFloat(cursetting[1])});
                    this.$map.setZoom(parseInt(cursetting[2]));
                }

                let density = parseFloat(opt.pop()) || 1;

                let path = [];

                for (let i = 0; i < opt.length; i++) {
                    let coord = opt[i].split(',');
                    path.push({
                        lat: parseFloat(coord[0]),
                        lng: parseFloat(coord[1])
                    });
                }

                if (path.length) {
                    this.$poly.setPath(path);
                    this.surfaceUpdated();
                }

                this.$emit('densityChange', density);
            },

            reset() {
                this.$poly.getPath().clear();
            }
        },

        computed: {
            hash() {
                let buf = new Float32Array(this.arrPoly.length*2+4);
                buf[0] = this.density;
                buf.set(this.mapPosition, 1);

                for (let i = 0; i < this.arrPoly.length; i++) {
                    buf[4+i*2] = this.arrPoly[i].lat();
                    buf[4+i*2+1] = this.arrPoly[i].lng();
                }
                return 'b' + Base64.fromUint8Array(new Uint8Array(buf.buffer), true);
            }
        },

        data() {
            return {
                mapPosition: [48.862895, 2.286978, 18],
                surface: 0,
                arrPoly: [],
                mapLoaded: false
            }
        }
    }
</script>