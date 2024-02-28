This directory contains tools for extracting and munging weather and
environmental data into the form needed for use in the main heat pump caluclator
tool.

# Data sources

The main data source for this weather data comes from the ERA-5 database, a
reanalysis model with hourly data. The data is available for download here:
https://cds.climate.copernicus.eu/cdsapp#!/dataset/reanalysis-era5-single-levels?tab=overview

The key fields sourced from the ERA-5 dataset are:

- 10 metre U wind component
- 10 metre V wind component
- 2 metre dewpoint temperature
- 2 metre temperature
- Total cloud cover

The file containing the hourly information for 2023 for all major population
centers of Canada is around 2GB. This is too large to check-in to the git repo
without using some git extensions, so for now we just gitignore it.

Solar altitude data is determined using [pysolar](https://pysolar.readthedocs.io/en/latest/).

Elevation data is extracted using https://www.open-elevation.com/

Postal code information is extracted from https://www.geonames.org/, in particular https://download.geonames.org/export/zip/

# Python tool management

All python tool management is done via [rye](https://rye-up.com/)

Project-relevant commands are specified in the `Makefile`, and run using `make`, e.g. `make server`.
