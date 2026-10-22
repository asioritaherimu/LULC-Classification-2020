
var table = ee.FeatureCollection("projects/shea-476011/assets/GEE_Bugoma_Forest");

// Load region from Assets (uploaded from Drive)
var regionFc = ee.FeatureCollection("projects/shea-476011/assets/GEE_Bugoma_Forest");
var region = regionFc.geometry();
var roi = region

Map.centerObject(roi)
Map.addLayer(roi)
Map.addLayer(image)

var sen2 = imageCollection
.filterDate('2020-05-31','2020-07-31')
.filterBounds(roi)
//.filter(ee.Filter.lt('CLOUDY_PIXEL_OVER_LAND_PERCENTAGE',80))
.filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 3)) // or 80 for testing
.map(function(img){
  var bands = img.select('B[2-8]').multiply(0.0001)
  var ndvi = bands.normalizedDifference(['B8','B4']).rename('ndvi')

  return bands.addBands(ndvi)//.addBands(ndwi)
  .copyProperties(img, ['system:time_start','system:time_end'])
  })

var sen2_per = sen2.reduce(ee.Reducer.percentile([75,55]))

Map.addLayer(sen2_per.clip(roi),[],'sen2',false)

var sen1 = imageCollection2
.filterDate('2020-01-31','2020-12-31')
.filterBounds(roi)
.filter(ee.Filter.listContains('transmitterReceiverPolarisation','VV'))
.filter(ee.Filter.eq('instrumentMode','IW'))
.select('VV','VH')
.filter(ee.Filter.eq('orbitProperties_pass','DESCENDING'))

var sen1_per = sen1.reduce(ee.Reducer.percentile([75,55]))

Map.addLayer(sen1_per.clip(roi),[],'sen1',false)

var dataset = sen2_per.addBands(sen1_per)

var samples = Forest.merge(BuiltUp).merge(Wetland).merge(Cropland).merge(Openwater).merge(BareSoil).merge(BushLand)

var training_data = dataset.sampleRegions({
  collection: samples, properties: ['class'], scale: 30
  })
  
var model = ee.Classifier.smileRandomForest(80).train({
  features: training_data, classProperty: 'class', inputProperties: dataset.bandNames()
  })
  
var map = dataset.classify(model).rename('classified_map')

Map.addLayer(map.clip(roi),{min: 0, max: 4, palette:['blue','green','darkgreen','black','orange']},'map',false)


Export.image.toDrive({
  image: map.clip(roi), 
  description: 'map2020_Bugoma30THJULY', 
  region: roi, 
  scale: 30, 
  folder: 'test', 
  crs: 'EPSG:32636', 
  maxPixels: 1e13
  
  })