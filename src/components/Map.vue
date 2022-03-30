<template>
    <div class="w-full h-full">
        <input ref="pacinput" class="controls" :class="[mapLoaded ? '' : 'hidden']" type="text" placeholder="Search Box">
        <div class="w-full h-full" ref="mapel"></div>
    </div>
</template>

<script setup lang="ts">
    import { Loader as MapLoader } from '@googlemaps/js-api-loader';
    import { Base64 } from 'js-base64'
    import { onMounted, ref, watch, computed } from 'vue';
    import { watchDebounced } from '@vueuse/core'

    const DEFAULT_MAP_POSITION = [48.862895, 2.286978, 18]

    const loader = new MapLoader({
        apiKey: "AIzaSyD7Vm3gm4Fm7jSkuIh_yM14GmYhz1P_S4M",
        version: "3.48",
        libraries: ["geometry", "places"]
    });

    const props = defineProps<{
        density: number,
        startHash: string
    }>()

    const emits = defineEmits<{
        (event: "surfaceUpdate", val: number): void
        (event: "densityChange", val: number): void
        (event: "hashChange", val: string): void
    }>()

    const mapPosition = ref(DEFAULT_MAP_POSITION)
    const arrPoly = ref<google.maps.LatLng[]>([])
    const mapLoaded = ref(false);
    const pacinput = ref()
    const mapel = ref()

    let currentMap : google.maps.Map;
    let currentPolygon : google.maps.Polygon;

    onMounted(() => {
        loader.loadCallback(e => {
            if (e) {
                console.log(e);
                return;
            }

            currentMap = new google.maps.Map(mapel.value, {
                zoom: mapPosition.value[2],
                center: {
                    lat: mapPosition.value[0],
                    lng: mapPosition.value[1]
                },
                mapTypeId: 'roadmap',
                gestureHandling: 'greedy'
            });

            const searchBox = new google.maps.places.SearchBox(pacinput.value);
            currentMap.controls[google.maps.ControlPosition.LEFT_TOP].push(pacinput.value);

            searchBox.addListener('places_changed', () => {
                const places = searchBox.getPlaces();

                if (!places || places.length == 0) {
                    return;
                }

                const place = places[0];

                if (place.geometry?.location) {
                    currentMap.setCenter(place.geometry.location);
                }

                currentMap.setZoom(17);

                reset();
            });

            currentMap.addListener('bounds_changed', function() {
                searchBox.setBounds(currentMap.getBounds()!);
            });
            currentMap.addListener('center_changed', mapUpdated);
            currentMap.addListener('zoom_changed', mapUpdated);
            currentMap.addListener('click', mapClicked);

            currentMap.setOptions({
                draggableCursor:'crosshair',
                clickableIcons: false,
                disableDoubleClickZoom: true,
                streetViewControl: false
            });

            const poly = new google.maps.Polygon({
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillOpacity: 0.35,
                editable: true,
                draggable: true,
                geodesic: true
            });

            poly.setMap(currentMap);

            currentPolygon = poly;

            if (props.startHash) {
                loadHash(props.startHash);
            }

            ["insert_at", "remove_at", "set_at"].forEach(ev => google.maps.event.addListener(poly.getPath(), ev, surfaceUpdated));
            updatePolygonColor();
            
            mapLoaded.value = true;
        });
    })

    const getHue = (val: number) => {
        const min = 0.1;
        const max = 3.0;

        // inv lerp from the density
        const t = (val - min) / (max - min);

        // lerp between green and red hue
        const hue = (1.0 - t) * 110 + 0 * t;

        return Math.max(0, Math.min(hue, 110));
    }

    const updatePolygonColor = () => {
        const hue = getHue(props.density);

        currentPolygon.setOptions({
            fillColor: `hsl(${hue}, 90%, 50%)`,
            strokeColor: `hsl(${hue}, 90%, 50%)`
        });                
    }

    const mapUpdated = () => {
        const pos = currentMap.getCenter();
        const zoom = currentMap.getZoom();

        if (!pos || !zoom) {
            return;
        }

        mapPosition.value = [pos.lat(), pos.lng(), zoom]; 
    }

    const mapClicked = (ev: any) => {
        currentPolygon.getPath().push(ev.latLng);
    }

    const surfaceUpdated = () => {
        arrPoly.value = currentPolygon.getPath().getArray().slice();

        emits('surfaceUpdate', google.maps.geometry.spherical.computeArea(currentPolygon.getPath()));
    }

    const reloadHash = (hash: string) => {
        loadHash(hash);

        ["insert_at", "remove_at", "set_at"].forEach(ev => google.maps.event.addListener(currentPolygon.getPath(), ev, surfaceUpdated));

        updatePolygonColor();
    }

    const loadHash = (hash: string) => {
        if (hash[0] != 'b') {
            return loadLegacyHash(hash);
        }

        const buf = Base64.toUint8Array(hash.substr(1));
        if (!buf) {
            return;
        }

        const meta = new Float32Array(buf.buffer, 0, 4);
        const data = new Float32Array(buf.buffer, 4*4);

        currentMap.setCenter({lat: meta[1], lng: meta[2]});
        currentMap.setZoom(meta[3]);

        const path : google.maps.LatLngLiteral[] = [];
        for (let i = 0; i < data.length; i += 2) {
            path.push({
                lat: data[i],
                lng: data[i+1]
            });                    
        }

        if (path.length) {
            currentPolygon.setPath(path);
            surfaceUpdated();
        }

        emits('densityChange', meta[0]);
    }

    const loadLegacyHash = (hash: string) => {
        const opt = hash.split(';');
        const curPosition = opt.pop();

        if (curPosition) {
            const cursetting = curPosition.split(',');
            currentMap.setCenter({lat: parseFloat(cursetting[0]), lng: parseFloat(cursetting[1])});
            currentMap.setZoom(parseInt(cursetting[2]));
        }

        const density = parseFloat(opt.pop() ?? '') || 1;
        const path : google.maps.LatLngLiteral[] = [];

        for (let i = 0; i < opt.length; i++) {
            const coord = opt[i].split(',');
            path.push({
                lat: parseFloat(coord[0]),
                lng: parseFloat(coord[1])
            });
        }

        if (path.length) {
            currentPolygon.setPath(path);
            surfaceUpdated();
        }

        emits('densityChange', density);
    }

    const reset = () => {
        currentPolygon.getPath().clear();
    }

    const hash = computed(() => {
        const buf = new Float32Array(arrPoly.value.length*2+4);
        buf[0] = props.density;
        buf.set(mapPosition.value, 1);

        for (let i = 0; i < arrPoly.value.length; i++) {
            buf[4+i*2] = arrPoly.value[i].lat();
            buf[4+i*2+1] = arrPoly.value[i].lng();
        }
        return 'b' + Base64.fromUint8Array(new Uint8Array(buf.buffer), true);
    })

    watch(() => props.density, () => updatePolygonColor());

    watchDebounced(hash,
        (hashval: string) => emits('hashChange', hashval),
        { debounce: 300 })

    defineExpose({
        reset,
        reloadHash
    })

</script>