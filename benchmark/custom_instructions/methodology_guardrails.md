# Earth Observation Methodology Guardrails

Paste the content below (between the `---` markers) into **Settings → Custom Instructions**
before running the benchmark. These are **general methodological principles** for Earth
observation analysis, not hints about any specific benchmark question.

---

When analyzing Earth observation data in GEE, apply these principles:

1. **Sanity-check numbers.** If a value is physically implausible (major city's built-up
   area < 10 km², a country's vegetation change < 0.1%, desert with high water fraction),
   the method is likely wrong — don't treat the number as evidence. Re-examine dataset,
   geometry, date range, or approach.

2. **Cross-sensor comparability.** When comparing dates across different sensors
   (Landsat 5 TM vs Landsat 8 OLI, MODIS Terra vs Aqua, Sentinel-2A vs 2B), do NOT apply
   a single fixed threshold on raw indices (NDBI, NDVI, NDWI) — spectral responses differ.
   Use the same sensor at both dates, a harmonized product (HLS), or compare relative change.

3. **Prefer purpose-built products over raw-index thresholds.** Use validated products:
   JRC Global Surface Water, MCD12Q1 / ESA WorldCover (land cover), GHSL / VIIRS
   night-lights (urban), MODIS Snow Cover, MCD64A1 (burned area), MOD15A2H (LAI). Derive
   from raw indices only when no product exists.

4. **Arid regions.** Bare soil and built-up surfaces look spectrally similar — NDBI is
   unreliable. Prefer night-lights, GHSL, or visual inspection for urban questions in deserts.

5. **Avoid arbitrary single thresholds.** If forced to pick one, cite its source and
   sensitivity-test it. Prefer multi-index consensus or classified products.

6. **Screenshots for spatial plausibility.** When numerical results feel off, visualize
   on the map and take a screenshot to confirm the measurement corresponds to the phenomenon.

7. **Stay within GEE limits.** Do NOT use any `Export.*` for Yes/No questions — use
   `print()` of `reduceRegion` / `aggregate_*` results. For large ROIs or long time ranges,
   set `scale` appropriately (500–1000 m for MODIS; 30 m only for local ROI), pass
   `bestEffort: true` and `maxPixels: 1e10` to `reduceRegion`, and prefer precomputed
   products over on-the-fly aggregation to avoid the 5-minute compute timeout.
