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

Here's the relevant API request.

    import cdsapi

    c = cdsapi.Client()

    c.retrieve(
        'reanalysis-era5-single-levels',
        {
            'product_type': 'reanalysis',
            'variable': [
                '10m_u_component_of_wind', '10m_v_component_of_wind', '2m_dewpoint_temperature',
                '2m_temperature', 'total_cloud_cover',
            ],
            'year': '2023',
            'month': [
                '01', '03', '05',
                '07', '08', '10',
                '12',
            ],
            'day': [
                '01', '02', '03',
                '04', '05', '06',
                '07', '08', '09',
                '10', '11', '12',
                '13', '14', '15',
                '16', '17', '18',
                '19', '20', '21',
                '22', '23', '24',
                '25', '26', '27',
                '28', '29', '30',
                '31',
            ],
            'time': [
                '00:00', '01:00', '02:00',
                '03:00', '04:00', '05:00',
                '06:00', '07:00', '08:00',
                '09:00', '10:00', '11:00',
                '12:00', '13:00', '14:00',
                '15:00', '16:00', '17:00',
                '18:00', '19:00', '20:00',
                '21:00', '22:00', '23:00',
            ],
            'area': [
                58, -137, 41,
                -52,
            ],
            'format': 'grib',
        },
        'download.grib')

Two different requests were made to ensure total coverage of 2023 over all
timezones. All of Canada is in negative UTC timezones, so we need the extra day
in January to get all the way to 11:59PM on December 31, 2021

- Jan 1 - Dec 31, 2023
- Jan 1 2024

The file containing the hourly information for 2023 for all major population
centers of Canada is around 2GB. This is too large to check-in to the git repo
without using some git extensions, so for now we just gitignore it.

To sanity check downloaded files, you can use [XyGrib](https://opengribs.org/en/xygrib)

Solar altitude data is determined using [pysolar](https://pysolar.readthedocs.io/en/latest/).

Elevation data is extracted using https://www.open-elevation.com/

Postal code information is extracted from https://www.geonames.org/, in particular https://download.geonames.org/export/zip/

# Python tool management

All python tool management is done via [rye](https://rye-up.com/)

Project-relevant commands are specified in the `Makefile`, and run using `make`, e.g. `make server`.

# S3 Upload

Data is uploaded to a publicly available S3 bucket. Upload commands can be found in the ipython notebook.
To make the data publicly accessible and available for download in-browser, the following policies are set:

Bucket policy

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::hvac-sim-public/*"
            }
        ]
    }

CORS policy

    [
        {
            "AllowedHeaders": [
                "*"
            ],
            "AllowedMethods": [
                "GET"
            ],
            "AllowedOrigins": [
                "*"
            ],
            "ExposeHeaders": [],
            "MaxAgeSeconds": 3000
        }
    ]