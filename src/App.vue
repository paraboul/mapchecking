<template>
    <div class="flex flex-col items-stretch md:flex-row h-screen">
        <div class="md:h-full w-full">
            <Map :density="density" :startHash="startHash" ref="map" @densityChange="densityUpdate" @hashChange="hashUpdate" @surfaceUpdate="surfaceUpdate" />
        </div>
        <div class="relative w-full lg:w-2/3 px-4 py-2 font-sans border-l border-gray-500 bg-gray-100">
            <h1 class="text-2xl">MapChecking &bull; Crowd size estimation</h1>
            <span class="text-gray-800 leading-tight">This tool helps you estimate and fact-check the maximum number of people standing in a given area.</span>

            <div class="shadow-md rounded-md px-4 py-3 bg-white mt-4">
                <div v-if="surface !== 0" class="relative">
                    <span class="text-sm text-gray-700">Surface area <span class="font-semibold">{{ formatArea(surface) }}sqm</span> &bull; <span class="font-semibold">{{ formatArea(surface_feet) }}sqft</span></span>

                    <button @click="$refs.map.reset()" class="rounded absolute right-0 px-2 py-1 text-xs inline-block bg-red-400 shadow-md text-white font-bold hover:shadow-none focus:outline-none">Reset the area</button>
                    <div class="mt-2">
                        <span class="font-semibold">Crowd density <span class="text-xs text-gray-700"><a class="underline hover:no-underline" target="_blank" href="http://www.gkstill.com/Support/crowd-density/625sm/Density6.html">What does it look like?</a></span></span>
                        <input class="block w-full" type="range" min="0.1" max="5.0" step="0.05" :value="density" v-model.number="density" />
                    </div>

                    <div class="flex justify-around pt-2">
                        <button @click="setDensity(0.5)" class="btn">Light</button>
                        <button @click="setDensity(2)" class="btn">Crowded</button>
                        <button @click="setDensity(4)" class="btn">Packed</button>
                    </div>
                    <div class="text-center mt-1">
                        <span class="block font-semibold text-teal-600">{{ density.toFixed(2) }} people per sqm <small>(~10 ftqm)</small></span>
                        <span class="inline-block mt-2 text-xl font-bold text-gray-800">{{ estimated }} estimated</span>
                    </div>
                </div>
                <div class="text-center font-bold" v-else>
                    Start by delimiting an area on the map
                </div>
            </div>
            <div class="bottom-0 left-0 absolute h-8 bg-white border-t border-gray-300 w-full text-xs tracking-tight text-center py-2">Created by Anthony Catel</div>
        </div>
    </div>
</template>

<script>
import Map from './components/Map.vue'
import Between from 'between'

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
            this.density = val;
        },

        formatArea(val) {
            return Number.parseFloat(val).toFixed(0);
        },

        setDensity(val) {
            Between.block(800, Between.easing.Exponential.Out, (obj) => {
                obj.density = val;
            }, this);
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
