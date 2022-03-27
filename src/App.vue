<template>
    <div class="md:flex flex-1 md:items-stretch md:flex-row">
        <div class="h-[60%] md:h-full w-full">
            <Map :density="density" :startHash="startHash" ref="map" @densityChange="densityUpdate" @hashChange="hashUpdate" @surfaceUpdate="surfaceUpdate" />
        </div>
        <div class="flex flex-col relative w-full lg:w-2/3 py-2 md:px-4 font-sans md:border-l border-gray-500 bg-gray-100">
            <div class="order-last md:order-first px-4 mb-4 md:mb-0 md:px-0">
                <h1 class="text-xl md:text-2xl">MapChecking &bull; Crowd size estimation</h1>
                <span class="text-gray-800 leading-tight">This tool helps you estimate and fact-check the maximum number of people standing in a given area.</span> 
                <br />
                <div class="text-sm mt-1 font-semibold">Source on github : <iframe class="inline" src="https://ghbtns.com/github-btn.html?user=paraboul&repo=mapchecking&type=star&count=false" frameborder="0" scrolling="0" width="150" height="20" title="GitHub"></iframe></div>
            </div>

            <div class="shadow-md md:rounded-md px-4 py-3 bg-white md:mt-4 mb-4 md:mb-1">
                <div v-if="surface !== 0" class="relative">
                    <span class="text-sm text-gray-700">Surface area <span class="font-semibold">{{ formatArea(surface) }}sqm</span> &bull; <span class="font-semibold">{{ formatArea(surface_feet) }}sqft</span></span>

                    <button @click="$refs.map.reset()" class="rounded absolute right-0 px-2 py-1 text-xs inline-block bg-red-400 shadow-md text-white font-bold hover:shadow-none focus:outline-none">Reset the area</button>
                    <div class="mt-2">
                        <span class="font-semibold">Crowd density <span class="text-xs text-gray-700"><a class="underline hover:no-underline" target="_blank" href="http://www.gkstill.com/Support/crowd-density/625sm/Density6.html">What does it look like?</a></span></span>
                        <input class="block w-full" type="range" min="0.1" max="5.0" step="0.05"  v-model.number="density" />
                    </div>

                    <div class="flex justify-around pt-2">
                        <button @click="setDensity(0.3)" class="btn">Light</button>
                        <button @click="setDensity(2)" class="btn">Crowded</button>
                        <button @click="setDensity(4)" class="btn">Packed</button>
                    </div>
                    <div class="text-center mt-1">
                        <span class="block font-semibold text-teal-600">{{ density.toFixed(2) }} people per sqm <small>(~10 sqft)</small></span>
                        <span class="inline-block mt-2 text-xl font-bold text-gray-800">{{ estimated }} estimated</span>
                    </div>
                </div>
                <div class="text-center font-bold" v-else>
                    Start by delimiting an area on the map
                </div>
            </div>
            <div class="shadow-md md:rounded-md px-4 py-3 bg-red-50 shadow-red-100 md:mt-4  mb-4 md:mb-1 text-sm text-red-600">
                ⚠️ It's easy to overestimate the density as the crowd is rarely uniformly packed. This is what <strong>2 people per square meter</strong> looks like from a low angle :
                <div class="flex space-x-2 mt-1">
                    <a class="font-semibold underline hover:no-underline" target="blank" href="https://www.gkstill.com/_Media/3-4_med_hr.png">Image 1</a>
                    <a class="font-semibold underline hover:no-underline" target="blank" href="https://www.gkstill.com/_Media/4-4_med_hr.png">Image 2</a>
                    <a class="font-semibold underline hover:no-underline" target="blank" href="https://www.gkstill.com/_Media/2-2_med_hr.png">Image 3</a>
                    <span>(<a class="underline hover:no-underline" href="https://www.gkstill.com/Support/crowd-density/CrowdDensity-1.html">source</a>)</span>
                </div>
            </div>
            <div class="shadow-md md:rounded-md px-4 py-3 bg-white md:mt-4 mb-4 md:mb-8">
                <h2 class="font-bold mb-2">Examples</h2>

                <a href="javascript:void(0)" @click="$refs.map.reloadHash('bAAAgQJtzQ0LZXRJAAACQQVdzQ0K-UxJAlHNDQl5REkDTc0NCz1ESQP9zQ0KFUxJAHnRDQv5WEkA8dENC51oSQEF0Q0LRXhJAPnRDQldjEkA2dENCo2YSQA50Q0KPaxJA_HNDQq5uEkDac0NCV28SQJRzQ0IhcBJAYnNDQvFuEkAzc0NCEWoSQPNyQ0LIXxJAGnNDQsNZEkA')" class="inline-block btn rounded-md mr-3 mb-2 text-sm">Place du Trocadero - Paris</a>
                <a href="javascript:void(0)" @click="$refs.map.reloadHash('bAAAAQEJ4Q0IdShdAAACQQcp4Q0IfKxdAeXlDQtI7F0CseENClVIXQNl3Q0IeaBdAG3dDQnlYF0A')" class="inline-block btn rounded-md mr-3 mb-2 text-sm">Place de la République</a>
                <a href="javascript:void(0)" @click="$refs.map.reloadHash('bAAAAQHoRUkLzzlVBAABwQRsPUkISoVVB0A5SQhKhVUF_EFJChAhWQccQUkJBCFZB')" class="inline-block btn rounded-md mr-3 mb-2 text-sm">Tiergatern - Berlin</a>
            </div>

            <div class="flex justify-around text-center order-last bg-white p-3 text-xs tracking-tight border-t border-gray-300">
                <span>Created by Anthony Catel</span>

                <a href="https://twitter.com/antcatel?ref_src=twsrc%5Etfw" class="twitter-follow-button" data-show-count="false">Follow @antcatel</a>
            </div>
<!--             <div class="bottom-0 left-0 md:absolute h-8 bg-white border-t border-gray-300 w-full text-xs tracking-tight text-center py-2">Created by Anthony Catel</div> -->
        </div>
    </div>
</template>

<script>
import Map from './components/Map.vue'
import { tatween, Easing } from 'tatween';

export default {
    name: 'App',
    components: {
        Map
    },

    methods: {
        surfaceUpdate(data) {
            this.surface = data;
        },

        hashUpdate(hash) {
            window.location.hash = hash;
        },

        densityUpdate(val) {
            this.density = Math.round(val * 100) / 100;
        },

        formatArea(val) {
            return Number.parseFloat(val).toFixed(0);
        },

        setDensity(val) {
            tatween(800, Easing.Exponential.Out, (obj) => {
                obj.density = val;
            }, this)
        }
    },

    data() {
        return {
            surface: 0,
            density: 1.5,
            startHash: window.location.hash && window.location.hash.length > 3 ?
                window.location.hash.substring(1) : ''
        }
    },

    computed: {
        surface_feet() {
            return (this.surface * 10.764).toFixed(2);
        },

        estimated() {
            return parseInt(this.surface * this.density);
        }
    }
}
</script>
