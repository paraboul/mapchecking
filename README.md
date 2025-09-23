# MapChecking

Estimate and fact-check the maximum number of people that can stand in a given area by drawing polygons on a map and applying reasonable crowd-density assumptions.
Live site: https://www.mapchecking.com/

The app is frontend only (static), using Vue.JS 3 and vite. Server-side rendring is pre-rendered using https://github.com/antfu-collective/vite-ssg

## Features

- Draw a polygon to outline an area of interest.
- See area (m² / sqm) and capacity estimates based on chosen crowd densities.
- Tweak density presets (e.g., 0.5–4.5 people/m²) to compare scenarios.
- Share a permalink to a specific map view / shape set
- Fast, modern UI built with Vue 3 + Vite + Tailwind CSS.

## Dev server

Vite dev server

```
$ yarn run dev
```

## Build / install

Build static files in `./dist/`

```
$ yarn build
```
