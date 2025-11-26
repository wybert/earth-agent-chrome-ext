/**
 * Test script to analyze GEE console chart/visualization structure
 *
 * STEP 1: Run this in GEE Code Editor to generate a chart
 */

// Example 1: Simple chart
var chart = ui.Chart.image.series({
  imageCollection: ee.ImageCollection('LANDSAT/LC08/C02/T1_TOA')
    .filterBounds(ee.Geometry.Point([-122.262, 37.8719]))
    .filterDate('2014-01-01', '2014-12-31')
    .select(['B4', 'B3', 'B2']),
  region: ee.Geometry.Point([-122.262, 37.8719]),
  reducer: ee.Reducer.mean(),
  scale: 200
});
print('Chart Example:', chart);

// Example 2: Histogram
var histogram = ui.Chart.image.histogram({
  image: ee.Image('LANDSAT/LC08/C02/T1_TOA/LC08_044034_20140318').select(['B4']),
  region: ee.Geometry.Rectangle([-122.45, 37.74, -122.38, 37.84]),
  scale: 30,
  maxBuckets: 100
});
print('Histogram:', histogram);

// Example 3: Feature collection chart
var table = ee.FeatureCollection('TIGER/2010/Blocks');
var sample = table.limit(100);
var chartFC = ui.Chart.feature.byFeature(sample, 'name10');
print('Feature Chart:', chartFC);

/**
 * STEP 2: After charts appear, run this in Browser DevTools Console
 */

/*

(function analyzeChartStructure() {
  console.log('=== Analyzing GEE Console Chart Structure ===');
  console.log('');

  const eeConsole = document.querySelector('ee-console');
  if (!eeConsole) {
    console.error('ee-console not found');
    return;
  }

  const consoleLogElements = eeConsole.querySelectorAll('ee-console-log');
  console.log('Total console entries:', consoleLogElements.length);
  console.log('');

  // Find entries that might contain charts
  let chartCount = 0;
  consoleLogElements.forEach((logElement, index) => {
    // Look for chart-related elements
    const chartElements = logElement.querySelectorAll('[class*="chart"], canvas, svg, img, iframe');

    if (chartElements.length > 0) {
      chartCount++;
      console.log('--- Entry ' + (index + 1) + ' contains visual elements ---');
      console.log('Element count:', chartElements.length);

      chartElements.forEach((el, i) => {
        console.log('  Visual element ' + i + ':');
        console.log('    Tag:', el.tagName);
        console.log('    Classes:', el.className);
        console.log('    ID:', el.id);

        if (el.tagName === 'CANVAS') {
          console.log('    Canvas size:', el.width + 'x' + el.height);
          console.log('    Can extract as image: YES (toDataURL)');
        }

        if (el.tagName === 'SVG') {
          console.log('    SVG viewBox:', el.getAttribute('viewBox'));
          console.log('    Can extract as image: YES (serialize + convert)');
        }

        if (el.tagName === 'IMG') {
          console.log('    Image src:', el.src.substring(0, 100));
          console.log('    Can extract: YES (src already available)');
        }

        if (el.tagName === 'IFRAME') {
          console.log('    Iframe src:', el.src);
          console.log('    Can extract: MAYBE (depends on CORS)');
        }
      });

      // Try to find chart data
      console.log('  Looking for chart data...');

      // Check for Google Charts
      const googleChart = logElement.querySelector('[id*="chart"], [class*="google-visualization"]');
      if (googleChart) {
        console.log('  Found Google Chart element:', googleChart.id || googleChart.className);
      }

      // Check for data attributes
      const dataElements = logElement.querySelectorAll('[data-chart], [data-series], [data-values]');
      if (dataElements.length > 0) {
        console.log('  Found elements with data attributes:', dataElements.length);
      }

      // Try to get the full HTML
      console.log('  HTML preview:', logElement.innerHTML.substring(0, 300) + '...');
      console.log('');
    }
  });

  console.log('Summary:');
  console.log('  Total entries:', consoleLogElements.length);
  console.log('  Entries with charts:', chartCount);
  console.log('');

  if (chartCount > 0) {
    console.log('Recommendations:');
    console.log('  1. Charts can be captured as images (canvas.toDataURL or screenshot)');
    console.log('  2. Chart data might be accessible from DOM');
    console.log('  3. Alternative: Use screenshot tool to capture visual representation');
  } else {
    console.log('No charts found. Make sure to run the chart generation code first.');
  }

  return { totalEntries: consoleLogElements.length, chartCount: chartCount };
})();

*/
